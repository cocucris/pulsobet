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
var PartyGamesGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartyGamesGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const ws_jwt_guard_1 = require("../auth/ws-jwt.guard");
const party_games_service_1 = require("./party-games.service");
const submit_input_dto_1 = require("./dto/submit-input.dto");
const basta_dto_1 = require("./dto/basta.dto");
const cast_vote_dto_1 = require("./dto/cast-vote.dto");
const create_round_dto_1 = require("./dto/create-round.dto");
let PartyGamesGateway = PartyGamesGateway_1 = class PartyGamesGateway {
    partyGamesService;
    logger = new common_1.Logger(PartyGamesGateway_1.name);
    constructor(partyGamesService) {
        this.partyGamesService = partyGamesService;
    }
    async handleSubmitInput(client, data) {
        const user = client.user;
        if (!user?.sub || !user?.sessionId) {
            client.emit('PARTY_INPUT_REJECTED', { reason: 'Token inválido o expirado.' });
            return { status: 'rejected' };
        }
        try {
            const result = await this.partyGamesService.submitInput(user.sub, user.sessionId, data);
            client.emit('PARTY_INPUT_ACCEPTED', { roundId: data.roundId });
            return { status: 'accepted', ...result };
        }
        catch (err) {
            this.logger.warn(`Error en PARTY_SUBMIT_INPUT: ${err.message}`);
            client.emit('PARTY_INPUT_REJECTED', { roundId: data.roundId, reason: err.message });
            return { status: 'rejected', reason: err.message };
        }
    }
    async handleBasta(client, data) {
        const user = client.user;
        if (!user?.sub || !user?.sessionId) {
            client.emit('PARTY_BASTA_REJECTED', { reason: 'Token inválido o expirado.' });
            return { status: 'rejected' };
        }
        try {
            const result = await this.partyGamesService.submitBasta(user.sub, user.sessionId, data);
            client.emit('PARTY_BASTA_ACCEPTED', { roundId: data.roundId, isBasta: result.isBasta });
            return { status: 'accepted', ...result };
        }
        catch (err) {
            this.logger.warn(`Error en PARTY_BASTA: ${err.message}`);
            client.emit('PARTY_BASTA_REJECTED', { roundId: data.roundId, reason: err.message });
            return { status: 'rejected', reason: err.message };
        }
    }
    async handleCastVote(client, data) {
        const user = client.user;
        if (!user?.sub) {
            client.emit('PARTY_VOTE_REJECTED', { reason: 'Token inválido o expirado.' });
            return { status: 'rejected' };
        }
        try {
            await this.partyGamesService.castVote(user.sub, data);
            client.emit('PARTY_VOTE_ACCEPTED', { roundId: data.roundId });
            return { status: 'accepted' };
        }
        catch (err) {
            this.logger.warn(`Error en PARTY_CAST_VOTE: ${err.message}`);
            client.emit('PARTY_VOTE_REJECTED', { roundId: data.roundId, reason: err.message });
            return { status: 'rejected', reason: err.message };
        }
    }
    async handleAdminStartRound(client, data) {
        try {
            const round = await this.partyGamesService.createRound(data);
            return { status: 'ok', round };
        }
        catch (err) {
            this.logger.warn(`Error en PARTY_ADMIN_START_ROUND: ${err.message}`);
            return { status: 'error', reason: err.message };
        }
    }
    async handleAdminStartCountdown(client, data) {
        try {
            await this.partyGamesService.startCountdown(data.roundId);
            return { status: 'ok' };
        }
        catch (err) {
            this.logger.warn(`Error en PARTY_ADMIN_START_COUNTDOWN: ${err.message}`);
            return { status: 'error', reason: err.message };
        }
    }
    async handleAdminNextPhase(client, data) {
        try {
            await this.partyGamesService.advancePhase(data.roundId);
            return { status: 'ok' };
        }
        catch (err) {
            this.logger.warn(`Error en PARTY_ADMIN_NEXT_PHASE: ${err.message}`);
            return { status: 'error', reason: err.message };
        }
    }
    async handleAdminEndRound(client, data) {
        try {
            await this.partyGamesService.endRound(data.roundId);
            return { status: 'ok' };
        }
        catch (err) {
            this.logger.warn(`Error en PARTY_ADMIN_END_ROUND: ${err.message}`);
            return { status: 'error', reason: err.message };
        }
    }
};
exports.PartyGamesGateway = PartyGamesGateway;
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)('PARTY_SUBMIT_INPUT'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket,
        submit_input_dto_1.SubmitPartyInputDto]),
    __metadata("design:returntype", Promise)
], PartyGamesGateway.prototype, "handleSubmitInput", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)('PARTY_BASTA'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket,
        basta_dto_1.BastaDto]),
    __metadata("design:returntype", Promise)
], PartyGamesGateway.prototype, "handleBasta", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)('PARTY_CAST_VOTE'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket,
        cast_vote_dto_1.CastPartyVoteDto]),
    __metadata("design:returntype", Promise)
], PartyGamesGateway.prototype, "handleCastVote", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('PARTY_ADMIN_START_ROUND'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket,
        create_round_dto_1.CreatePartyRoundDto]),
    __metadata("design:returntype", Promise)
], PartyGamesGateway.prototype, "handleAdminStartRound", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('PARTY_ADMIN_START_COUNTDOWN'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], PartyGamesGateway.prototype, "handleAdminStartCountdown", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('PARTY_ADMIN_NEXT_PHASE'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], PartyGamesGateway.prototype, "handleAdminNextPhase", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('PARTY_ADMIN_END_ROUND'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], PartyGamesGateway.prototype, "handleAdminEndRound", null);
exports.PartyGamesGateway = PartyGamesGateway = PartyGamesGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: true, credentials: true },
        pingInterval: 10000,
        pingTimeout: 30000,
        transports: ['websocket', 'polling'],
    }),
    __metadata("design:paramtypes", [party_games_service_1.PartyGamesService])
], PartyGamesGateway);
//# sourceMappingURL=party-games.gateway.js.map