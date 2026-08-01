export declare class MatchScoreUpdatedEvent {
    readonly sessionId: string;
    readonly scoreHome: number;
    readonly scoreAway: number;
    readonly homeTeam: string;
    readonly awayTeam: string;
    readonly status: string;
    readonly eventNumber: number;
    constructor(sessionId: string, scoreHome: number, scoreAway: number, homeTeam: string, awayTeam: string, status: string, eventNumber: number);
}
export declare class TriviaCreatedEvent {
    readonly sessionId: string;
    readonly trivia: any;
    readonly eventNumber: number;
    constructor(sessionId: string, trivia: any, eventNumber: number);
}
export declare class TriviaOpenedEvent {
    readonly sessionId: string;
    readonly trivia: any;
    readonly eventNumber: number;
    constructor(sessionId: string, trivia: any, eventNumber: number);
}
export declare class TriviaClosedEvent {
    readonly sessionId: string;
    readonly triviaId: string;
    readonly eventNumber: number;
    readonly trivia?: any | undefined;
    constructor(sessionId: string, triviaId: string, eventNumber: number, trivia?: any | undefined);
}
export declare class TriviaResultEvent {
    readonly sessionId: string;
    readonly triviaId: string;
    readonly correctOptionId: number;
    readonly winnersCount: number;
    readonly leaderboard: any[];
    readonly eventNumber: number;
    readonly trivia?: any | undefined;
    constructor(sessionId: string, triviaId: string, correctOptionId: number, winnersCount: number, leaderboard: any[], eventNumber: number, trivia?: any | undefined);
}
export declare class PlayerJoinedEvent {
    readonly sessionId: string;
    readonly player: {
        id: string;
        nickname: string;
        tableNumber: string | null;
    };
    readonly eventNumber: number;
    constructor(sessionId: string, player: {
        id: string;
        nickname: string;
        tableNumber: string | null;
    }, eventNumber: number);
}
export declare class PlayerVotedEvent {
    readonly sessionId: string;
    readonly triviaId: string;
    readonly options: any[];
    readonly totalVotes: number;
    readonly eventNumber: number;
    constructor(sessionId: string, triviaId: string, options: any[], totalVotes: number, eventNumber: number);
}
export declare class LeaderboardUpdatedEvent {
    readonly sessionId: string;
    readonly leaderboard: any[];
    readonly eventNumber: number;
    constructor(sessionId: string, leaderboard: any[], eventNumber: number);
}
export declare class RewardReservedEvent {
    readonly sessionId: string;
    readonly claimCode: string;
    readonly rewardTitle: string;
    readonly playerNickname: string;
    readonly eventNumber: number;
    constructor(sessionId: string, claimCode: string, rewardTitle: string, playerNickname: string, eventNumber: number);
}
export declare class RewardDeliveredEvent {
    readonly sessionId: string;
    readonly claimCode: string;
    readonly rewardTitle: string;
    readonly playerNickname: string;
    readonly eventNumber: number;
    constructor(sessionId: string, claimCode: string, rewardTitle: string, playerNickname: string, eventNumber: number);
}
export declare class MatchStartedEvent {
    readonly sessionId: string;
    readonly match: any;
    readonly eventNumber: number;
    constructor(sessionId: string, match: any, eventNumber: number);
}
export declare class SessionResetEvent {
    readonly sessionId: string;
    readonly eventNumber: number;
    constructor(sessionId: string, eventNumber: number);
}
export declare class MatchFinishedEvent {
    readonly sessionId: string;
    readonly match: any;
    readonly eventNumber: number;
    constructor(sessionId: string, match: any, eventNumber: number);
}
