import { SessionEngine } from './session.engine';
export declare class SessionController {
    private readonly sessionEngine;
    constructor(sessionEngine: SessionEngine);
    getSnapshot(sessionId: string, playerId?: string): Promise<import("./session.snapshot").SessionSnapshot>;
    updateModeByParam(sessionId: string, body: {
        mode: 'MATCH' | 'CARDS' | 'PARTY_GAMES';
    }): Promise<{
        status: string;
        mode: string;
    }>;
    updateModeByBody(body: {
        sessionId: string;
        mode: 'MATCH' | 'CARDS' | 'PARTY_GAMES';
    }): Promise<{
        status: string;
        mode: string;
    }>;
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
    closeSession(body: {
        sessionId: string;
    }): Promise<{
        status: string;
        newSessionId: string;
        archivedSessionId: string;
    }>;
    resetPoints(body: {
        sessionId: string;
    }): Promise<{
        status: string;
        message: string;
        leaderboard: {
            rank: number;
            id: string;
            nickname: string;
            totalPoints: number;
            streakCount: number;
        }[];
    }>;
}
