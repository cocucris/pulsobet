import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SessionEngine } from '../session/session.engine';
export declare class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private prisma;
    private redisService;
    private sessionEngine;
    server: Server;
    private readonly logger;
    constructor(prisma: PrismaService, redisService: RedisService, sessionEngine: SessionEngine);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    broadcastToSession(sessionId: string, event: string, payload: any): void;
    handlePing(client: Socket): void;
    handleJoinSession(client: Socket, data: {
        sessionId: string;
        type: 'player' | 'tv' | 'admin';
        nickname?: string;
        playerId?: string;
    }): Promise<{
        status: string;
        message: string;
    }>;
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
        playerId?: undefined;
        reason?: undefined;
    } | {
        status: string;
        playerId: any;
        reason?: undefined;
    } | {
        status: string;
        reason: string | undefined;
        playerId?: undefined;
    }>;
    sendLeaderboardUpdate(sessionId: string, topPlayers: any[]): void;
    sendMatchUpdate(sessionId: string, matchData: any): void;
    broadcastNewQuestion(sessionId: string, question: any): Promise<void>;
    broadcastQuestionResolved(sessionId: string): Promise<void>;
}
