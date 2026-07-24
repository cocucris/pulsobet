import { PrismaService } from '../prisma/prisma.service';
import { LiveGateway } from '../live/live.gateway';
import { RedisService } from '../redis/redis.service';
import { CreateManualQuestionDto } from './dto/create-manual-question.dto';
import { SportsApiWebhookDto } from './dto/sports-api-webhook.dto';
export declare class MatchService {
    private prisma;
    private liveGateway;
    private redisService;
    constructor(prisma: PrismaService, liveGateway: LiveGateway, redisService: RedisService);
    createManualQuestion(dto: CreateManualQuestionDto): Promise<{
        status: string;
        message: string;
        questionId: string;
    }>;
    getActiveQuestions(sessionId?: string): Promise<{
        id: string;
        questionText: string;
        options: any[];
        pointsReward: number;
        imageUrl: string | null;
        isFlash: boolean;
        isClosed: boolean;
        expiresAt: Date;
        totalVotes: number;
    }[]>;
    getActiveQuestion(sessionId?: string): Promise<{
        id: string;
        questionText: string;
        options: any[];
        pointsReward: number;
        imageUrl: string | null;
        isFlash: boolean;
        isClosed: boolean;
        expiresAt: Date;
        totalVotes: number;
    } | null>;
    getCurrentLeaderboard(sessionId: string): Promise<{
        id: string;
        nickname: string;
        tableNumber: string | null;
        totalPoints: number;
        streakCount: number;
    }[]>;
    resolveQuestionExpress(questionId: string, correctOptionId: number): Promise<{
        status: string;
        message: string;
        winnersCount?: undefined;
        losersCount?: undefined;
        leaderboard?: undefined;
    } | {
        status: string;
        message: string;
        winnersCount: number;
        losersCount: number;
        leaderboard: {
            id: string;
            nickname: string;
            tableNumber: string | null;
            totalPoints: number;
            streakCount: number;
        }[];
    }>;
    handleSportsWebhook(webhookDto: SportsApiWebhookDto): Promise<{
        status: string;
        reason: string;
        event?: undefined;
    } | {
        status: string;
        event: "GOAL" | "CARD" | "PERIOD_END" | "MATCH_END";
        reason?: undefined;
    }>;
}
