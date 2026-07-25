import { SessionEngine } from './session.engine';
export declare class SessionController {
    private readonly sessionEngine;
    constructor(sessionEngine: SessionEngine);
    getSnapshot(sessionId: string, playerId?: string): Promise<import("./session.snapshot").SessionSnapshot>;
    startMatch(body: {
        sessionId: string;
        homeTeam: string;
        awayTeam: string;
    }): Promise<{
        id: string;
        homeTeam: string;
        awayTeam: string;
        scoreHome: number;
        scoreAway: number;
        status: import("@prisma/client").$Enums.MatchStatus;
        currentMinute: number;
    }>;
}
