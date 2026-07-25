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
    async buildSnapshot(sessionId, playerId) {
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
            throw new common_1.NotFoundException(`No existe sesión de juego activa para ${sessionId}`);
        }
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
        if (!matchData) {
            const liveMatch = await this.prisma.match.findFirst({
                where: { status: 'LIVE' },
                orderBy: { startTime: 'desc' },
            });
            if (liveMatch) {
                matchData = {
                    id: liveMatch.id,
                    homeTeam: liveMatch.homeTeam,
                    awayTeam: liveMatch.awayTeam,
                    scoreHome: liveMatch.scoreHome,
                    scoreAway: liveMatch.scoreAway,
                    status: liveMatch.status,
                    currentMinute: liveMatch.currentMinute,
                };
                await this.sessionCache.setMatch(actualSessionId, matchData);
            }
        }
        let currentTrivia = await this.sessionCache.getCurrentTrivia(actualSessionId);
        if (!currentTrivia) {
            const activeQuestion = await this.prisma.liveQuestion.findFirst({
                where: { correctOptionId: null, isClosed: false },
                orderBy: { expiresAt: 'desc' },
            });
            if (activeQuestion) {
                currentTrivia = await this.enrichQuestionStats(activeQuestion);
                await this.sessionCache.setCurrentTrivia(actualSessionId, currentTrivia);
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
                let hasVotedCurrentTrivia = false;
                if (currentTrivia?.id) {
                    const vote = await this.prisma.prediction.findFirst({
                        where: { playerId, questionId: currentTrivia.id },
                    });
                    hasVotedCurrentTrivia = !!vote;
                }
                myPlayer = {
                    id: playerObj.id,
                    nickname: playerObj.nickname,
                    totalPoints: playerObj.totalPoints,
                    hasVotedCurrentTrivia,
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
        return {
            sessionId: actualSessionId,
            barId: session.barId,
            version,
            eventNumber,
            serverTime: new Date().toISOString(),
            match: matchData,
            currentTrivia,
            leaderboardTop10,
            myPlayer,
            connectedPlayersCount,
            rewards: rewards || [],
            barSettings: {
                name: session.bar?.name || 'PulsoBet Bar',
                slug: session.bar?.slug || 'pulsobet',
            },
            connectionStatus: 'connected',
        };
    }
    async startMatch(sessionId, homeTeam, awayTeam) {
        let session = await this.prisma.gameSession.findUnique({ where: { id: sessionId } });
        if (!session) {
            session = await this.prisma.gameSession.findFirst({ where: { isActive: true } });
        }
        if (!session)
            throw new common_1.BadRequestException('No existe sesión activa');
        const match = await this.prisma.match.create({
            data: {
                apiFootballId: Math.floor(1000 + Math.random() * 9000),
                homeTeam,
                awayTeam,
                startTime: new Date(),
                status: 'LIVE',
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
        return matchPayload;
    }
    async updateScore(matchId, scoreHome, scoreAway, homeTeam, awayTeam, currentMinute) {
        const dataToUpdate = { scoreHome, scoreAway };
        if (homeTeam)
            dataToUpdate.homeTeam = homeTeam;
        if (awayTeam)
            dataToUpdate.awayTeam = awayTeam;
        if (currentMinute !== undefined)
            dataToUpdate.currentMinute = currentMinute;
        const match = await this.prisma.match.update({
            where: { id: matchId },
            data: dataToUpdate,
        });
        const session = await this.prisma.gameSession.findFirst({
            where: { matchId: match.id, isActive: true },
        });
        const sessionId = session ? session.id : 'session-demo-01';
        const matchPayload = {
            id: match.id,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            scoreHome: match.scoreHome,
            scoreAway: match.scoreAway,
            status: match.status,
            currentMinute: match.currentMinute,
        };
        await this.sessionCache.setMatch(sessionId, matchPayload);
        await this.sessionCache.incrementVersion(sessionId);
        const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
        this.eventEmitter.emit('match.score.updated', new session_events_1.MatchScoreUpdatedEvent(sessionId, match.scoreHome, match.scoreAway, match.homeTeam, match.awayTeam, eventNumber));
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
        let liveMatch = await this.prisma.match.findFirst({
            where: { status: 'LIVE' },
            orderBy: { startTime: 'desc' },
        });
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
        await this.sessionCache.setCurrentTrivia(activeSession.id, enrichedTrivia);
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
        await this.prisma.liveQuestion.update({
            where: { id: triviaId },
            data: { isClosed: true },
        });
        await this.sessionCache.clearCurrentTrivia(sessionId);
        await this.sessionCache.incrementVersion(sessionId);
        const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
        this.eventEmitter.emit('trivia.closed', new session_events_1.TriviaClosedEvent(sessionId, triviaId, eventNumber));
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
                data: { status: 'MISSED', pointsEarned: 0 },
            });
            await this.prisma.player.update({
                where: { id: losePred.playerId },
                data: { streakCount: 0 },
            });
        }
        await this.sessionCache.clearCurrentTrivia(targetSessionId);
        await this.sessionCache.incrementVersion(targetSessionId);
        const eventNumber = await this.sessionCache.incrementEventNumber(targetSessionId);
        const topPlayers = await this.getLeaderboard(targetSessionId);
        this.eventEmitter.emit('trivia.result', new session_events_1.TriviaResultEvent(targetSessionId, questionId, correctOptionId, winningPredictions.length, topPlayers, eventNumber));
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
        await this.sessionCache.setCurrentTrivia(sessionId, enriched);
        await this.sessionCache.incrementVersion(sessionId);
        const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
        this.eventEmitter.emit('trivia.opened', new session_events_1.TriviaOpenedEvent(sessionId, enriched, eventNumber));
        return enriched;
    }
    async submitVote(sessionId, playerId, questionId, chosenOptionId) {
        const existing = await this.prisma.prediction.findFirst({
            where: { playerId, questionId },
        });
        const optionNum = Number(chosenOptionId);
        if (existing) {
            await this.prisma.prediction.update({
                where: { id: existing.id },
                data: { chosenOptionId: optionNum },
            });
        }
        else {
            await this.prisma.prediction.create({
                data: {
                    playerId,
                    questionId,
                    chosenOptionId: optionNum,
                    status: 'PENDING',
                },
            });
        }
        const question = await this.prisma.liveQuestion.findUnique({ where: { id: questionId } });
        if (question) {
            const enriched = await this.enrichQuestionStats(question);
            await this.sessionCache.setCurrentTrivia(sessionId, enriched);
            await this.sessionCache.incrementVersion(sessionId);
            const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
            this.eventEmitter.emit('player.voted', new session_events_1.PlayerVotedEvent(sessionId, questionId, enriched.options, enriched.totalVotes, eventNumber));
        }
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