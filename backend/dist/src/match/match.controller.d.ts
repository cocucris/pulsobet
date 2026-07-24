import { MatchService } from './match.service';
import { CreateManualQuestionDto } from './dto/create-manual-question.dto';
import { SportsApiWebhookDto } from './dto/sports-api-webhook.dto';
import { ResolveQuestionDto } from './dto/resolve-question.dto';
export declare class MatchController {
    private readonly matchService;
    constructor(matchService: MatchService);
    getLeaderboard(sessionId: string): Promise<{
        id: string;
        nickname: string;
        tableNumber: string | null;
        totalPoints: number;
        streakCount: number;
    }[]>;
    getActiveQuestion(sessionId: string): Promise<{
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
    launchManualQuestion(createManualQuestionDto: CreateManualQuestionDto): Promise<{
        status: string;
        message: string;
        questionId: string;
    }>;
    resolveQuestion(dto: ResolveQuestionDto): Promise<{
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
    receiveSportsEvent(sportsApiWebhookDto: SportsApiWebhookDto): Promise<{
        status: string;
        reason: string;
        event?: undefined;
    } | {
        status: string;
        event: "GOAL" | "CARD" | "PERIOD_END" | "MATCH_END";
        reason?: undefined;
    }>;
}
