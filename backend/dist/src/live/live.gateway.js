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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LiveGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const ws_jwt_guard_1 = require("../auth/ws-jwt.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
let LiveGateway = LiveGateway_1 = class LiveGateway {
    prisma;
    redisService;
    server;
    logger = new common_1.Logger(LiveGateway_1.name);
    constructor(prisma, redisService) {
        this.prisma = prisma;
        this.redisService = redisService;
    }
    handleConnection(client) {
        this.logger.log(`Cliente conectado: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Cliente desconectado: ${client.id}`);
    }
    async getLeaderboardForSession(sessionId) {
        let targetSessionId = sessionId;
        let session = await this.prisma.gameSession.findUnique({
            where: { id: sessionId },
        });
        if (!session) {
            session = await this.prisma.gameSession.findFirst({
                where: { isActive: true },
            });
            if (session)
                targetSessionId = session.id;
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
    async getActiveQuestionsForSession() {
        const questions = await this.prisma.liveQuestion.findMany({
            where: {
                correctOptionId: null,
            },
            orderBy: { expiresAt: 'desc' },
        });
        const enriched = await Promise.all(questions.map(async (q) => {
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
    async handleJoinBar(client, data) {
        const roomName = `bar:${data.sessionId}`;
        client.join(roomName);
        this.logger.log(`Jugador [${data.nickname}] se unió a la sala: ${roomName}`);
        this.server.to(roomName).emit('player_joined', { nickname: data.nickname });
        const leaderboard = await this.getLeaderboardForSession(data.sessionId);
        client.emit('leaderboard_update', leaderboard);
        this.server.to(`bar:${data.sessionId}:tv`).emit('leaderboard_update', leaderboard);
        const activeQuestions = await this.getActiveQuestionsForSession();
        client.emit('active_questions_list', activeQuestions);
        if (activeQuestions.length > 0) {
            client.emit('new_question_active', activeQuestions[0]);
        }
        return { status: 'success', message: `Unido a la sala ${roomName}` };
    }
    async handleJoinTv(client, data) {
        const roomName = `bar:${data.sessionId}:tv`;
        client.join(roomName);
        this.logger.log(`Pantalla de TV vinculada a la sala: ${roomName}`);
        const leaderboard = await this.getLeaderboardForSession(data.sessionId);
        client.emit('leaderboard_update', leaderboard);
        const activeQuestions = await this.getActiveQuestionsForSession();
        client.emit('active_questions_list', activeQuestions);
        if (activeQuestions.length > 0) {
            client.emit('new_question_active', activeQuestions[0]);
        }
        return { status: 'success', message: `TV vinculada a la sala ${roomName}` };
    }
    async handlePrediction(client, data) {
        const user = client.user;
        this.logger.log(`Predicción segura recibida del Jugador ${user?.sub} en la sesión ${user?.sessionId}`);
        if (user?.sub && data.questionId && data.chosenOptionId !== undefined) {
            try {
                const optionIdNum = Number(data.chosenOptionId);
                const existing = await this.prisma.prediction.findFirst({
                    where: { playerId: user.sub, questionId: data.questionId },
                });
                if (existing) {
                    await this.prisma.prediction.update({
                        where: { id: existing.id },
                        data: { chosenOptionId: optionIdNum },
                    });
                    this.logger.log(`Predicción actualizada en DB para Jugador ${user.sub}`);
                }
                else {
                    await this.prisma.prediction.create({
                        data: {
                            playerId: user.sub,
                            questionId: data.questionId,
                            chosenOptionId: optionIdNum,
                            status: 'PENDING',
                        },
                    });
                    this.logger.log(`Predicción guardada en DB para Jugador ${user.sub}`);
                }
                const activeQuestions = await this.getActiveQuestionsForSession();
                if (user?.sessionId) {
                    this.server.to(`bar:${user.sessionId}`).emit('active_questions_list', activeQuestions);
                    this.server.to(`bar:${user.sessionId}:tv`).emit('active_questions_list', activeQuestions);
                }
                this.server.emit('active_questions_list', activeQuestions);
            }
            catch (err) {
                this.logger.error('Error al guardar la predicción en DB:', err);
            }
        }
        return { status: 'received', playerId: user?.sub };
    }
    sendLeaderboardUpdate(sessionId, topPlayers) {
        this.server.to(`bar:${sessionId}`).emit('leaderboard_update', topPlayers);
        this.server.to(`bar:${sessionId}:tv`).emit('leaderboard_update', topPlayers);
        this.server.emit('leaderboard_update', topPlayers);
    }
    sendMatchUpdate(sessionId, matchData) {
        this.server.to(`bar:${sessionId}`).emit('match_score_update', matchData);
        this.server.to(`bar:${sessionId}:tv`).emit('match_score_update', matchData);
        this.server.emit('match_score_update', matchData);
    }
    async broadcastNewQuestion(sessionId, question) {
        this.server.to(`bar:${sessionId}`).emit('new_question_active', question);
        this.server.to(`bar:${sessionId}:tv`).emit('new_question_active', question);
        this.server.emit('new_question_active', question);
        const activeQuestions = await this.getActiveQuestionsForSession();
        this.server.to(`bar:${sessionId}`).emit('active_questions_list', activeQuestions);
        this.server.to(`bar:${sessionId}:tv`).emit('active_questions_list', activeQuestions);
        this.server.emit('active_questions_list', activeQuestions);
    }
    async broadcastQuestionResolved(sessionId) {
        const activeQuestions = await this.getActiveQuestionsForSession();
        this.server.to(`bar:${sessionId}`).emit('active_questions_list', activeQuestions);
        this.server.to(`bar:${sessionId}:tv`).emit('active_questions_list', activeQuestions);
        this.server.emit('active_questions_list', activeQuestions);
        if (activeQuestions.length === 0) {
            this.server.to(`bar:${sessionId}`).emit('question_resolved');
            this.server.to(`bar:${sessionId}:tv`).emit('question_resolved');
            this.server.emit('question_resolved');
        }
        else {
            this.server.to(`bar:${sessionId}`).emit('new_question_active', activeQuestions[0]);
            this.server.to(`bar:${sessionId}:tv`).emit('new_question_active', activeQuestions[0]);
            this.server.emit('new_question_active', activeQuestions[0]);
        }
    }
};
exports.LiveGateway = LiveGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], LiveGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_bar_session'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], LiveGateway.prototype, "handleJoinBar", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_tv_screen'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], LiveGateway.prototype, "handleJoinTv", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)('submit_prediction'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], LiveGateway.prototype, "handlePrediction", null);
exports.LiveGateway = LiveGateway = LiveGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: true,
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], LiveGateway);
//# sourceMappingURL=live.gateway.js.map