"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchFinishedEvent = exports.SessionModeChangedEvent = exports.CardClosedEvent = exports.CardVoteUpdatedEvent = exports.CardPublishedEvent = exports.CardSubmittedEvent = exports.SessionResetEvent = exports.MatchStartedEvent = exports.RewardDeliveredEvent = exports.RewardReservedEvent = exports.LeaderboardUpdatedEvent = exports.PlayerVotedEvent = exports.PlayerJoinedEvent = exports.TriviaResultEvent = exports.TriviaClosedEvent = exports.TriviaOpenedEvent = exports.TriviaCreatedEvent = exports.MatchScoreUpdatedEvent = void 0;
class MatchScoreUpdatedEvent {
    sessionId;
    scoreHome;
    scoreAway;
    homeTeam;
    awayTeam;
    status;
    eventNumber;
    constructor(sessionId, scoreHome, scoreAway, homeTeam, awayTeam, status, eventNumber) {
        this.sessionId = sessionId;
        this.scoreHome = scoreHome;
        this.scoreAway = scoreAway;
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.status = status;
        this.eventNumber = eventNumber;
    }
}
exports.MatchScoreUpdatedEvent = MatchScoreUpdatedEvent;
class TriviaCreatedEvent {
    sessionId;
    trivia;
    eventNumber;
    constructor(sessionId, trivia, eventNumber) {
        this.sessionId = sessionId;
        this.trivia = trivia;
        this.eventNumber = eventNumber;
    }
}
exports.TriviaCreatedEvent = TriviaCreatedEvent;
class TriviaOpenedEvent {
    sessionId;
    trivia;
    eventNumber;
    constructor(sessionId, trivia, eventNumber) {
        this.sessionId = sessionId;
        this.trivia = trivia;
        this.eventNumber = eventNumber;
    }
}
exports.TriviaOpenedEvent = TriviaOpenedEvent;
class TriviaClosedEvent {
    sessionId;
    triviaId;
    eventNumber;
    trivia;
    constructor(sessionId, triviaId, eventNumber, trivia) {
        this.sessionId = sessionId;
        this.triviaId = triviaId;
        this.eventNumber = eventNumber;
        this.trivia = trivia;
    }
}
exports.TriviaClosedEvent = TriviaClosedEvent;
class TriviaResultEvent {
    sessionId;
    triviaId;
    correctOptionId;
    winnersCount;
    leaderboard;
    eventNumber;
    trivia;
    constructor(sessionId, triviaId, correctOptionId, winnersCount, leaderboard, eventNumber, trivia) {
        this.sessionId = sessionId;
        this.triviaId = triviaId;
        this.correctOptionId = correctOptionId;
        this.winnersCount = winnersCount;
        this.leaderboard = leaderboard;
        this.eventNumber = eventNumber;
        this.trivia = trivia;
    }
}
exports.TriviaResultEvent = TriviaResultEvent;
class PlayerJoinedEvent {
    sessionId;
    player;
    eventNumber;
    constructor(sessionId, player, eventNumber) {
        this.sessionId = sessionId;
        this.player = player;
        this.eventNumber = eventNumber;
    }
}
exports.PlayerJoinedEvent = PlayerJoinedEvent;
class PlayerVotedEvent {
    sessionId;
    triviaId;
    options;
    totalVotes;
    eventNumber;
    constructor(sessionId, triviaId, options, totalVotes, eventNumber) {
        this.sessionId = sessionId;
        this.triviaId = triviaId;
        this.options = options;
        this.totalVotes = totalVotes;
        this.eventNumber = eventNumber;
    }
}
exports.PlayerVotedEvent = PlayerVotedEvent;
class LeaderboardUpdatedEvent {
    sessionId;
    leaderboard;
    eventNumber;
    constructor(sessionId, leaderboard, eventNumber) {
        this.sessionId = sessionId;
        this.leaderboard = leaderboard;
        this.eventNumber = eventNumber;
    }
}
exports.LeaderboardUpdatedEvent = LeaderboardUpdatedEvent;
class RewardReservedEvent {
    sessionId;
    claimCode;
    rewardTitle;
    playerNickname;
    eventNumber;
    constructor(sessionId, claimCode, rewardTitle, playerNickname, eventNumber) {
        this.sessionId = sessionId;
        this.claimCode = claimCode;
        this.rewardTitle = rewardTitle;
        this.playerNickname = playerNickname;
        this.eventNumber = eventNumber;
    }
}
exports.RewardReservedEvent = RewardReservedEvent;
class RewardDeliveredEvent {
    sessionId;
    claimCode;
    rewardTitle;
    playerNickname;
    eventNumber;
    constructor(sessionId, claimCode, rewardTitle, playerNickname, eventNumber) {
        this.sessionId = sessionId;
        this.claimCode = claimCode;
        this.rewardTitle = rewardTitle;
        this.playerNickname = playerNickname;
        this.eventNumber = eventNumber;
    }
}
exports.RewardDeliveredEvent = RewardDeliveredEvent;
class MatchStartedEvent {
    sessionId;
    match;
    eventNumber;
    constructor(sessionId, match, eventNumber) {
        this.sessionId = sessionId;
        this.match = match;
        this.eventNumber = eventNumber;
    }
}
exports.MatchStartedEvent = MatchStartedEvent;
class SessionResetEvent {
    sessionId;
    eventNumber;
    constructor(sessionId, eventNumber) {
        this.sessionId = sessionId;
        this.eventNumber = eventNumber;
    }
}
exports.SessionResetEvent = SessionResetEvent;
class CardSubmittedEvent {
    sessionId;
    card;
    pendingCount;
    eventNumber;
    constructor(sessionId, card, pendingCount, eventNumber) {
        this.sessionId = sessionId;
        this.card = card;
        this.pendingCount = pendingCount;
        this.eventNumber = eventNumber;
    }
}
exports.CardSubmittedEvent = CardSubmittedEvent;
class CardPublishedEvent {
    sessionId;
    card;
    eventNumber;
    constructor(sessionId, card, eventNumber) {
        this.sessionId = sessionId;
        this.card = card;
        this.eventNumber = eventNumber;
    }
}
exports.CardPublishedEvent = CardPublishedEvent;
class CardVoteUpdatedEvent {
    sessionId;
    cardId;
    counts;
    totalVotes;
    eventNumber;
    constructor(sessionId, cardId, counts, totalVotes, eventNumber) {
        this.sessionId = sessionId;
        this.cardId = cardId;
        this.counts = counts;
        this.totalVotes = totalVotes;
        this.eventNumber = eventNumber;
    }
}
exports.CardVoteUpdatedEvent = CardVoteUpdatedEvent;
class CardClosedEvent {
    sessionId;
    cardId;
    card;
    eventNumber;
    constructor(sessionId, cardId, card, eventNumber) {
        this.sessionId = sessionId;
        this.cardId = cardId;
        this.card = card;
        this.eventNumber = eventNumber;
    }
}
exports.CardClosedEvent = CardClosedEvent;
class SessionModeChangedEvent {
    sessionId;
    mode;
    eventNumber;
    constructor(sessionId, mode, eventNumber) {
        this.sessionId = sessionId;
        this.mode = mode;
        this.eventNumber = eventNumber;
    }
}
exports.SessionModeChangedEvent = SessionModeChangedEvent;
class MatchFinishedEvent {
    sessionId;
    match;
    eventNumber;
    constructor(sessionId, match, eventNumber) {
        this.sessionId = sessionId;
        this.match = match;
        this.eventNumber = eventNumber;
    }
}
exports.MatchFinishedEvent = MatchFinishedEvent;
//# sourceMappingURL=session.events.js.map