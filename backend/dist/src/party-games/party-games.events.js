"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartyGameOverEvent = exports.PartyRoundFinishedEvent = exports.PartyRoundResultEvent = exports.PartyVoteCastEvent = exports.PartyInputSubmittedEvent = exports.PartyBastaCalledEvent = exports.PartyPhaseChangedEvent = exports.PartyRoundStartedEvent = void 0;
class PartyRoundStartedEvent {
    sessionId;
    round;
    eventNumber;
    constructor(sessionId, round, eventNumber) {
        this.sessionId = sessionId;
        this.round = round;
        this.eventNumber = eventNumber;
    }
}
exports.PartyRoundStartedEvent = PartyRoundStartedEvent;
class PartyPhaseChangedEvent {
    sessionId;
    roundId;
    phase;
    payload;
    eventNumber;
    constructor(sessionId, roundId, phase, payload, eventNumber) {
        this.sessionId = sessionId;
        this.roundId = roundId;
        this.phase = phase;
        this.payload = payload;
        this.eventNumber = eventNumber;
    }
}
exports.PartyPhaseChangedEvent = PartyPhaseChangedEvent;
class PartyBastaCalledEvent {
    sessionId;
    roundId;
    playerId;
    nickname;
    eventNumber;
    constructor(sessionId, roundId, playerId, nickname, eventNumber) {
        this.sessionId = sessionId;
        this.roundId = roundId;
        this.playerId = playerId;
        this.nickname = nickname;
        this.eventNumber = eventNumber;
    }
}
exports.PartyBastaCalledEvent = PartyBastaCalledEvent;
class PartyInputSubmittedEvent {
    sessionId;
    roundId;
    submittedCount;
    totalPlayers;
    eventNumber;
    constructor(sessionId, roundId, submittedCount, totalPlayers, eventNumber) {
        this.sessionId = sessionId;
        this.roundId = roundId;
        this.submittedCount = submittedCount;
        this.totalPlayers = totalPlayers;
        this.eventNumber = eventNumber;
    }
}
exports.PartyInputSubmittedEvent = PartyInputSubmittedEvent;
class PartyVoteCastEvent {
    sessionId;
    roundId;
    votes;
    eventNumber;
    constructor(sessionId, roundId, votes, eventNumber) {
        this.sessionId = sessionId;
        this.roundId = roundId;
        this.votes = votes;
        this.eventNumber = eventNumber;
    }
}
exports.PartyVoteCastEvent = PartyVoteCastEvent;
class PartyRoundResultEvent {
    sessionId;
    roundId;
    results;
    leaderboard;
    eventNumber;
    constructor(sessionId, roundId, results, leaderboard, eventNumber) {
        this.sessionId = sessionId;
        this.roundId = roundId;
        this.results = results;
        this.leaderboard = leaderboard;
        this.eventNumber = eventNumber;
    }
}
exports.PartyRoundResultEvent = PartyRoundResultEvent;
class PartyRoundFinishedEvent {
    sessionId;
    roundId;
    eventNumber;
    constructor(sessionId, roundId, eventNumber) {
        this.sessionId = sessionId;
        this.roundId = roundId;
        this.eventNumber = eventNumber;
    }
}
exports.PartyRoundFinishedEvent = PartyRoundFinishedEvent;
class PartyGameOverEvent {
    sessionId;
    gameType;
    finalLeaderboard;
    eventNumber;
    constructor(sessionId, gameType, finalLeaderboard, eventNumber) {
        this.sessionId = sessionId;
        this.gameType = gameType;
        this.finalLeaderboard = finalLeaderboard;
        this.eventNumber = eventNumber;
    }
}
exports.PartyGameOverEvent = PartyGameOverEvent;
//# sourceMappingURL=party-games.events.js.map