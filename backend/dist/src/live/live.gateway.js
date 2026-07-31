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
const session_engine_1 = require("../session/session.engine");
let LiveGateway = LiveGateway_1 = class LiveGateway {
    prisma;
    redisService;
    sessionEngine;
    server;
    logger = new common_1.Logger(LiveGateway_1.name);
    constructor(prisma, redisService, sessionEngine) {
        this.prisma = prisma;
        this.redisService = redisService;
        this.sessionEngine = sessionEngine;
    }
    handleConnection(client) {
        this.logger.log(`Cliente conectado: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Cliente desconectado: ${client.id}`);
    }
    broadcastToSession(sessionId, event, payload) {
        this.server.to(`bar:${sessionId}`).emit(event, payload);
        this.server.to(`bar:${sessionId}:tv`).emit(event, payload);
    }
    handlePing(client) {
        client.emit('PONG', { serverTime: new Date().toISOString() });
    }
    async handleJoinSession(client, data) {
        const roomName = `bar:${data.sessionId}`;
        client.join(roomName);
        if (data.type === 'tv') {
            client.join(`${roomName}:tv`);
        }
        this.logger.log(`Cliente [${data.type}] se unió a la sala: ${roomName}`);
        try {
            const snapshot = await this.sessionEngine.buildSnapshot(data.sessionId, data.playerId);
            client.emit('SNAPSHOT', snapshot);
        }
        catch (err) {
            this.logger.warn(`Error al construir snapshot para ${data.sessionId}:`, err);
        }
        if (data.type === 'player' && data.nickname) {
            this.broadcastToSession(data.sessionId, 'player_joined', { nickname: data.nickname });
        }
        return { status: 'success', message: `Unido a la sala ${roomName}` };
    }
    async handleJoinBar(client, data) {
        return this.handleJoinSession(client, {
            sessionId: data.sessionId,
            type: 'player',
            nickname: data.nickname,
        });
    }
    async handleJoinTv(client, data) {
        return this.handleJoinSession(client, {
            sessionId: data.sessionId,
            type: 'tv',
        });
    }
    async handlePrediction(client, data) {
        const user = client.user;
        if (!user?.sub || !user?.sessionId || !data?.questionId || data?.chosenOptionId === undefined) {
            client.emit('VOTE_REJECTED', { questionId: data?.questionId, reason: 'Datos de voto incompletos.' });
            return { status: 'rejected' };
        }
        try {
            const result = await this.sessionEngine.submitVote(user.sessionId, user.sub, data.questionId, data.chosenOptionId);
            if (result?.accepted) {
                client.emit('VOTE_ACCEPTED', { questionId: data.questionId });
                return { status: 'received', playerId: user.sub };
            }
            client.emit('VOTE_REJECTED', { questionId: data.questionId, reason: result?.reason || 'Voto rechazado.' });
            return { status: 'rejected', reason: result?.reason };
        }
        catch (err) {
            this.logger.error(`Error procesando voto de ${user.sub}: ${err.message}`);
            client.emit('VOTE_REJECTED', { questionId: data.questionId, reason: 'Error interno al registrar el voto.' });
            return { status: 'error' };
        }
    }
    sendLeaderboardUpdate(sessionId, topPlayers) {
        this.broadcastToSession(sessionId, 'leaderboard_update', topPlayers);
    }
    sendMatchUpdate(sessionId, matchData) {
        this.broadcastToSession(sessionId, 'match_score_update', matchData);
    }
    async broadcastNewQuestion(sessionId, question) {
        this.broadcastToSession(sessionId, 'new_question_active', question);
    }
    async broadcastQuestionResolved(sessionId) {
        this.broadcastToSession(sessionId, 'question_resolved', {});
    }
};
exports.LiveGateway = LiveGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], LiveGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('PING'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], LiveGateway.prototype, "handlePing", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('JOIN_SESSION'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], LiveGateway.prototype, "handleJoinSession", null);
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
        pingInterval: 10000,
        pingTimeout: 30000,
        transports: ['websocket', 'polling'],
    }),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => session_engine_1.SessionEngine))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        session_engine_1.SessionEngine])
], LiveGateway);
//# sourceMappingURL=live.gateway.js.map