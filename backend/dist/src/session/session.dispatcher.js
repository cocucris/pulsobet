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
var SocketDispatcher_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketDispatcher = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const live_gateway_1 = require("../live/live.gateway");
const session_events_1 = require("./session.events");
let SocketDispatcher = SocketDispatcher_1 = class SocketDispatcher {
    liveGateway;
    logger = new common_1.Logger(SocketDispatcher_1.name);
    constructor(liveGateway) {
        this.liveGateway = liveGateway;
    }
    handleMatchScoreUpdated(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast MATCH_SCORE_UPDATED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'MATCH_SCORE_UPDATED', {
                scoreHome: event.scoreHome,
                scoreAway: event.scoreAway,
                homeTeam: event.homeTeam,
                awayTeam: event.awayTeam,
                status: event.status,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handleMatchScoreUpdated: ${e.message}`);
        }
    }
    handleMatchStarted(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast MATCH_STARTED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'MATCH_STARTED', {
                ...event.match,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handleMatchStarted: ${e.message}`);
        }
    }
    handleMatchFinished(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast MATCH_FINISHED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'MATCH_FINISHED', {
                ...event.match,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handleMatchFinished: ${e.message}`);
        }
    }
    handleTriviaOpened(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast TRIVIA_OPENED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'TRIVIA_OPENED', {
                trivia: event.trivia,
                eventNumber: event.eventNumber,
            });
            this.liveGateway.broadcastToSession(event.sessionId, 'new_question_active', event.trivia);
        }
        catch (e) {
            this.logger.error(`Error en handleTriviaOpened: ${e.message}`);
        }
    }
    handleTriviaClosed(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast TRIVIA_CLOSED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'TRIVIA_CLOSED', {
                triviaId: event.triviaId,
                trivia: event.trivia,
                eventNumber: event.eventNumber,
            });
            this.liveGateway.broadcastToSession(event.sessionId, 'question_resolved', { triviaId: event.triviaId });
        }
        catch (e) {
            this.logger.error(`Error en handleTriviaClosed: ${e.message}`);
        }
    }
    handleTriviaResult(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast TRIVIA_RESULT a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'TRIVIA_RESULT', {
                triviaId: event.triviaId,
                correctOptionId: event.correctOptionId,
                winnersCount: event.winnersCount,
                leaderboard: event.leaderboard,
                trivia: event.trivia,
                eventNumber: event.eventNumber,
            });
            this.liveGateway.broadcastToSession(event.sessionId, 'leaderboard_update', event.leaderboard);
        }
        catch (e) {
            this.logger.error(`Error en handleTriviaResult: ${e.message}`);
        }
    }
    handlePlayerJoined(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast PLAYER_JOINED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'PLAYER_JOINED', {
                player: event.player,
                eventNumber: event.eventNumber,
            });
            this.liveGateway.broadcastToSession(event.sessionId, 'player_joined', { nickname: event.player.nickname });
        }
        catch (e) {
            this.logger.error(`Error en handlePlayerJoined: ${e.message}`);
        }
    }
    handlePlayerVoted(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast PLAYER_VOTED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'PLAYER_VOTED', {
                triviaId: event.triviaId,
                options: event.options,
                totalVotes: event.totalVotes,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handlePlayerVoted: ${e.message}`);
        }
    }
    handleLeaderboardUpdated(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast LEADERBOARD_UPDATED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'LEADERBOARD_UPDATED', {
                leaderboard: event.leaderboard,
                eventNumber: event.eventNumber,
            });
            this.liveGateway.broadcastToSession(event.sessionId, 'leaderboard_update', event.leaderboard);
        }
        catch (e) {
            this.logger.error(`Error en handleLeaderboardUpdated: ${e.message}`);
        }
    }
    handleRewardReserved(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast REWARD_RESERVED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'REWARD_RESERVED', {
                claimCode: event.claimCode,
                rewardTitle: event.rewardTitle,
                playerNickname: event.playerNickname,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handleRewardReserved: ${e.message}`);
        }
    }
    handleRewardDelivered(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast REWARD_DELIVERED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'REWARD_DELIVERED', {
                claimCode: event.claimCode,
                rewardTitle: event.rewardTitle,
                playerNickname: event.playerNickname,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handleRewardDelivered: ${e.message}`);
        }
    }
    handleSessionReset(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast SESSION_RESET a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'SESSION_RESET', {
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handleSessionReset: ${e.message}`);
        }
    }
    handleCardSubmitted(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast CARD_SUBMITTED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'CARD_SUBMITTED', {
                card: event.card,
                pendingCount: event.pendingCount,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handleCardSubmitted: ${e.message}`);
        }
    }
    handleCardPublished(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast CARD_PUBLISHED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'CARD_PUBLISHED', {
                card: event.card,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handleCardPublished: ${e.message}`);
        }
    }
    handleCardVoteUpdated(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast CARD_VOTE_UPDATED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'CARD_VOTE_UPDATED', {
                cardId: event.cardId,
                counts: event.counts,
                totalVotes: event.totalVotes,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handleCardVoteUpdated: ${e.message}`);
        }
    }
    handleCardClosed(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast CARD_CLOSED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'CARD_CLOSED', {
                cardId: event.cardId,
                card: event.card,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handleCardClosed: ${e.message}`);
        }
    }
    handleSessionModeChanged(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast SESSION_MODE_CHANGED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'SESSION_MODE_CHANGED', {
                mode: event.mode,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handleSessionModeChanged: ${e.message}`);
        }
    }
    handleVotingClosed(event) {
        try {
            this.logger.log(`[Dispatcher] Broadcast VOTING_CLOSED a sesión ${event.sessionId}`);
            this.liveGateway.broadcastToSession(event.sessionId, 'VOTING_CLOSED', {
                results: event.results,
                eventNumber: event.eventNumber,
            });
        }
        catch (e) {
            this.logger.error(`Error en handleVotingClosed: ${e.message}`);
        }
    }
};
exports.SocketDispatcher = SocketDispatcher;
__decorate([
    (0, event_emitter_1.OnEvent)('match.score.updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.MatchScoreUpdatedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleMatchScoreUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('match.started'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.MatchStartedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleMatchStarted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('match.finished'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.MatchFinishedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleMatchFinished", null);
__decorate([
    (0, event_emitter_1.OnEvent)('trivia.opened'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.TriviaOpenedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleTriviaOpened", null);
__decorate([
    (0, event_emitter_1.OnEvent)('trivia.closed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.TriviaClosedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleTriviaClosed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('trivia.result'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.TriviaResultEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleTriviaResult", null);
__decorate([
    (0, event_emitter_1.OnEvent)('player.joined'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.PlayerJoinedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handlePlayerJoined", null);
__decorate([
    (0, event_emitter_1.OnEvent)('player.voted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.PlayerVotedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handlePlayerVoted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('leaderboard.updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.LeaderboardUpdatedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleLeaderboardUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('reward.reserved'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.RewardReservedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleRewardReserved", null);
__decorate([
    (0, event_emitter_1.OnEvent)('reward.delivered'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.RewardDeliveredEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleRewardDelivered", null);
__decorate([
    (0, event_emitter_1.OnEvent)('session.reset'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.SessionResetEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleSessionReset", null);
__decorate([
    (0, event_emitter_1.OnEvent)('card.submitted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.CardSubmittedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleCardSubmitted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('card.published'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.CardPublishedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleCardPublished", null);
__decorate([
    (0, event_emitter_1.OnEvent)('card.vote.updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.CardVoteUpdatedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleCardVoteUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('card.closed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.CardClosedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleCardClosed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('session.mode.changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.SessionModeChangedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleSessionModeChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)('voting.closed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_events_1.VotingClosedEvent]),
    __metadata("design:returntype", void 0)
], SocketDispatcher.prototype, "handleVotingClosed", null);
exports.SocketDispatcher = SocketDispatcher = SocketDispatcher_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [live_gateway_1.LiveGateway])
], SocketDispatcher);
//# sourceMappingURL=session.dispatcher.js.map