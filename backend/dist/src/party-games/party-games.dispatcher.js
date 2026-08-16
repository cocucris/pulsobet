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
var PartyGamesDispatcher_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartyGamesDispatcher = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const live_gateway_1 = require("../live/live.gateway");
const party_games_events_1 = require("./party-games.events");
let PartyGamesDispatcher = PartyGamesDispatcher_1 = class PartyGamesDispatcher {
    liveGateway;
    logger = new common_1.Logger(PartyGamesDispatcher_1.name);
    constructor(liveGateway) {
        this.liveGateway = liveGateway;
    }
    handlePartyRoundStarted(event) {
        try {
            this.logger.log(`[PartyDispatcher] PARTY_ROUND_STARTED → sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_ROUND_STARTED', {
                round: event.round,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handlePartyRoundStarted: ${e.message}`);
        }
    }
    handlePartyPhaseChanged(event) {
        try {
            this.logger.log(`[PartyDispatcher] PARTY_PHASE_CHANGED (${event.phase}) → sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_PHASE_CHANGED', {
                roundId: event.roundId,
                phase: event.phase,
                payload: event.payload,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handlePartyPhaseChanged: ${e.message}`);
        }
    }
    handlePartyInputSubmitted(event) {
        try {
            this.logger.log(`[PartyDispatcher] PARTY_INPUT_PROGRESS (${event.submittedCount}/${event.totalPlayers}) → sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_INPUT_PROGRESS', {
                roundId: event.roundId,
                submittedCount: event.submittedCount,
                totalPlayers: event.totalPlayers,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handlePartyInputSubmitted: ${e.message}`);
        }
    }
    handlePartyVoteCast(event) {
        try {
            this.logger.log(`[PartyDispatcher] PARTY_VOTE_UPDATED → sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_VOTE_UPDATED', {
                roundId: event.roundId,
                votes: event.votes,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handlePartyVoteCast: ${e.message}`);
        }
    }
    handlePartyRoundResult(event) {
        try {
            this.logger.log(`[PartyDispatcher] PARTY_ROUND_RESULT → sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_ROUND_RESULT', {
                roundId: event.roundId,
                results: event.results,
                leaderboard: event.leaderboard,
                eventNumber: event.eventNumber,
            });
            this.liveGateway.broadcastToSession(event.sessionId, 'leaderboard_update', event.leaderboard);
        }
        catch (e) {
            this.logger.error(`Error en handlePartyRoundResult: ${e.message}`);
        }
    }
    handlePartyRoundFinished(event) {
        try {
            this.logger.log(`[PartyDispatcher] PARTY_ROUND_FINISHED → sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_ROUND_FINISHED', {
                roundId: event.roundId,
                leaderboard: event.leaderboard,
                eventNumber: event.eventNumber,
            });
            if (event.leaderboard && event.leaderboard.length > 0) {
                this.liveGateway.broadcastToSession(event.sessionId, 'leaderboard_update', event.leaderboard);
            }
        }
        catch (e) {
            this.logger.error(`Error en handlePartyRoundFinished: ${e.message}`);
        }
    }
    handlePartyBastaCalled(event) {
        try {
            this.logger.log(`[PartyDispatcher] PARTY_BASTA_CALLED (${event.nickname}) → sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_BASTA_CALLED', {
                roundId: event.roundId,
                playerId: event.playerId,
                nickname: event.nickname,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handlePartyBastaCalled: ${e.message}`);
        }
    }
    handlePartyGameOver(event) {
        try {
            this.logger.log(`[PartyDispatcher] PARTY_GAME_OVER → sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_GAME_OVER', {
                gameType: event.gameType,
                leaderboard: event.finalLeaderboard,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handlePartyGameOver: ${e.message}`);
        }
    }
};
exports.PartyGamesDispatcher = PartyGamesDispatcher;
__decorate([
    (0, event_emitter_1.OnEvent)('party.round.started'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [party_games_events_1.PartyRoundStartedEvent]),
    __metadata("design:returntype", void 0)
], PartyGamesDispatcher.prototype, "handlePartyRoundStarted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('party.phase.changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [party_games_events_1.PartyPhaseChangedEvent]),
    __metadata("design:returntype", void 0)
], PartyGamesDispatcher.prototype, "handlePartyPhaseChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)('party.input.submitted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [party_games_events_1.PartyInputSubmittedEvent]),
    __metadata("design:returntype", void 0)
], PartyGamesDispatcher.prototype, "handlePartyInputSubmitted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('party.vote.cast'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [party_games_events_1.PartyVoteCastEvent]),
    __metadata("design:returntype", void 0)
], PartyGamesDispatcher.prototype, "handlePartyVoteCast", null);
__decorate([
    (0, event_emitter_1.OnEvent)('party.round.result'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [party_games_events_1.PartyRoundResultEvent]),
    __metadata("design:returntype", void 0)
], PartyGamesDispatcher.prototype, "handlePartyRoundResult", null);
__decorate([
    (0, event_emitter_1.OnEvent)('party.round.finished'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [party_games_events_1.PartyRoundFinishedEvent]),
    __metadata("design:returntype", void 0)
], PartyGamesDispatcher.prototype, "handlePartyRoundFinished", null);
__decorate([
    (0, event_emitter_1.OnEvent)('party.basta.called'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [party_games_events_1.PartyBastaCalledEvent]),
    __metadata("design:returntype", void 0)
], PartyGamesDispatcher.prototype, "handlePartyBastaCalled", null);
__decorate([
    (0, event_emitter_1.OnEvent)('party.game.over'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [party_games_events_1.PartyGameOverEvent]),
    __metadata("design:returntype", void 0)
], PartyGamesDispatcher.prototype, "handlePartyGameOver", null);
exports.PartyGamesDispatcher = PartyGamesDispatcher = PartyGamesDispatcher_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => live_gateway_1.LiveGateway))),
    __metadata("design:paramtypes", [live_gateway_1.LiveGateway])
], PartyGamesDispatcher);
//# sourceMappingURL=party-games.dispatcher.js.map