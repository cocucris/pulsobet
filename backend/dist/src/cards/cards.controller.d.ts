import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { VoteCardDto } from './dto/vote-card.dto';
import { SetModeDto } from './dto/set-mode.dto';
export declare class CardsController {
    private readonly cardsService;
    constructor(cardsService: CardsService);
    uploadPhoto(file: any): {
        url: string;
    };
    createCard(dto: CreateCardDto): Promise<{
        status: string;
        cardId: string;
    }>;
    getPending(sessionId: string): Promise<{
        id: any;
        sessionId: any;
        tableNumber: any;
        name: any;
        age: any;
        position: any;
        strongFoot: any;
        fitness: any;
        skills: any;
        objective: any;
        photoUrl: any;
        status: any;
        createdAt: any;
        counts: {
            interested: number;
            introduce: number;
            pass: number;
        };
        totalVotes: number;
    }[]>;
    approve(id: string): Promise<{
        status: string;
    }>;
    reject(id: string): Promise<{
        status: string;
    }>;
    close(id: string): Promise<{
        status: string;
    }>;
    closeAll(dto: {
        sessionId: string;
    }): Promise<{
        status: string;
        closedCount: number;
    }>;
    vote(id: string, dto: VoteCardDto): Promise<{
        status: string;
        counts: {
            interested: number;
            introduce: number;
            pass: number;
        };
        totalVotes: number;
    }>;
    setMode(dto: SetModeDto): Promise<{
        status: string;
        mode: "MATCH" | "CARDS" | "PARTY_GAMES";
    }>;
}
