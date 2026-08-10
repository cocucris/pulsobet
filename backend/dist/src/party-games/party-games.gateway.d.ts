import { Socket } from 'socket.io';
import { PartyGamesService } from './party-games.service';
import { SubmitPartyInputDto } from './dto/submit-input.dto';
import { BastaDto } from './dto/basta.dto';
import { CastPartyVoteDto } from './dto/cast-vote.dto';
import { CreatePartyRoundDto } from './dto/create-round.dto';
export declare class PartyGamesGateway {
    private readonly partyGamesService;
    private readonly logger;
    constructor(partyGamesService: PartyGamesService);
    handleSubmitInput(client: Socket, data: SubmitPartyInputDto): Promise<{
        status: string;
        reason?: undefined;
    } | {
        accepted: boolean;
        submittedCount: number;
        totalPlayers: number;
        status: string;
        reason?: undefined;
    } | {
        status: string;
        reason: any;
    }>;
    handleBasta(client: Socket, data: BastaDto): Promise<{
        status: string;
        reason?: undefined;
    } | {
        accepted: boolean;
        isBasta: boolean;
        status: string;
        reason?: undefined;
    } | {
        status: string;
        reason: any;
    }>;
    handleCastVote(client: Socket, data: CastPartyVoteDto): Promise<{
        status: string;
        reason?: undefined;
    } | {
        status: string;
        reason: any;
    }>;
    handleAdminStartRound(client: Socket, data: CreatePartyRoundDto): Promise<{
        status: string;
        round: {
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
        };
        reason?: undefined;
    } | {
        status: string;
        reason: any;
        round?: undefined;
    }>;
    handleAdminNextPhase(client: Socket, data: {
        roundId: string;
    }): Promise<{
        status: string;
        reason?: undefined;
    } | {
        status: string;
        reason: any;
    }>;
    handleAdminEndRound(client: Socket, data: {
        roundId: string;
    }): Promise<{
        status: string;
        reason?: undefined;
    } | {
        status: string;
        reason: any;
    }>;
}
