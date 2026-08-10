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
    advancePhase(roundId: string): Promise<{
        status: string;
    }>;
    endRound(roundId: string): Promise<{
        status: string;
    }>;
    getActiveRound(sessionId: string): Promise<{
        submittedCount: number;
        totalPlayers: number;
        options: any;
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
