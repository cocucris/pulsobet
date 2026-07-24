import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private redisClient;
    private readonly logger;
    onModuleInit(): void;
    onModuleDestroy(): void;
    incrementPlayerScore(sessionId: string, playerId: string, points: number): Promise<number>;
    setPlayerScore(sessionId: string, playerId: string, points: number): Promise<void>;
    getTopPlayers(sessionId: string, limit?: number): Promise<Array<{
        playerId: string;
        score: number;
    }>>;
    clearLeaderboard(sessionId: string): Promise<void>;
}
