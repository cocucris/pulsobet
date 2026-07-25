import { MatchService } from './match.service';
import { CreateManualQuestionDto } from './dto/create-manual-question.dto';
import { SportsApiWebhookDto } from './dto/sports-api-webhook.dto';
import { ResolveQuestionDto } from './dto/resolve-question.dto';
import { UpdateMatchScoreDto } from './dto/update-match-score.dto';
import { UpdateQuestionTextDto } from './dto/update-question-text.dto';
export declare class MatchController {
    private readonly matchService;
    constructor(matchService: MatchService);
    getLeaderboard(sessionId: string): Promise<{
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
    getActiveQuestion(sessionId: string): Promise<{
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
    launchManualQuestion(createManualQuestionDto: CreateManualQuestionDto): Promise<{
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
    resolveQuestion(dto: ResolveQuestionDto): Promise<{
        status: string;
        winnersCount: number;
        pointsAwarded: number;
    }>;
    receiveSportsEvent(sportsApiWebhookDto: SportsApiWebhookDto): Promise<{
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
    updateScore(dto: UpdateMatchScoreDto): Promise<{
        id: string;
        homeTeam: string;
        awayTeam: string;
        scoreHome: number;
        scoreAway: number;
        status: import("@prisma/client").$Enums.MatchStatus;
        currentMinute: number;
    }>;
    updateQuestionText(id: string, dto: UpdateQuestionTextDto): Promise<{
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
}
