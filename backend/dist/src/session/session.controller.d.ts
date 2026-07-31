import { SessionEngine } from './session.engine';
export declare class SessionController {
    private readonly sessionEngine;
    constructor(sessionEngine: SessionEngine);
    getSnapshot(sessionId: string, playerId?: string): Promise<import("./session.snapshot").SessionSnapshot>;
    startMatch(body: {
        sessionId: string;
        homeTeam: string;
        awayTeam: string;
        status?: 'SCHEDULED' | 'LIVE';
    }): Promise<{
        sessionId: string;
        id: string;
        homeTeam: string;
        awayTeam: string;
        scoreHome: number;
        scoreAway: number;
        status: import("@prisma/client").$Enums.MatchStatus;
        currentMinute: number;
    }>;
    resetMatch(body: {
        sessionId: string;
    }): Promise<{
        status: string;
        message: string;
    }>;
}
