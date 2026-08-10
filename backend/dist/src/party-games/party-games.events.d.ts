export declare class PartyRoundStartedEvent {
    readonly sessionId: string;
    readonly round: any;
    readonly eventNumber: number;
    constructor(sessionId: string, round: any, eventNumber: number);
}
export declare class PartyPhaseChangedEvent {
    readonly sessionId: string;
    readonly roundId: string;
    readonly phase: 'LOBBY' | 'COUNTDOWN' | 'INPUT' | 'VOTING' | 'REVEAL' | 'FINISHED';
    readonly payload: any;
    readonly eventNumber: number;
    constructor(sessionId: string, roundId: string, phase: 'LOBBY' | 'COUNTDOWN' | 'INPUT' | 'VOTING' | 'REVEAL' | 'FINISHED', payload: any, eventNumber: number);
}
export declare class PartyBastaCalledEvent {
    readonly sessionId: string;
    readonly roundId: string;
    readonly playerId: string;
    readonly nickname: string;
    readonly eventNumber: number;
    constructor(sessionId: string, roundId: string, playerId: string, nickname: string, eventNumber: number);
}
export declare class PartyInputSubmittedEvent {
    readonly sessionId: string;
    readonly roundId: string;
    readonly submittedCount: number;
    readonly totalPlayers: number;
    readonly eventNumber: number;
    constructor(sessionId: string, roundId: string, submittedCount: number, totalPlayers: number, eventNumber: number);
}
export declare class PartyVoteCastEvent {
    readonly sessionId: string;
    readonly roundId: string;
    readonly votes: any[];
    readonly eventNumber: number;
    constructor(sessionId: string, roundId: string, votes: any[], eventNumber: number);
}
export declare class PartyRoundResultEvent {
    readonly sessionId: string;
    readonly roundId: string;
    readonly results: any;
    readonly leaderboard: any[];
    readonly eventNumber: number;
    constructor(sessionId: string, roundId: string, results: any, leaderboard: any[], eventNumber: number);
}
export declare class PartyRoundFinishedEvent {
    readonly sessionId: string;
    readonly roundId: string;
    readonly eventNumber: number;
    constructor(sessionId: string, roundId: string, eventNumber: number);
}
export declare class PartyGameOverEvent {
    readonly sessionId: string;
    readonly gameType: string;
    readonly finalLeaderboard: any[];
    readonly eventNumber: number;
    constructor(sessionId: string, gameType: string, finalLeaderboard: any[], eventNumber: number);
}
