import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
export declare class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private prisma;
    private redisService;
    server: Server;
    private readonly logger;
    constructor(prisma: PrismaService, redisService: RedisService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    private getLeaderboardForSession;
    private getActiveQuestionsForSession;
    handleJoinBar(client: Socket, data: {
        sessionId: string;
        nickname: string;
    }): Promise<{
        status: string;
        message: string;
    }>;
    handleJoinTv(client: Socket, data: {
        sessionId: string;
    }): Promise<{
        status: string;
        message: string;
    }>;
    handlePrediction(client: Socket, data: {
        questionId: string;
        chosenOptionId: number;
    }): Promise<{
        status: string;
        playerId: any;
    }>;
    sendLeaderboardUpdate(sessionId: string, topPlayers: any[]): void;
    sendMatchUpdate(sessionId: string, matchData: any): void;
    broadcastNewQuestion(sessionId: string, question: any): Promise<void>;
    broadcastQuestionResolved(sessionId: string): Promise<void>;
}
