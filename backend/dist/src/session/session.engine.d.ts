import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RedisSessionCacheService } from './redis-session-cache.service';
import { SessionSnapshot } from './session.snapshot';
import { SessionScheduler } from './session.scheduler';
export declare class SessionEngine {
    private prisma;
    private redisService;
    private sessionCache;
    private eventEmitter;
    private scheduler;
    private readonly logger;
    constructor(prisma: PrismaService, redisService: RedisService, sessionCache: RedisSessionCacheService, eventEmitter: EventEmitter2, scheduler: SessionScheduler);
    buildSnapshot(sessionId: string, playerId?: string): Promise<SessionSnapshot>;
    startMatch(sessionId: string, homeTeam: string, awayTeam: string): Promise<{
        id: string;
        homeTeam: string;
        awayTeam: string;
        scoreHome: number;
        scoreAway: number;
        status: import("@prisma/client").$Enums.MatchStatus;
        currentMinute: number;
    }>;
    updateScore(matchId: string, scoreHome: number, scoreAway: number, homeTeam?: string, awayTeam?: string, currentMinute?: number): Promise<{
        id: string;
        homeTeam: string;
        awayTeam: string;
        scoreHome: number;
        scoreAway: number;
        status: import("@prisma/client").$Enums.MatchStatus;
        currentMinute: number;
    }>;
    createManualQuestion(dto: {
        barId: string;
        questionText: string;
        options: {
            id: number;
            text: string;
        }[];
        pointsReward?: number;
        expiresInSeconds?: number;
        imageUrl?: string | null;
        isFlash?: boolean;
    }): Promise<{
        status: string;
        questionId: string;
        expiresAt: Date;
        trivia: {
            id: any;
            questionText: any;
            options: any[];
            pointsReward: any;
            imageUrl: any;
            isFlash: any;
            isClosed: any;
            expiresAt: any;
            totalVotes: number;
        };
    }>;
    closeTrivia(sessionId: string, triviaId: string): Promise<void>;
    resolveQuestionExpress(questionId: string, correctOptionId: number): Promise<{
        status: string;
        winnersCount: number;
        pointsAwarded: number;
    }>;
    updateLiveQuestion(questionId: string, dto: {
        questionText?: string;
        options?: {
            id: number;
            text: string;
        }[];
    }): Promise<{
        id: any;
        questionText: any;
        options: any[];
        pointsReward: any;
        imageUrl: any;
        isFlash: any;
        isClosed: any;
        expiresAt: any;
        totalVotes: number;
    }>;
    submitVote(sessionId: string, playerId: string, questionId: string, chosenOptionId: number): Promise<void>;
    private getLeaderboard;
    private enrichQuestionStats;
}
