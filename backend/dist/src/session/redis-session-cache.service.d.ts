import { RedisService } from '../redis/redis.service';
export declare class RedisSessionCacheService {
    private redisService;
    private readonly logger;
    constructor(redisService: RedisService);
    private get client();
    incrementVersion(sessionId: string): Promise<number>;
    getVersion(sessionId: string): Promise<number>;
    incrementEventNumber(sessionId: string): Promise<number>;
    getEventNumber(sessionId: string): Promise<number>;
    incrementConnected(sessionId: string): Promise<number>;
    decrementConnected(sessionId: string): Promise<number>;
    getConnectedCount(sessionId: string): Promise<number>;
    setMatch(sessionId: string, matchData: any): Promise<void>;
    getMatch(sessionId: string): Promise<any | null>;
    setCurrentTrivia(sessionId: string, triviaData: any): Promise<void>;
    getCurrentTrivia(sessionId: string): Promise<any | null>;
    clearCurrentTrivia(sessionId: string): Promise<void>;
    setRewards(barId: string, rewards: any[]): Promise<void>;
    getRewards(barId: string): Promise<any[] | null>;
}
