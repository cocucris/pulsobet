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
var SessionEngine_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionEngine = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const redis_session_cache_service_1 = require("./redis-session-cache.service");
const session_scheduler_1 = require("./session.scheduler");
const session_events_1 = require("./session.events");
let SessionEngine = SessionEngine_1 = class SessionEngine {
    prisma;
    redisService;
    sessionCache;
    eventEmitter;
    scheduler;
    logger = new common_1.Logger(SessionEngine_1.name);
    constructor(prisma, redisService, sessionCache, eventEmitter, scheduler) {
        this.prisma = prisma;
        this.redisService = redisService;
        this.sessionCache = sessionCache;
        this.eventEmitter = eventEmitter;
        this.scheduler = scheduler;
    }
    async ensureSession(sessionId) {
        let session = await this.prisma.gameSession.findUnique({
            where: { id: sessionId },
            include: { bar: true },
        });
        if (!session) {
            session = await this.prisma.gameSession.findFirst({
                where: { isActive: true },
                include: { bar: true },
            });
        }
        if (!session) {
            let bar = await this.prisma.bar.findFirst({
                where: { OR: [{ id: sessionId }, { slug: sessionId }] },
            });
            if (!bar) {
                bar = await this.prisma.bar.findFirst();
            }
            if (!bar) {
                bar = await this.prisma.bar.upsert({
                    where: { slug: 'kilkenny' },
                    update: {},
                    create: {
                        id: 'local-kilkenny-test',
                        name: 'Kilkenny Pub',
                        slug: 'kilkenny',
                        address: 'Asunción',
                    },
                });
            }
            session = await this.prisma.gameSession.create({
                data: {
                    id: sessionId || 'session-demo-01',
                    barId: bar.id,
                    isActive: true,
                },
                include: { bar: true },
            });
        }
        return session;
    }
    async buildSnapshot(sessionId, playerId) {
        const session = await this.ensureSession(sessionId);
        const actualSessionId = session.id;
        const version = await this.sessionCache.getVersion(actualSessionId);
        const eventNumber = await this.sessionCache.getEventNumber(actualSessionId);
        const connectedPlayersCount = await this.sessionCache.getConnectedCount(actualSessionId);
        let matchData = await this.sessionCache.getMatch(actualSessionId);
        if (!matchData && session.matchId) {
            const match = await this.prisma.match.findUnique({ where: { id: session.matchId } });
            if (match) {
                matchData = {
                    id: match.id,
                    homeTeam: match.homeTeam,
                    awayTeam: match.awayTeam,
                    scoreHome: match.scoreHome,
                    scoreAway: match.scoreAway,
                    status: match.status,
                    currentMinute: match.currentMinute,
                };
                await this.sessionCache.setMatch(actualSessionId, matchData);
            }
        }
        const cachedTrivias = await this.sessionCache.getActiveTrivias(actualSessionId);
        const dbQuestions = session.matchId
            ? await this.prisma.liveQuestion.findMany({
                where: { correctOptionId: null, matchId: session.matchId },
                orderBy: { expiresAt: 'asc' },
            })
            : [];
        const dbTrivias = await Promise.all(dbQuestions.map((q) => this.enrichQuestionStats(q)));
        const merged = [...dbTrivias];
        for (const cached of cachedTrivias) {
            if (cached?.id && !merged.some((t) => t.id === cached.id) && cached.correctOptionId == null) {
                merged.push(cached);
            }
        }
        const activeTrivias = merged;
        await this.sessionCache.setActiveTrivias(actualSessionId, activeTrivias);
        let resolvedTrivias = await this.sessionCache.getResolvedTrivias(actualSessionId);
        if (resolvedTrivias.length === 0 && session.matchId) {
            const resolvedQuestions = await this.prisma.liveQuestion.findMany({
                where: { correctOptionId: { not: null }, matchId: session.matchId },
                orderBy: { expiresAt: 'asc' },
                take: 20,
            });
            if (resolvedQuestions.length > 0) {
                resolvedTrivias = await Promise.all(resolvedQuestions.map(async (q) => {
                    const enriched = await this.enrichQuestionStats(q);
                    const winnersCount = await this.prisma.prediction.count({
                        where: { questionId: q.id, status: 'HIT' },
                    });
                    return { ...enriched, correctOptionId: q.correctOptionId, winnersCount };
                }));
                for (const t of resolvedTrivias) {
                    await this.sessionCache.addResolvedTrivia(actualSessionId, t);
                }
            }
        }
        const topPlayersRaw = await this.prisma.player.findMany({
            where: { sessionId: actualSessionId },
            orderBy: { totalPoints: 'desc' },
            take: 10,
        });
        const leaderboardTop10 = topPlayersRaw.map((p, idx) => ({
            rank: idx + 1,
            id: p.id,
            nickname: p.nickname,
            totalPoints: p.totalPoints,
            streakCount: p.streakCount,
        }));
        let myPlayer = null;
        if (playerId) {
            const playerObj = await this.prisma.player.findUnique({ where: { id: playerId } });
            if (playerObj) {
                let votedTriviaIds = [];
                if (activeTrivias.length > 0) {
                    const votes = await this.prisma.prediction.findMany({
                        where: { playerId, questionId: { in: activeTrivias.map((t) => t.id) } },
                        select: { questionId: true },
                    });
                    votedTriviaIds = votes.map((v) => v.questionId);
                }
                const ahead = await this.prisma.player.count({
                    where: { sessionId: session.id, totalPoints: { gt: playerObj.totalPoints } },
                });
                myPlayer = {
                    id: playerObj.id,
                    nickname: playerObj.nickname,
                    totalPoints: playerObj.totalPoints,
                    rank: ahead + 1,
                    votedTriviaIds,
                };
            }
        }
        let rewards = await this.sessionCache.getRewards(session.barId);
        if (!rewards) {
            rewards = await this.prisma.reward.findMany({
                where: { barId: session.barId },
                select: { id: true, title: true, pointsCost: true, stock: true },
            });
            await this.sessionCache.setRewards(session.barId, rewards);
        }
        let mode = await this.sessionCache.getMode(actualSessionId);
        if (!mode) {
            mode = session.mode || 'MATCH';
            await this.sessionCache.setMode(actualSessionId, mode);
        }
        const sessionMode = mode;
        let activeCards = await this.sessionCache.getActiveCards(actualSessionId);
        if (activeCards.length === 0) {
            const dbCards = await this.prisma.profileCard.findMany({
                where: { sessionId: actualSessionId, status: 'APPROVED' },
                orderBy: { createdAt: 'asc' },
            });
            if (dbCards.length > 0) {
                activeCards = await Promise.all(dbCards.map((c) => this.enrichCardForSnapshot(c)));
                await this.sessionCache.setActiveCards(actualSessionId, activeCards);
            }
        }
        let cardsHistory = await this.sessionCache.getCardsHistory(actualSessionId);
        if (cardsHistory.length === 0) {
            const closedCards = await this.prisma.profileCard.findMany({
                where: {
                    sessionId: actualSessionId,
                    status: 'APPROVED',
                    id: { notIn: activeCards.map((c) => c.id) },
                },
                orderBy: { createdAt: 'asc' },
            });
            if (closedCards.length > 0) {
                cardsHistory = await Promise.all(closedCards.map((c) => this.enrichCardForSnapshot(c)));
                for (const c of cardsHistory) {
                    await this.sessionCache.addCardToHistory(actualSessionId, c);
                }
            }
        }
        const pendingCardsCount = await this.prisma.profileCard.count({
            where: { sessionId: actualSessionId, status: 'PENDING' },
        });
        let myCardVotes = {};
        if (playerId && activeCards.length > 0) {
            const votes = await this.prisma.cardVote.findMany({
                where: {
                    playerId,
                    cardId: { in: activeCards.map((c) => c.id) },
                },
            });
            myCardVotes = Object.fromEntries(votes.map((v) => [v.cardId, v.choice]));
        }
        let partyGame = { activeRound: null, mySubmission: null, myVote: null };
        try {
            const activePartyRound = await this.prisma.partyGameRound.findFirst({
                where: { sessionId: actualSessionId, phase: { not: 'FINISHED' } },
                include: {
                    submissions: { include: { player: { select: { id: true, nickname: true } } } },
                },
                orderBy: { createdAt: 'desc' },
            });
            if (activePartyRound) {
                const submittedCount = activePartyRound.submissions.length;
                const totalPlayers = await this.prisma.player.count({ where: { sessionId: actualSessionId } });
                let options = [];
                if (activePartyRound.phase === 'VOTING' || activePartyRound.phase === 'REVEAL') {
                    const allVotes = await this.prisma.partyGameVote.findMany({ where: { roundId: activePartyRound.id } });
                    if (activePartyRound.gameType === 'BLUFFING') {
                        const isReveal = activePartyRound.phase === 'REVEAL';
                        options = [...activePartyRound.submissions].map((s) => {
                            const isReal = s.content?.isReal === true || s.player?.nickname === '⭐ Respuesta Real';
                            const votesCount = allVotes.filter((v) => v.targetId === s.id).length;
                            return {
                                id: s.id,
                                text: s.content?.text ?? '',
                                ...(isReveal
                                    ? {
                                        isReal,
                                        submittedBy: isReal ? 'Respuesta Real / Oficial (Admin)' : (s.player?.nickname ?? 'Jugador'),
                                        votes: votesCount,
                                    }
                                    : { votes: votesCount }),
                            };
                        });
                        if (!isReveal) {
                            options.sort(() => Math.random() - 0.5);
                        }
                    }
                    else if (activePartyRound.gameType === 'TUTI_FRUTI') {
                        const basta = activePartyRound.submissions.find((s) => s.isBasta);
                        options = basta ? [{ id: basta.id, answers: basta.content?.answers, nickname: basta.player?.nickname }] : [];
                    }
                    else if (activePartyRound.gameType === 'SOCIAL_JUDGMENT') {
                        const sessionPlayers = await this.prisma.player.findMany({
                            where: { sessionId: actualSessionId, nickname: { not: '⭐ Respuesta Real' } },
                            select: { id: true, nickname: true },
                        });
                        const isReveal = activePartyRound.phase === 'REVEAL';
                        options = sessionPlayers.map((p) => {
                            const votesCount = allVotes.filter((v) => v.targetId === p.id).length;
                            return {
                                id: p.id,
                                nickname: p.nickname,
                                ...(isReveal ? { votes: votesCount } : {}),
                            };
                        });
                    }
                }
                partyGame.activeRound = {
                    id: activePartyRound.id,
                    gameType: activePartyRound.gameType,
                    phase: activePartyRound.phase,
                    prompt: activePartyRound.prompt,
                    categories: activePartyRound.categories,
                    timeLimit: activePartyRound.timeLimit,
                    createdAt: activePartyRound.createdAt.toISOString(),
                    submittedCount,
                    totalPlayers,
                    options,
                };
                if (playerId) {
                    const mySubmission = activePartyRound.submissions.find((s) => s.playerId === playerId);
                    partyGame.mySubmission = mySubmission ? { content: mySubmission.content, isBasta: mySubmission.isBasta } : null;
                    const myVote = await this.prisma.partyGameVote.findUnique({
                        where: { roundId_voterId: { roundId: activePartyRound.id, voterId: playerId } },
                    });
                    partyGame.myVote = myVote?.targetId ?? null;
                }
            }
        }
        catch (err) {
            this.logger.warn(`Error al construir partyGame en snapshot: ${err.message}`);
        }
        return {
            sessionId: actualSessionId,
            barId: session.barId,
            version,
            eventNumber,
            serverTime: new Date().toISOString(),
            match: matchData,
            activeTrivias,
            resolvedTrivias,
            leaderboardTop10,
            myPlayer,
            connectedPlayersCount,
            rewards: rewards || [],
            mode: sessionMode,
            activeCards,
            cardsHistory,
            pendingCardsCount,
            myCardVotes,
            votingClosed: false,
            votingResults: null,
            partyGame,
            barSettings: {
                name: session.bar?.name || 'PulsoBet Bar',
                slug: session.bar?.slug || 'pulsobet',
            },
            connectionStatus: 'connected',
        };
    }
    async startMatch(sessionId, homeTeam, awayTeam, status = 'SCHEDULED') {
        const session = await this.ensureSession(sessionId);
        const match = await this.prisma.match.create({
            data: {
                apiFootballId: Math.floor(1000 + Math.random() * 9000),
                homeTeam,
                awayTeam,
                startTime: new Date(),
                status,
            },
        });
        await this.prisma.gameSession.update({
            where: { id: session.id },
            data: { matchId: match.id },
        });
        const matchPayload = {
            id: match.id,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            scoreHome: 0,
            scoreAway: 0,
            status: match.status,
            currentMinute: 0,
        };
        await this.sessionCache.setMatch(session.id, matchPayload);
        await this.sessionCache.incrementVersion(session.id);
        const eventNumber = await this.sessionCache.incrementEventNumber(session.id);
        this.eventEmitter.emit('match.started', new session_events_1.MatchStartedEvent(session.id, matchPayload, eventNumber));
        return { ...matchPayload, sessionId: session.id };
    }
    async resetMatch(sessionId) {
        const session = await this.ensureSession(sessionId);
        await this.prisma.gameSession.update({
            where: { id: session.id },
            data: { matchId: null },
        });
        await this.sessionCache.setMatch(session.id, null);
        await this.sessionCache.incrementVersion(session.id);
        const eventNumber = await this.sessionCache.incrementEventNumber(session.id);
        this.eventEmitter.emit('match.finished', new session_events_1.MatchFinishedEvent(session.id, null, eventNumber));
        return { status: 'success', message: 'Partido reseteado' };
    }
    async closeAndResetSession(sessionId) {
        const session = await this.ensureSession(sessionId);
        const oldId = session.id;
        const archivedId = `${oldId}-closed-${Date.now()}`;
        await this.prisma.$transaction(async (tx) => {
            await tx.gameSession.update({
                where: { id: oldId },
                data: { id: archivedId, isActive: false, matchId: null },
            });
            await tx.gameSession.create({
                data: {
                    id: oldId,
                    barId: session.barId,
                    isActive: true,
                    matchId: null,
                },
            });
        });
        await this.sessionCache.resetSessionState(oldId);
        try {
            await this.redisService.clearLeaderboard(oldId);
        }
        catch (e) {
            this.logger.warn(`Redis fallback on clearLeaderboard al cerrar noche: ${e.message}`);
        }
        const eventNumber = await this.sessionCache.incrementEventNumber(oldId);
        this.eventEmitter.emit('session.reset', new session_events_1.SessionResetEvent(oldId, eventNumber));
        this.logger.log(`Noche cerrada: sesión ${oldId} archivada como ${archivedId} y recreada en cero.`);
        return { status: 'success', newSessionId: oldId, archivedSessionId: archivedId };
    }
    async resetAllPlayerPoints(sessionId) {
        const session = await this.ensureSession(sessionId);
        await this.prisma.player.updateMany({
            data: { totalPoints: 0, streakCount: 0 },
        });
        await this.prisma.partyGameSubmission.updateMany({
            data: { pointsEarned: 0, pointsSource: null },
        });
        try {
            await this.redisService.clearLeaderboard(session.id);
            await this.redisService.clearLeaderboard('session-demo-01');
            await this.redisService.clearLeaderboard('local-kilkenny-test');
        }
        catch (e) {
            this.logger.warn(`Redis fallback on clearLeaderboard: ${e.message}`);
        }
        const leaderboard = await this.getLeaderboard(session.id);
        const eventNumber = await this.sessionCache.incrementEventNumber(session.id);
        this.eventEmitter.emit('leaderboard.updated', new session_events_1.LeaderboardUpdatedEvent(session.id, leaderboard, eventNumber));
        this.logger.log(`Puntos reseteados a 0 para todos los jugadores en la base de datos.`);
        return { status: 'success', message: 'Puntos reseteados a 0 para todos los jugadores', leaderboard };
    }
    async updateScore(matchId, scoreHome, scoreAway, homeTeam, awayTeam, currentMinute, status) {
        const dataToUpdate = { scoreHome, scoreAway };
        if (homeTeam)
            dataToUpdate.homeTeam = homeTeam;
        if (awayTeam)
            dataToUpdate.awayTeam = awayTeam;
        if (currentMinute !== undefined)
            dataToUpdate.currentMinute = currentMinute;
        if (status)
            dataToUpdate.status = status;
        if (status === 'FINISHED') {
            const pendingTrivias = await this.prisma.liveQuestion.count({
                where: { matchId, correctOptionId: null },
            });
            if (pendingTrivias > 0) {
                throw new common_1.BadRequestException(`Tenés ${pendingTrivias} trivia(s) sin resolver. Resolvelas en el Control de Trivias antes de finalizar el partido.`);
            }
        }
        const match = await this.prisma.match.update({
            where: { id: matchId },
            data: dataToUpdate,
        });
        const session = await this.prisma.gameSession.findFirst({
            where: { matchId: match.id, isActive: true },
        });
        const matchPayload = {
            id: match.id,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            scoreHome: match.scoreHome,
            scoreAway: match.scoreAway,
            status: match.status,
            currentMinute: match.currentMinute,
        };
        let sessionId;
        if (session) {
            sessionId = session.id;
        }
        else {
            const anyActive = await this.prisma.gameSession.findFirst({ where: { isActive: true } });
            if (!anyActive) {
                this.logger.warn(`updateScore: partido ${matchId} actualizado sin sesión activa asociada`);
                return matchPayload;
            }
            sessionId = anyActive.id;
        }
        await this.sessionCache.setMatch(sessionId, matchPayload);
        await this.sessionCache.incrementVersion(sessionId);
        const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
        this.eventEmitter.emit('match.score.updated', new session_events_1.MatchScoreUpdatedEvent(sessionId, match.scoreHome, match.scoreAway, match.homeTeam, match.awayTeam, match.status, eventNumber));
        return matchPayload;
    }
    async createManualQuestion(dto) {
        let activeSession = await this.prisma.gameSession.findFirst({
            where: { barId: dto.barId, isActive: true },
        });
        if (!activeSession) {
            activeSession = await this.prisma.gameSession.findFirst({ where: { isActive: true } });
        }
        if (!activeSession) {
            let bar = await this.prisma.bar.findFirst({ where: { id: dto.barId } });
            if (!bar) {
                bar = await this.prisma.bar.upsert({
                    where: { slug: 'kilkenny' },
                    update: {},
                    create: {
                        id: dto.barId || 'local-kilkenny-test',
                        name: 'Kilkenny Pub',
                        slug: 'kilkenny',
                        address: 'Asunción',
                    },
                });
            }
            activeSession = await this.prisma.gameSession.create({
                data: {
                    id: 'session-demo-01',
                    barId: bar.id,
                    isActive: true,
                },
            });
        }
        let liveMatch = activeSession.matchId
            ? await this.prisma.match.findUnique({ where: { id: activeSession.matchId } })
            : null;
        if (!liveMatch) {
            liveMatch = await this.prisma.match.findFirst({
                where: { status: 'LIVE' },
                orderBy: { startTime: 'desc' },
            });
        }
        if (!liveMatch) {
            liveMatch = await this.prisma.match.create({
                data: {
                    apiFootballId: Math.floor(1000 + Math.random() * 9000),
                    homeTeam: 'Olimpia',
                    awayTeam: 'Cerro Porteño',
                    startTime: new Date(),
                    status: 'LIVE',
                },
            });
        }
        if (!activeSession.matchId) {
            await this.prisma.gameSession.update({
                where: { id: activeSession.id },
                data: { matchId: liveMatch.id },
            });
        }
        const isFlash = dto.isFlash === true;
        const duration = isFlash
            ? (dto.expiresInSeconds || 15)
            : (dto.expiresInSeconds && dto.expiresInSeconds >= 10 ? dto.expiresInSeconds : 3600);
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + duration);
        const liveQuestion = await this.prisma.liveQuestion.create({
            data: {
                matchId: liveMatch.id,
                questionText: dto.questionText,
                options: dto.options,
                expiresAt,
                pointsReward: dto.pointsReward || (isFlash ? 900 : 150),
                imageUrl: dto.imageUrl || null,
                isFlash,
            },
        });
        const enrichedTrivia = await this.enrichQuestionStats(liveQuestion);
        await this.sessionCache.upsertActiveTrivia(activeSession.id, enrichedTrivia);
        await this.sessionCache.incrementVersion(activeSession.id);
        const eventNumber = await this.sessionCache.incrementEventNumber(activeSession.id);
        const delayMs = expiresAt.getTime() - Date.now();
        if (delayMs > 0) {
            this.scheduler.scheduleAutoClose(liveQuestion.id, delayMs, async () => {
                await this.closeTrivia(activeSession.id, liveQuestion.id);
            });
        }
        this.eventEmitter.emit('trivia.opened', new session_events_1.TriviaOpenedEvent(activeSession.id, enrichedTrivia, eventNumber));
        return {
            status: 'success',
            questionId: liveQuestion.id,
            expiresAt: liveQuestion.expiresAt,
            trivia: enrichedTrivia,
        };
    }
    async closeTrivia(sessionId, triviaId) {
        const closed = await this.prisma.liveQuestion.update({
            where: { id: triviaId },
            data: { isClosed: true },
        });
        const enriched = await this.enrichQuestionStats(closed);
        await this.sessionCache.upsertActiveTrivia(sessionId, enriched);
        await this.sessionCache.incrementVersion(sessionId);
        const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
        this.eventEmitter.emit('trivia.closed', new session_events_1.TriviaClosedEvent(sessionId, triviaId, eventNumber, enriched));
    }
    async resolveQuestionExpress(questionId, correctOptionId) {
        const question = await this.prisma.liveQuestion.findUnique({
            where: { id: questionId },
            include: { predictions: true },
        });
        if (!question)
            throw new common_1.BadRequestException('Pregunta no encontrada');
        await this.prisma.liveQuestion.update({
            where: { id: questionId },
            data: { correctOptionId, isClosed: true },
        });
        this.scheduler.cancelTimer(questionId);
        const winningPredictions = question.predictions.filter((p) => Number(p.chosenOptionId) === Number(correctOptionId));
        const pointsToAward = question.pointsReward || 100;
        let targetSessionId = 'session-demo-01';
        const activeSession = await this.prisma.gameSession.findFirst({ where: { isActive: true } });
        if (activeSession)
            targetSessionId = activeSession.id;
        for (const winPred of winningPredictions) {
            await this.prisma.prediction.update({
                where: { id: winPred.id },
                data: { status: 'HIT', pointsEarned: pointsToAward },
            });
            await this.prisma.player.update({
                where: { id: winPred.playerId },
                data: {
                    totalPoints: { increment: pointsToAward },
                    streakCount: { increment: 1 },
                },
            });
            await this.redisService.incrementPlayerScore(targetSessionId, winPred.playerId, pointsToAward);
        }
        const losingPredictions = question.predictions.filter((p) => Number(p.chosenOptionId) !== Number(correctOptionId));
        for (const losePred of losingPredictions) {
            await this.prisma.prediction.update({
                where: { id: losePred.id },
                data: { status: 'MISSED', pointsEarned: -pointsToAward },
            });
            await this.prisma.player.update({
                where: { id: losePred.playerId },
                data: {
                    totalPoints: { decrement: pointsToAward },
                    streakCount: 0,
                },
            });
            await this.redisService.incrementPlayerScore(targetSessionId, losePred.playerId, -pointsToAward);
        }
        await this.sessionCache.removeActiveTrivia(targetSessionId, questionId);
        const resolvedTrivia = {
            ...(await this.enrichQuestionStats(question)),
            correctOptionId,
            winnersCount: winningPredictions.length,
        };
        await this.sessionCache.addResolvedTrivia(targetSessionId, resolvedTrivia);
        await this.sessionCache.incrementVersion(targetSessionId);
        const eventNumber = await this.sessionCache.incrementEventNumber(targetSessionId);
        const topPlayers = await this.getLeaderboard(targetSessionId);
        this.eventEmitter.emit('trivia.result', new session_events_1.TriviaResultEvent(targetSessionId, questionId, correctOptionId, winningPredictions.length, topPlayers, eventNumber, resolvedTrivia));
        return {
            status: 'resolved',
            winnersCount: winningPredictions.length,
            pointsAwarded: pointsToAward,
        };
    }
    async updateLiveQuestion(questionId, dto) {
        const existing = await this.prisma.liveQuestion.findUnique({ where: { id: questionId } });
        if (!existing)
            throw new common_1.BadRequestException('Trivia no encontrada');
        const updated = await this.prisma.liveQuestion.update({
            where: { id: questionId },
            data: {
                ...(dto.questionText && { questionText: dto.questionText }),
                ...(dto.options && { options: dto.options }),
            },
        });
        const activeSession = await this.prisma.gameSession.findFirst({ where: { isActive: true } });
        const sessionId = activeSession ? activeSession.id : 'session-demo-01';
        const enriched = await this.enrichQuestionStats(updated);
        await this.sessionCache.upsertActiveTrivia(sessionId, enriched);
        await this.sessionCache.incrementVersion(sessionId);
        const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
        this.eventEmitter.emit('trivia.opened', new session_events_1.TriviaOpenedEvent(sessionId, enriched, eventNumber));
        return enriched;
    }
    async submitVote(sessionId, playerId, questionId, chosenOptionId) {
        const question = await this.prisma.liveQuestion.findUnique({ where: { id: questionId } });
        if (!question) {
            return { accepted: false, reason: 'La trivia ya no está disponible.' };
        }
        if (question.isClosed || question.correctOptionId !== null) {
            return { accepted: false, reason: 'Esta trivia ya fue cerrada.' };
        }
        if (question.expiresAt && question.expiresAt.getTime() < Date.now()) {
            return { accepted: false, reason: 'Se acabó el tiempo para votar.' };
        }
        const existing = await this.prisma.prediction.findFirst({
            where: { playerId, questionId },
        });
        if (existing) {
            return { accepted: true };
        }
        const optionNum = Number(chosenOptionId);
        await this.prisma.prediction.create({
            data: {
                playerId,
                questionId,
                chosenOptionId: optionNum,
                status: 'PENDING',
            },
        });
        const enriched = await this.enrichQuestionStats(question);
        await this.sessionCache.upsertActiveTrivia(sessionId, enriched);
        await this.sessionCache.incrementVersion(sessionId);
        const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
        this.eventEmitter.emit('player.voted', new session_events_1.PlayerVotedEvent(sessionId, questionId, enriched.options, enriched.totalVotes, eventNumber));
        return { accepted: true };
    }
    async getLeaderboard(sessionId) {
        const topPlayers = await this.prisma.player.findMany({
            where: { sessionId },
            orderBy: { totalPoints: 'desc' },
            take: 10,
        });
        return topPlayers.map((p, idx) => ({
            rank: idx + 1,
            id: p.id,
            nickname: p.nickname,
            totalPoints: p.totalPoints,
            streakCount: p.streakCount,
        }));
    }
    async enrichCardForSnapshot(card) {
        const grouped = await this.prisma.cardVote.groupBy({
            by: ['choice'],
            where: { cardId: card.id },
            _count: { id: true },
        });
        const counts = { interested: 0, introduce: 0, pass: 0 };
        for (const g of grouped) {
            if (g.choice === 'INTERESTED')
                counts.interested = g._count.id;
            if (g.choice === 'INTRODUCE')
                counts.introduce = g._count.id;
            if (g.choice === 'PASS')
                counts.pass = g._count.id;
        }
        return {
            id: card.id,
            sessionId: card.sessionId,
            tableNumber: card.tableNumber,
            name: card.name,
            age: card.age,
            position: card.position,
            strongFoot: card.strongFoot,
            fitness: card.fitness,
            skills: card.skills,
            objective: card.objective,
            photoUrl: card.photoUrl,
            status: card.status,
            createdAt: card.createdAt,
            counts,
            totalVotes: counts.interested + counts.introduce + counts.pass,
        };
    }
    async enrichQuestionStats(question) {
        const voteCounts = await this.prisma.prediction.groupBy({
            by: ['chosenOptionId'],
            where: { questionId: question.id },
            _count: { id: true },
        });
        const totalVotes = voteCounts.reduce((sum, item) => sum + item._count.id, 0);
        const optionsArray = Array.isArray(question.options) ? question.options : [];
        const optionsWithStats = optionsArray.map((opt) => {
            const match = voteCounts.find((v) => Number(v.chosenOptionId) === Number(opt.id));
            const count = match ? match._count.id : 0;
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            return {
                ...opt,
                count,
                percentage,
            };
        });
        return {
            id: question.id,
            questionText: question.questionText,
            options: optionsWithStats,
            pointsReward: question.pointsReward,
            imageUrl: question.imageUrl,
            isFlash: question.isFlash,
            isClosed: question.isClosed,
            expiresAt: question.expiresAt,
            totalVotes,
        };
    }
    async setMode(sessionId, mode) {
        const session = await this.ensureSession(sessionId);
        await this.prisma.gameSession.update({
            where: { id: session.id },
            data: { mode },
        });
        await this.sessionCache.setMode(session.id, mode);
        const eventNumber = await this.sessionCache.incrementEventNumber(session.id);
        this.eventEmitter.emit('session.mode.changed', new session_events_1.SessionModeChangedEvent(session.id, mode, eventNumber));
        return { status: 'success', mode };
    }
};
exports.SessionEngine = SessionEngine;
exports.SessionEngine = SessionEngine = SessionEngine_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        redis_session_cache_service_1.RedisSessionCacheService,
        event_emitter_1.EventEmitter2,
        session_scheduler_1.SessionScheduler])
], SessionEngine);
//# sourceMappingURL=session.engine.js.map