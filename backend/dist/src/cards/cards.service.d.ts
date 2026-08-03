import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisSessionCacheService } from '../session/redis-session-cache.service';
import { CreateCardDto } from './dto/create-card.dto';
export declare class CardsService {
    private prisma;
    private eventEmitter;
    private sessionCache;
    private readonly logger;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2, sessionCache: RedisSessionCacheService);
    private enrichCard;
    private resolveActiveSession;
    createCard(dto: CreateCardDto): Promise<{
        status: string;
        cardId: string;
    }>;
    getPendingCards(sessionId: string): Promise<{
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
    approveCard(cardId: string): Promise<{
        status: string;
    }>;
    rejectCard(cardId: string): Promise<{
        status: string;
    }>;
    closeCard(cardId: string): Promise<{
        status: string;
    }>;
    private addCardToHistory;
    voteCard(cardId: string, playerId: string, choice: 'INTERESTED' | 'INTRODUCE' | 'PASS'): Promise<{
        status: string;
        counts: {
            interested: number;
            introduce: number;
            pass: number;
        };
        totalVotes: number;
    }>;
    setMode(sessionId: string, mode: 'MATCH' | 'CARDS'): Promise<{
        status: string;
        mode: "MATCH" | "CARDS";
    }>;
}
