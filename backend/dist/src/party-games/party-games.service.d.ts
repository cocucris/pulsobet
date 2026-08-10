import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisSessionCacheService } from '../session/redis-session-cache.service';
import { SessionScheduler } from '../session/session.scheduler';
import { CreatePartyRoundDto } from './dto/create-round.dto';
import { SubmitPartyInputDto } from './dto/submit-input.dto';
import { CastPartyVoteDto } from './dto/cast-vote.dto';
import { BastaDto } from './dto/basta.dto';
import { ManageCategoryDto } from './dto/manage-categories.dto';
export declare class PartyGamesService {
    private prisma;
    private sessionCache;
    private eventEmitter;
    private scheduler;
    private readonly logger;
    constructor(prisma: PrismaService, sessionCache: RedisSessionCacheService, eventEmitter: EventEmitter2, scheduler: SessionScheduler);
    private resolveBarId;
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
    private ensureDefaultCategories;
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
    submitInput(playerId: string, sessionId: string, dto: SubmitPartyInputDto): Promise<{
        accepted: boolean;
        submittedCount: number;
        totalPlayers: number;
    }>;
    submitBasta(playerId: string, sessionId: string, dto: BastaDto): Promise<{
        accepted: boolean;
        isBasta: boolean;
    }>;
    castVote(voterId: string, dto: CastPartyVoteDto): Promise<{
        accepted: boolean;
    }>;
    advancePhase(roundId: string): Promise<void>;
    endRound(roundId: string): Promise<void>;
    private advanceToVoting;
    private advanceToReveal;
    private finishRound;
    private calculateAndAwardPoints;
    private addPoints;
    private buildVotingOptions;
    private buildVotesSummary;
    private getActiveRound;
    private serializeRound;
    getActiveRoundForSession(sessionId: string): Promise<{
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
    private getLeaderboard;
}
