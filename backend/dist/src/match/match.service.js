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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const live_gateway_1 = require("../live/live.gateway");
const redis_service_1 = require("../redis/redis.service");
let MatchService = class MatchService {
    prisma;
    liveGateway;
    redisService;
    constructor(prisma, liveGateway, redisService) {
        this.prisma = prisma;
        this.liveGateway = liveGateway;
        this.redisService = redisService;
    }
    async createManualQuestion(dto) {
        let activeSession = await this.prisma.gameSession.findFirst({
            where: { barId: dto.barId, isActive: true },
        });
        if (!activeSession) {
            activeSession = await this.prisma.gameSession.findFirst({
                where: { isActive: true },
            });
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
        this.liveGateway.broadcastNewQuestion(activeSession.id, {
            id: liveQuestion.id,
            questionText: liveQuestion.questionText,
            options: liveQuestion.options,
            pointsReward: liveQuestion.pointsReward,
            imageUrl: liveQuestion.imageUrl,
            isFlash: liveQuestion.isFlash,
            expiresAt: liveQuestion.expiresAt,
        });
        return {
            status: 'success',
            message: 'Trivia inyectada y propagada en tiempo real.',
            questionId: liveQuestion.id,
        };
    }
    async getActiveQuestions(sessionId) {
        const activeQuestions = await this.prisma.liveQuestion.findMany({
            where: {
                correctOptionId: null,
            },
            orderBy: { expiresAt: 'desc' },
        });
        const enriched = await Promise.all(activeQuestions.map(async (q) => {
            const voteCounts = await this.prisma.prediction.groupBy({
                by: ['chosenOptionId'],
                where: { questionId: q.id },
                _count: { id: true },
            });
            const totalVotes = voteCounts.reduce((sum, item) => sum + item._count.id, 0);
            const optionsArray = Array.isArray(q.options) ? q.options : [];
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
                id: q.id,
                questionText: q.questionText,
                options: optionsWithStats,
                pointsReward: q.pointsReward,
                imageUrl: q.imageUrl,
                isFlash: q.isFlash,
                isClosed: q.isClosed,
                expiresAt: q.expiresAt,
                totalVotes,
            };
        }));
        return enriched;
    }
    async getActiveQuestion(sessionId) {
        const questions = await this.getActiveQuestions(sessionId);
        return questions.length > 0 ? questions[0] : null;
    }
    async getCurrentLeaderboard(sessionId) {
        let targetSessionId = sessionId;
        let sessionExists = await this.prisma.gameSession.findUnique({
            where: { id: sessionId },
        });
        if (!sessionExists) {
            const activeSession = await this.prisma.gameSession.findFirst({
                where: { isActive: true },
            });
            if (activeSession) {
                targetSessionId = activeSession.id;
            }
        }
        const topPlayers = await this.prisma.player.findMany({
            where: { sessionId: targetSessionId },
            orderBy: { totalPoints: 'desc' },
            take: 10,
        });
        for (const p of topPlayers) {
            await this.redisService.setPlayerScore(targetSessionId, p.id, p.totalPoints);
        }
        return topPlayers.map((p) => ({
            id: p.id,
            nickname: p.nickname,
            tableNumber: p.tableNumber,
            totalPoints: p.totalPoints,
            streakCount: p.streakCount,
        }));
    }
    async resolveQuestionExpress(questionId, correctOptionId) {
        const question = await this.prisma.liveQuestion.update({
            where: { id: questionId },
            data: { correctOptionId },
            include: { match: true },
        });
        if (!question)
            return { status: 'error', message: 'Pregunta no encontrada' };
        await this.prisma.prediction.updateMany({
            where: { questionId, chosenOptionId: correctOptionId },
            data: { status: 'HIT' },
        });
        await this.prisma.prediction.updateMany({
            where: { questionId, NOT: { chosenOptionId: correctOptionId } },
            data: { status: 'MISSED' },
        });
        const winners = await this.prisma.prediction.findMany({
            where: { questionId, chosenOptionId: correctOptionId },
            include: { player: true },
        });
        const losers = await this.prisma.prediction.findMany({
            where: { questionId, NOT: { chosenOptionId: correctOptionId } },
            include: { player: true },
        });
        const activeSession = await this.prisma.gameSession.findFirst({
            where: { isActive: true },
        });
        if (!activeSession)
            return { status: 'error', message: 'No hay sesión activa' };
        for (const ticket of winners) {
            const basePoints = question.pointsReward || 150;
            const bonusMultiplier = 1 + (ticket.player.streakCount * 0.1);
            const finalPoints = Math.round(basePoints * bonusMultiplier);
            const updatedPlayer = await this.prisma.player.update({
                where: { id: ticket.playerId },
                data: {
                    totalPoints: { increment: finalPoints },
                    streakCount: { increment: 1 },
                },
            });
            await this.redisService.setPlayerScore(activeSession.id, ticket.player.id, updatedPlayer.totalPoints);
        }
        const penaltyPoints = 100;
        for (const ticket of losers) {
            const updatedPlayer = await this.prisma.player.update({
                where: { id: ticket.playerId },
                data: {
                    totalPoints: { decrement: penaltyPoints },
                    streakCount: 0,
                },
            });
            await this.redisService.setPlayerScore(activeSession.id, ticket.player.id, updatedPlayer.totalPoints);
        }
        const enrichedLeaderboard = await this.getCurrentLeaderboard(activeSession.id);
        this.liveGateway.sendLeaderboardUpdate(activeSession.id, enrichedLeaderboard);
        this.liveGateway.broadcastQuestionResolved(activeSession.id);
        return {
            status: 'success',
            message: 'Trivia resuelta y Leaderboard transmitido en tiempo real.',
            winnersCount: winners.length,
            losersCount: losers.length,
            leaderboard: enrichedLeaderboard,
        };
    }
    async handleSportsWebhook(webhookDto) {
        const match = await this.prisma.match.findUnique({
            where: { apiFootballId: webhookDto.fixtureId },
        });
        if (!match || match.status !== 'LIVE')
            return { status: 'ignored', reason: 'Partido no activo' };
        switch (webhookDto.event) {
            case 'GOAL':
                const activeGoalQuestion = await this.prisma.liveQuestion.findFirst({
                    where: {
                        matchId: match.id,
                        questionText: { contains: 'próximo gol' },
                        correctOptionId: null
                    },
                });
                if (activeGoalQuestion) {
                    const correctOptionId = webhookDto.details.team === 'HOME' ? 1 : 2;
                    await this.resolveQuestionExpress(activeGoalQuestion.id, correctOptionId);
                }
                await this.prisma.match.update({
                    where: { id: match.id },
                    data: {
                        scoreHome: webhookDto.details.team === 'HOME' ? match.scoreHome + 1 : match.scoreHome,
                        scoreAway: webhookDto.details.team === 'AWAY' ? match.scoreAway + 1 : match.scoreAway,
                        currentMinute: webhookDto.details.minute
                    }
                });
                break;
            case 'PERIOD_END':
                const expiresAt = new Date();
                expiresAt.setMinutes(expiresAt.getMinutes() + 15);
                const halftimeQuestion = await this.prisma.liveQuestion.create({
                    data: {
                        matchId: match.id,
                        questionText: '¿Qué equipo mantendrá mayor posesión en el segundo tiempo?',
                        options: [{ id: 1, text: match.homeTeam }, { id: 2, text: match.awayTeam }],
                        expiresAt,
                        pointsReward: 200,
                    }
                });
                const activeSessions = await this.prisma.gameSession.findMany({ where: { isActive: true } });
                for (const session of activeSessions) {
                    this.liveGateway.broadcastNewQuestion(session.id, {
                        id: halftimeQuestion.id,
                        questionText: halftimeQuestion.questionText,
                        options: halftimeQuestion.options,
                        expiresAt: halftimeQuestion.expiresAt,
                    });
                }
                break;
            case 'MATCH_END':
                await this.prisma.match.update({
                    where: { id: match.id },
                    data: { status: 'FINISHED' }
                });
                const sessionsToClear = await this.prisma.gameSession.findMany({ where: { isActive: true } });
                for (const session of sessionsToClear) {
                    await this.redisService.clearLeaderboard(session.id);
                }
                break;
        }
        return { status: 'processed', event: webhookDto.event };
    }
    async getLiveMatch(sessionId) {
        const match = await this.prisma.match.findFirst({
            where: { status: 'LIVE' },
            orderBy: { startTime: 'desc' },
        });
        return match;
    }
    async updateMatchScore(dto) {
        const match = await this.prisma.match.update({
            where: { id: dto.matchId },
            data: {
                scoreHome: dto.scoreHome,
                scoreAway: dto.scoreAway,
                ...(dto.homeTeam && { homeTeam: dto.homeTeam }),
                ...(dto.awayTeam && { awayTeam: dto.awayTeam }),
                ...(dto.currentMinute !== undefined && { currentMinute: dto.currentMinute }),
                ...(dto.status && { status: dto.status }),
            },
        });
        const activeSessions = await this.prisma.gameSession.findMany({ where: { isActive: true } });
        for (const session of activeSessions) {
            this.liveGateway.sendMatchUpdate(session.id, {
                matchId: match.id,
                homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
                scoreHome: match.scoreHome,
                scoreAway: match.scoreAway,
                currentMinute: match.currentMinute,
                status: match.status,
            });
        }
        return match;
    }
    async updateLiveQuestion(questionId, dto) {
        const existing = await this.prisma.liveQuestion.findUnique({ where: { id: questionId } });
        if (!existing)
            throw new common_1.BadRequestException('Pregunta no encontrada');
        let updatedOptions = existing.options;
        if (dto.options && dto.options.length > 0) {
            updatedOptions = updatedOptions.map((opt) => {
                const patch = dto.options.find((o) => o.id === opt.id);
                return patch ? { ...opt, text: patch.text } : opt;
            });
        }
        const updated = await this.prisma.liveQuestion.update({
            where: { id: questionId },
            data: {
                ...(dto.questionText && { questionText: dto.questionText }),
                options: updatedOptions,
            },
        });
        const activeQuestions = await this.getActiveQuestions();
        const activeSessions = await this.prisma.gameSession.findMany({ where: { isActive: true } });
        for (const session of activeSessions) {
            this.server_broadcast_active(session.id, activeQuestions);
        }
        return updated;
    }
    server_broadcast_active(sessionId, questions) {
        this.liveGateway['server']?.to(`bar:${sessionId}`).emit('active_questions_list', questions);
        this.liveGateway['server']?.to(`bar:${sessionId}:tv`).emit('active_questions_list', questions);
    }
};
exports.MatchService = MatchService;
exports.MatchService = MatchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        live_gateway_1.LiveGateway,
        redis_service_1.RedisService])
], MatchService);
//# sourceMappingURL=match.service.js.map