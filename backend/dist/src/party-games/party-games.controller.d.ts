import { PartyGamesService } from './party-games.service';
import { CreatePartyRoundDto } from './dto/create-round.dto';
import { ManageCategoryDto } from './dto/manage-categories.dto';
export declare class PartyGamesController {
    private readonly partyGamesService;
    private readonly logger;
    constructor(partyGamesService: PartyGamesService);
    getCategories(barId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        barId: string;
        isDefault: boolean;
    }[]>;
    addCategory(barId: string, dto: ManageCategoryDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        barId: string;
        isDefault: boolean;
    }>;
    deleteCategory(barId: string, categoryId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        barId: string;
        isDefault: boolean;
    }>;
    createRound(dto: CreatePartyRoundDto): Promise<{
        options: any[];
        id: any;
        sessionId: any;
        gameType: any;
        phase: any;
        prompt: any;
        categories: any;
        timeLimit: any;
        createdAt: any;
        submittedCount: number;
        totalPlayers: number;
    }>;
    startCountdown(roundId: string): Promise<{
        status: string;
    }>;
    advancePhase(roundId: string): Promise<{
        status: string;
    }>;
    endRound(roundId: string): Promise<{
        status: string;
    }>;
    endGame(sessionId: string): Promise<{
        status: string;
        leaderboard: {
            rank: number;
            id: string;
            nickname: string;
            totalPoints: number;
            streakCount: number;
        }[];
    }>;
    submitBasta(roundId: string, body: {
        playerId: string;
        answers: Record<string, string>;
    }): Promise<{
        accepted: boolean;
        isBasta: boolean;
    }>;
    submitInput(roundId: string, body: {
        playerId: string;
        content: Record<string, any>;
    }): Promise<{
        accepted: boolean;
        submittedCount: number;
        totalPlayers: number;
    }>;
    castVote(roundId: string, body: {
        playerId: string;
        targetId: string;
    }): Promise<{
        accepted: boolean;
    }>;
    getActiveRound(sessionId: string): Promise<{
        submittedCount: number;
        totalPlayers: number;
        options: any[];
        id: any;
        sessionId: any;
        gameType: any;
        phase: any;
        prompt: any;
        categories: any;
        timeLimit: any;
        createdAt: any;
    } | null>;
}
