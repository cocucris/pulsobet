"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PartyGamesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartyGamesService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_session_cache_service_1 = require("../session/redis-session-cache.service");
const session_scheduler_1 = require("../session/session.scheduler");
const party_games_events_1 = require("./party-games.events");
const DEFAULT_CATEGORIES = [
    'Nombre',
    'Ciudad/País',
    'Fruta/Verdura',
    'Animal',
    'Marca',
    'Película/Serie',
];
let PartyGamesService = PartyGamesService_1 = class PartyGamesService {
    prisma;
    sessionCache;
    eventEmitter;
    scheduler;
    logger = new common_1.Logger(PartyGamesService_1.name);
    constructor(prisma, sessionCache, eventEmitter, scheduler) {
        this.prisma = prisma;
        this.sessionCache = sessionCache;
        this.eventEmitter = eventEmitter;
        this.scheduler = scheduler;
    }
    async resolveBarId(barIdOrSlug) {
        const bar = await this.prisma.bar.findFirst({
            where: { OR: [{ id: barIdOrSlug }, { slug: barIdOrSlug }] },
            select: { id: true },
        });
        if (!bar) {
            throw new common_1.NotFoundException(`No se encontró el bar "${barIdOrSlug}".`);
        }
        return bar.id;
    }
    async getCategories(barId) {
        const realBarId = await this.resolveBarId(barId);
        await this.ensureDefaultCategories(realBarId);
        return this.prisma.tutiFrutiCategory.findMany({
            where: { barId: realBarId },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        });
    }
    async addCategory(barId, dto) {
        const realBarId = await this.resolveBarId(barId);
        return this.prisma.tutiFrutiCategory.upsert({
            where: { barId_name: { barId: realBarId, name: dto.name } },
            update: {},
            create: {
                barId: realBarId,
                name: dto.name,
                isDefault: dto.isDefault ?? false,
            },
        });
    }
    async deleteCategory(barId, categoryId) {
        const realBarId = await this.resolveBarId(barId);
        const cat = await this.prisma.tutiFrutiCategory.findUnique({
            where: { id: categoryId },
        });
        if (!cat || cat.barId !== realBarId) {
            throw new common_1.NotFoundException('Categoría no encontrada para este bar.');
        }
        return this.prisma.tutiFrutiCategory.delete({ where: { id: categoryId } });
    }
    async ensureDefaultCategories(barId) {
        try {
            const existing = await this.prisma.tutiFrutiCategory.count({ where: { barId, isDefault: true } });
            if (existing < DEFAULT_CATEGORIES.length) {
                for (const name of DEFAULT_CATEGORIES) {
                    await this.prisma.tutiFrutiCategory.upsert({
                        where: { barId_name: { barId, name } },
                        update: {},
                        create: { barId, name, isDefault: true },
                    });
                }
            }
        }
        catch (err) {
            this.logger.warn(`No se pudieron sembrar categorías por defecto para bar ${barId}: ${err.message}`);
        }
    }
    async createRound(dto) {
        const session = await this.prisma.gameSession.findFirst({
            where: { OR: [{ id: dto.sessionId }, { bar: { slug: dto.sessionId } }], isActive: true },
        });
        if (!session) {
            throw new common_1.NotFoundException(`No se encontró sesión activa con id "${dto.sessionId}".`);
        }
        const activeRound = await this.prisma.partyGameRound.findFirst({
            where: { sessionId: session.id, phase: { not: 'FINISHED' } },
        });
        if (activeRound) {
            throw new common_1.BadRequestException('Ya hay una ronda de Party Game activa en esta sesión. Finalizá la ronda actual primero.');
        }
        if (dto.gameType === 'TUTI_FRUTI') {
            if (!dto.categories || dto.categories.length === 0) {
                throw new common_1.BadRequestException('Tuti Fruti requiere al menos 1 categoría.');
            }
            if (dto.categories.length > 4) {
                throw new common_1.BadRequestException('Tuti Fruti acepta un máximo de 4 categorías.');
            }
        }
        const eventNumber = await this.sessionCache.incrementEventNumber(session.id);
        const isTutiFruti = dto.gameType === 'TUTI_FRUTI';
        const round = await this.prisma.partyGameRound.create({
            data: {
                sessionId: session.id,
                gameType: dto.gameType,
                phase: isTutiFruti ? 'LOBBY' : 'INPUT',
                prompt: dto.prompt,
                categories: dto.categories ? dto.categories : undefined,
                timeLimit: dto.timeLimit ?? 60,
            },
        });
        if (dto.gameType === 'BLUFFING' && dto.realAnswer) {
            const systemPlayer = await this.prisma.player.upsert({
                where: { sessionId_nickname: { sessionId: session.id, nickname: '⭐ Respuesta Real' } },
                update: {},
                create: {
                    sessionId: session.id,
                    nickname: '⭐ Respuesta Real',
                    totalPoints: 0,
                },
            });
            await this.prisma.partyGameSubmission.create({
                data: {
                    roundId: round.id,
                    playerId: systemPlayer.id,
                    content: { text: dto.realAnswer, isReal: true },
                },
            });
        }
        const fullRound = await this.prisma.partyGameRound.findUnique({
            where: { id: round.id },
            include: { submissions: { include: { player: true } } },
        });
        const roundPayload = this.serializeRound(fullRound || round);
        this.eventEmitter.emit('party.round.started', new party_games_events_1.PartyRoundStartedEvent(session.id, roundPayload, eventNumber));
        if (!isTutiFruti) {
            this.scheduler.scheduleAutoClose(`party-input-${round.id}`, round.timeLimit * 1000, async () => {
                await this.advanceToVoting(round.id, session.id);
            });
        }
        this.logger.log(`[PartyGames] Ronda ${round.id} (${dto.gameType}) iniciada en sesión ${session.id}`);
        return roundPayload;
    }
    async submitInput(playerId, sessionId, dto) {
        const round = await this.getActiveRound(dto.roundId);
        if (round.phase !== 'INPUT') {
            throw new common_1.BadRequestException('La fase de Input ya terminó.');
        }
        let contentToSave = dto.content;
        if (round.gameType === 'TUTI_FRUTI' && dto.content?.answers) {
            const previa = await this.prisma.partyGameSubmission.findUnique({
                where: { roundId_playerId: { roundId: round.id, playerId } },
            });
            const prevAnswers = previa?.content?.answers ?? {};
            const mergedAnswers = { ...prevAnswers };
            for (const [cat, val] of Object.entries(dto.content?.answers ?? {})) {
                if (String(val).trim() !== '')
                    mergedAnswers[cat] = String(val);
            }
            contentToSave = { answers: mergedAnswers };
        }
        await this.prisma.partyGameSubmission.upsert({
            where: { roundId_playerId: { roundId: round.id, playerId } },
            update: { content: contentToSave },
            create: {
                roundId: round.id,
                playerId,
                content: contentToSave,
            },
        });
        const submittedCount = await this.prisma.partyGameSubmission.count({
            where: { roundId: round.id },
        });
        const totalPlayers = await this.prisma.player.count({
            where: { sessionId: round.sessionId },
        });
        const eventNumber = await this.sessionCache.incrementEventNumber(round.sessionId);
        this.eventEmitter.emit('party.input.submitted', new party_games_events_1.PartyInputSubmittedEvent(round.sessionId, round.id, submittedCount, totalPlayers, eventNumber));
        if (round.gameType !== 'TUTI_FRUTI' && submittedCount >= totalPlayers && totalPlayers > 0) {
            this.scheduler.cancelTimer(`party-input-${round.id}`);
            await this.advanceToVoting(round.id, round.sessionId);
        }
        return { accepted: true, submittedCount, totalPlayers };
    }
    async submitBasta(playerId, sessionId, dto) {
        const round = await this.getActiveRound(dto.roundId);
        if (round.phase !== 'INPUT') {
            throw new common_1.BadRequestException('La fase de Input ya terminó.');
        }
        if (round.gameType !== 'TUTI_FRUTI') {
            throw new common_1.BadRequestException('BASTA solo es válido en el juego Tuti Fruti.');
        }
        const tieneRespuestas = Object.values(dto.answers ?? {}).some((a) => String(a).trim() !== '');
        if (!tieneRespuestas) {
            throw new common_1.BadRequestException('Completá al menos una categoría antes de gritar BASTA.');
        }
        const isBasta = await this.prisma.$transaction(async (tx) => {
            const existingBasta = await tx.partyGameSubmission.findFirst({
                where: { roundId: round.id, isBasta: true },
            });
            const esPrimero = !existingBasta;
            const previa = await tx.partyGameSubmission.findUnique({
                where: { roundId_playerId: { roundId: round.id, playerId } },
            });
            const prevAnswers = previa?.content?.answers ?? {};
            const mergedAnswers = { ...prevAnswers };
            for (const [cat, val] of Object.entries(dto.answers ?? {})) {
                if (String(val).trim() !== '')
                    mergedAnswers[cat] = val;
            }
            await tx.partyGameSubmission.upsert({
                where: { roundId_playerId: { roundId: round.id, playerId } },
                update: { content: { answers: mergedAnswers }, isBasta: esPrimero || undefined },
                create: {
                    roundId: round.id,
                    playerId,
                    content: { answers: mergedAnswers },
                    isBasta: esPrimero,
                },
            });
            return esPrimero;
        });
        if (isBasta) {
            this.scheduler.cancelTimer(`party-input-${round.id}`);
            this.logger.log(`[PartyGames] ¡BASTA! en ronda ${round.id} por jugador ${playerId}`);
            const player = await this.prisma.player.findUnique({
                where: { id: playerId },
                select: { nickname: true },
            });
            const eventNumber = await this.sessionCache.incrementEventNumber(round.sessionId);
            this.eventEmitter.emit('party.basta.called', new party_games_events_1.PartyBastaCalledEvent(round.sessionId, round.id, playerId, player?.nickname ?? 'Jugador', eventNumber));
            this.scheduler.scheduleAutoClose(`party-basta-grace-${round.id}`, 2000, async () => {
                await this.advanceToVoting(round.id, round.sessionId);
            });
        }
        return { accepted: true, isBasta };
    }
    async castVote(voterId, dto) {
        const round = await this.getActiveRound(dto.roundId);
        if (round.phase !== 'VOTING') {
            throw new common_1.BadRequestException('La fase de Votación no está activa.');
        }
        await this.prisma.partyGameVote.upsert({
            where: { roundId_voterId: { roundId: round.id, voterId } },
            update: { targetId: dto.targetId },
            create: {
                roundId: round.id,
                voterId,
                targetId: dto.targetId,
            },
        });
        const votesSummary = await this.buildVotesSummary(round.id, round.gameType);
        const eventNumber = await this.sessionCache.incrementEventNumber(round.sessionId);
        this.eventEmitter.emit('party.vote.cast', new party_games_events_1.PartyVoteCastEvent(round.sessionId, round.id, votesSummary, eventNumber));
        return { accepted: true };
    }
    async startCountdown(roundId) {
        const round = await this.getActiveRound(roundId);
        if (round.phase !== 'LOBBY') {
            throw new common_1.BadRequestException('La ronda no está en Lobby.');
        }
        const countdownSeconds = 3;
        const countdownEndsAt = new Date(Date.now() + countdownSeconds * 1000);
        await this.prisma.partyGameRound.update({
            where: { id: roundId },
            data: { phase: 'COUNTDOWN' },
        });
        const eventNumber = await this.sessionCache.incrementEventNumber(round.sessionId);
        this.eventEmitter.emit('party.phase.changed', new party_games_events_1.PartyPhaseChangedEvent(round.sessionId, roundId, 'COUNTDOWN', { countdownSeconds, countdownEndsAt: countdownEndsAt.toISOString() }, eventNumber));
        this.scheduler.scheduleAutoClose(`party-countdown-${roundId}`, countdownSeconds * 1000, async () => {
            await this.startInput(roundId, round.sessionId);
        });
        this.logger.log(`[PartyGames] Ronda ${roundId} → COUNTDOWN (${countdownSeconds}s)`);
        return { status: 'ok' };
    }
    async startInput(roundId, sessionId) {
        const round = await this.prisma.partyGameRound.findUnique({ where: { id: roundId } });
        if (!round || round.phase !== 'COUNTDOWN')
            return;
        const inputStartedAt = new Date();
        await this.prisma.partyGameRound.update({
            where: { id: roundId },
            data: { phase: 'INPUT' },
        });
        const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
        this.eventEmitter.emit('party.phase.changed', new party_games_events_1.PartyPhaseChangedEvent(sessionId, roundId, 'INPUT', { inputStartedAt: inputStartedAt.toISOString() }, eventNumber));
        this.scheduler.scheduleAutoClose(`party-input-${roundId}`, round.timeLimit * 1000, async () => {
            await this.advanceToVoting(roundId, sessionId);
        });
        this.logger.log(`[PartyGames] Ronda ${roundId} → INPUT (timer ${round.timeLimit}s)`);
    }
    async advancePhase(roundId) {
        const round = await this.getActiveRound(roundId);
        if (round.phase === 'LOBBY') {
            await this.startCountdown(round.id);
        }
        else if (round.phase === 'COUNTDOWN') {
            throw new common_1.BadRequestException('La cuenta regresiva ya está en curso.');
        }
        else if (round.phase === 'INPUT') {
            await this.advanceToVoting(round.id, round.sessionId);
        }
        else if (round.phase === 'VOTING') {
            await this.advanceToReveal(round.id, round.sessionId);
        }
        else if (round.phase === 'REVEAL') {
            await this.finishRound(round.id, round.sessionId);
        }
        else {
            throw new common_1.BadRequestException('La ronda ya está finalizada.');
        }
    }
    async endRound(roundId) {
        const round = await this.getActiveRound(roundId);
        if (round.phase !== 'FINISHED') {
            await this.finishRound(round.id, round.sessionId);
        }
    }
    async endGame(sessionId) {
        const session = await this.prisma.gameSession.findFirst({
            where: { OR: [{ id: sessionId }, { bar: { slug: sessionId } }], isActive: true },
        });
        if (!session) {
            throw new common_1.NotFoundException(`No se encontró sesión activa con id "${sessionId}".`);
        }
        const activeRound = await this.prisma.partyGameRound.findFirst({
            where: { sessionId: session.id, phase: { not: 'FINISHED' } },
        });
        if (activeRound) {
            await this.finishRound(activeRound.id, session.id);
        }
        const finalLeaderboard = await this.getLeaderboard(session.id);
        const eventNumber = await this.sessionCache.incrementEventNumber(session.id);
        this.eventEmitter.emit('party.game.over', new party_games_events_1.PartyGameOverEvent(session.id, 'PARTY_GAMES', finalLeaderboard, eventNumber));
        this.logger.log(`[PartyGames] Juego finalizado en sesión ${session.id} — ganador: ${finalLeaderboard[0]?.nickname ?? 'N/A'}`);
        return { status: 'ok', leaderboard: finalLeaderboard };
    }
    async advanceToVoting(roundId, sessionId) {
        const round = await this.prisma.partyGameRound.findUnique({
            where: { id: roundId },
            include: { submissions: { include: { player: true } } },
        });
        if (!round || round.phase === 'VOTING' || round.phase === 'REVEAL' || round.phase === 'FINISHED') {
            return;
        }
        await this.prisma.partyGameRound.update({
            where: { id: roundId },
            data: { phase: 'VOTING' },
        });
        const options = this.buildVotingOptions(round);
        const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
        this.eventEmitter.emit('party.phase.changed', new party_games_events_1.PartyPhaseChangedEvent(sessionId, roundId, 'VOTING', { options }, eventNumber));
        this.logger.log(`[PartyGames] Ronda ${roundId} → VOTING`);
    }
    async advanceToReveal(roundId, sessionId) {
        const round = await this.prisma.partyGameRound.findUnique({
            where: { id: roundId },
            include: {
                submissions: { include: { player: true } },
                votes: true,
            },
        });
        if (!round)
            return;
        await this.prisma.partyGameRound.update({
            where: { id: roundId },
            data: { phase: 'REVEAL' },
        });
        const results = await this.calculateAndAwardPoints(round);
        const leaderboard = await this.getLeaderboard(sessionId);
        const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
        const revealOptions = round.submissions.map((s) => {
            const isReal = s.content?.isReal === true || s.player?.nickname === '⭐ Respuesta Real';
            const votesCount = round.votes.filter((v) => v.targetId === s.id).length;
            return {
                id: s.id,
                text: s.content?.text ?? '',
                isReal,
                submittedBy: isReal ? 'Respuesta Real / Oficial (Admin)' : (s.player?.nickname ?? 'Jugador'),
                votes: votesCount,
            };
        });
        this.eventEmitter.emit('party.round.result', new party_games_events_1.PartyRoundResultEvent(sessionId, roundId, results, leaderboard, eventNumber));
        this.eventEmitter.emit('party.phase.changed', new party_games_events_1.PartyPhaseChangedEvent(sessionId, roundId, 'REVEAL', { results, leaderboard, options: revealOptions }, eventNumber));
        this.logger.log(`[PartyGames] Ronda ${roundId} → REVEAL`);
    }
    async finishRound(roundId, sessionId) {
        await this.prisma.partyGameRound.update({
            where: { id: roundId },
            data: { phase: 'FINISHED', finishedAt: new Date() },
        });
        this.scheduler.cancelTimer(`party-input-${roundId}`);
        this.scheduler.cancelTimer(`party-voting-${roundId}`);
        this.scheduler.cancelTimer(`party-countdown-${roundId}`);
        this.scheduler.cancelTimer(`party-basta-grace-${roundId}`);
        const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
        this.eventEmitter.emit('party.round.finished', new party_games_events_1.PartyRoundFinishedEvent(sessionId, roundId, eventNumber));
        this.eventEmitter.emit('party.phase.changed', new party_games_events_1.PartyPhaseChangedEvent(sessionId, roundId, 'FINISHED', {}, eventNumber));
        this.logger.log(`[PartyGames] Ronda ${roundId} → FINISHED`);
    }
    async calculateAndAwardPoints(round) {
        const { submissions, votes, gameType } = round;
        const pointsMap = new Map();
        if (gameType === 'BLUFFING') {
            const realSubmission = submissions.find((s) => s.content?.isReal === true || s.player?.nickname === '⭐ Respuesta Real');
            if (realSubmission) {
                const correctVoters = votes.filter((v) => v.targetId === realSubmission.id);
                for (const vote of correctVoters) {
                    this.addPoints(pointsMap, vote.voterId, 200, 'BLUFFING_GUESS');
                }
                for (const sub of submissions) {
                    if (sub.id === realSubmission.id)
                        continue;
                    const trickedVotes = votes.filter((v) => v.targetId === sub.id);
                    if (trickedVotes.length > 0) {
                        this.addPoints(pointsMap, sub.playerId, trickedVotes.length * 100, 'BLUFFING_TRICK');
                    }
                }
            }
        }
        else if (gameType === 'TUTI_FRUTI') {
            const categories = round.categories ?? [];
            const bastaSubmission = submissions.find((s) => s.isBasta);
            if (bastaSubmission) {
                this.addPoints(pointsMap, bastaSubmission.playerId, 300, 'TUTI_BASTA');
            }
            for (const category of categories) {
                const answersByPlayer = submissions
                    .filter((s) => s.content?.answers?.[category])
                    .map((s) => ({
                    playerId: s.playerId,
                    answer: s.content.answers[category].trim().toLowerCase(),
                }));
                const answerCounts = new Map();
                for (const { answer } of answersByPlayer) {
                    answerCounts.set(answer, (answerCounts.get(answer) ?? 0) + 1);
                }
                for (const { playerId, answer } of answersByPlayer) {
                    const count = answerCounts.get(answer) ?? 0;
                    if (count === 1) {
                        this.addPoints(pointsMap, playerId, 150, 'TUTI_UNIQUE');
                    }
                    else {
                        this.addPoints(pointsMap, playerId, 75, 'TUTI_SHARED');
                    }
                }
            }
        }
        else if (gameType === 'SOCIAL_JUDGMENT') {
            const voteCounts = new Map();
            for (const vote of votes) {
                voteCounts.set(vote.targetId, (voteCounts.get(vote.targetId) ?? 0) + 1);
            }
            let maxVotes = 0;
            let topPlayer = '';
            for (const [playerId, count] of voteCounts) {
                if (count > maxVotes) {
                    maxVotes = count;
                    topPlayer = playerId;
                }
            }
            if (topPlayer) {
                this.addPoints(pointsMap, topPlayer, 250, 'SOCIAL_TOP');
            }
        }
        const pointsArray = [];
        for (const [playerId, pointsList] of pointsMap) {
            const totalEarned = pointsList.reduce((sum, p) => sum + p.points, 0);
            const sources = pointsList.map((p) => p.source).join(',');
            if (totalEarned > 0) {
                await this.prisma.partyGameSubmission.updateMany({
                    where: { roundId: round.id, playerId },
                    data: { pointsEarned: totalEarned, pointsSource: sources },
                });
                await this.prisma.player.update({
                    where: { id: playerId },
                    data: { totalPoints: { increment: totalEarned } },
                });
                pointsArray.push({ playerId, points: totalEarned, source: sources });
            }
        }
        return {
            gameType: round.gameType,
            pointsAwarded: pointsArray,
            submissions: submissions.map((s) => ({
                id: s.id,
                playerId: s.playerId,
                nickname: s.player?.nickname,
                content: s.content,
                isBasta: s.isBasta,
                pointsEarned: pointsMap.get(s.playerId)?.reduce((sum, p) => sum + p.points, 0) ?? 0,
            })),
            votes: votes.map((v) => ({ voterId: v.voterId, targetId: v.targetId })),
        };
    }
    addPoints(map, playerId, points, source) {
        if (!map.has(playerId))
            map.set(playerId, []);
        map.get(playerId).push({ points, source });
    }
    buildVotingOptions(round) {
        if (round.gameType === 'BLUFFING') {
            const shuffled = [...round.submissions].sort(() => Math.random() - 0.5);
            return shuffled.map((s) => ({
                id: s.id,
                text: s.content?.text ?? '',
            }));
        }
        if (round.gameType === 'TUTI_FRUTI') {
            return [...round.submissions]
                .sort((a, b) => Number(b.isBasta) - Number(a.isBasta))
                .map((s) => ({
                id: s.id,
                answers: s.content?.answers ?? {},
                nickname: s.player?.nickname,
                isBasta: s.isBasta,
            }));
        }
        if (round.gameType === 'SOCIAL_JUDGMENT') {
            return round.submissions.map((s) => ({
                id: s.playerId,
                nickname: s.player?.nickname,
            }));
        }
        return [];
    }
    async buildVotesSummary(roundId, gameType) {
        const votes = await this.prisma.partyGameVote.findMany({ where: { roundId } });
        const counts = new Map();
        for (const vote of votes) {
            counts.set(vote.targetId, (counts.get(vote.targetId) ?? 0) + 1);
        }
        return Array.from(counts.entries()).map(([targetId, count]) => ({ targetId, count }));
    }
    async getActiveRound(roundId) {
        const round = await this.prisma.partyGameRound.findUnique({
            where: { id: roundId },
        });
        if (!round) {
            throw new common_1.NotFoundException(`Ronda de Party Game "${roundId}" no encontrada.`);
        }
        return round;
    }
    serializeRound(round) {
        return {
            id: round.id,
            sessionId: round.sessionId,
            gameType: round.gameType,
            phase: round.phase,
            prompt: round.prompt,
            categories: round.categories,
            timeLimit: round.timeLimit,
            createdAt: round.createdAt?.toISOString?.() ?? round.createdAt,
            submittedCount: 0,
            totalPlayers: 0,
        };
    }
    async getActiveRoundForSession(sessionId) {
        const round = await this.prisma.partyGameRound.findFirst({
            where: { sessionId, phase: { not: 'FINISHED' } },
            include: { submissions: { include: { player: { select: { id: true, nickname: true } } } } },
            orderBy: { createdAt: 'desc' },
        });
        if (!round)
            return null;
        const submittedCount = round.submissions.length;
        const totalPlayers = await this.prisma.player.count({ where: { sessionId } });
        const myVotesByPlayer = await this.prisma.partyGameVote.findMany({ where: { roundId: round.id } });
        return {
            ...this.serializeRound(round),
            submittedCount,
            totalPlayers,
            options: round.phase === 'VOTING' ? this.buildVotingOptions(round) : [],
        };
    }
    async getLeaderboard(sessionId) {
        const players = await this.prisma.player.findMany({
            where: { sessionId },
            orderBy: { totalPoints: 'desc' },
            take: 10,
        });
        return players.map((p, idx) => ({
            rank: idx + 1,
            id: p.id,
            nickname: p.nickname,
            totalPoints: p.totalPoints,
            streakCount: p.streakCount,
        }));
    }
};
exports.PartyGamesService = PartyGamesService;
exports.PartyGamesService = PartyGamesService = PartyGamesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_session_cache_service_1.RedisSessionCacheService,
        event_emitter_1.EventEmitter2,
        session_scheduler_1.SessionScheduler])
], PartyGamesService);
//# sourceMappingURL=party-games.service.js.map