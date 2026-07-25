import { SessionEngine } from '../session/session.engine';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManualQuestionDto } from './dto/create-manual-question.dto';
import { UpdateMatchScoreDto } from './dto/update-match-score.dto';
import { UpdateQuestionTextDto } from './dto/update-question-text.dto';
import { SportsApiWebhookDto } from './dto/sports-api-webhook.dto';
export declare class MatchService {
    private sessionEngine;
    private prisma;
    constructor(sessionEngine: SessionEngine, prisma: PrismaService);
    createManualQuestion(dto: CreateManualQuestionDto): Promise<{
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
    resolveQuestionExpress(questionId: string, correctOptionId: number): Promise<{
        status: string;
        winnersCount: number;
        pointsAwarded: number;
    }>;
    updateMatchScore(dto: UpdateMatchScoreDto): Promise<{
        id: string;
        homeTeam: string;
        awayTeam: string;
        scoreHome: number;
        scoreAway: number;
        status: import("@prisma/client").$Enums.MatchStatus;
        currentMinute: number;
    }>;
    updateLiveQuestion(id: string, dto: UpdateQuestionTextDto): Promise<{
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
    getCurrentLeaderboard(sessionId: string): Promise<{
        rank: number;
        id: string;
        nickname: string;
        totalPoints: number;
        streakCount: number;
    }[]>;
    getLiveMatch(sessionId: string): Promise<{
        id: string;
        homeTeam: string;
        awayTeam: string;
        scoreHome: number;
        scoreAway: number;
        status: "SCHEDULED" | "LIVE" | "PAUSED" | "FINISHED";
        currentMinute: number;
    } | null>;
    getActiveQuestions(sessionId: string): Promise<{
        id: string;
        questionText: string;
        options: {
            id: number;
            text: string;
            count: number;
            percentage: number;
        }[];
        pointsReward: number;
        isFlash: boolean;
        expiresAt: string;
        totalVotes: number;
        imageUrl?: string | null;
    }[]>;
    handleSportsWebhook(dto: SportsApiWebhookDto): Promise<{
        id: string;
        homeTeam: string;
        awayTeam: string;
        scoreHome: number;
        scoreAway: number;
        status: import("@prisma/client").$Enums.MatchStatus;
        currentMinute: number;
    } | {
        status: string;
        reason: string;
    } | {
        status: string;
        reason?: undefined;
    }>;
}
