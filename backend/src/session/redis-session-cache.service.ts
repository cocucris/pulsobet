import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisSessionCacheService {
  private readonly logger = new Logger(RedisSessionCacheService.name);

  constructor(private redisService: RedisService) {}

  private get client() {
    return (this.redisService as any).redisClient;
  }

  // Version and event numbers
  async incrementVersion(sessionId: string): Promise<number> {
    if (!this.client) return 1;
    return await this.client.incr(`session:${sessionId}:version`);
  }

  async getVersion(sessionId: string): Promise<number> {
    if (!this.client) return 1;
    const v = await this.client.get(`session:${sessionId}:version`);
    return v ? parseInt(v, 10) : 1;
  }

  async incrementEventNumber(sessionId: string): Promise<number> {
    if (!this.client) return 1;
    return await this.client.incr(`session:${sessionId}:event_number`);
  }

  async getEventNumber(sessionId: string): Promise<number> {
    if (!this.client) return 1;
    const n = await this.client.get(`session:${sessionId}:event_number`);
    return n ? parseInt(n, 10) : 0;
  }

  // Connected players count
  async incrementConnected(sessionId: string): Promise<number> {
    if (!this.client) return 1;
    return await this.client.incr(`session:${sessionId}:connected`);
  }

  async decrementConnected(sessionId: string): Promise<number> {
    if (!this.client) return 0;
    const count = await this.client.decr(`session:${sessionId}:connected`);
    return Math.max(0, count);
  }

  async getConnectedCount(sessionId: string): Promise<number> {
    if (!this.client) return 0;
    const count = await this.client.get(`session:${sessionId}:connected`);
    return count ? Math.max(0, parseInt(count, 10)) : 0;
  }

  // Match state cache
  async setMatch(sessionId: string, matchData: any): Promise<void> {
    if (!this.client) return;
    await this.client.set(`session:${sessionId}:match`, JSON.stringify(matchData));
  }

  async getMatch(sessionId: string): Promise<any | null> {
    if (!this.client) return null;
    const data = await this.client.get(`session:${sessionId}:match`);
    return data ? JSON.parse(data) : null;
  }

  // Trivia cache
  async setCurrentTrivia(sessionId: string, triviaData: any): Promise<void> {
    if (!this.client) return;
    await this.client.set(`session:${sessionId}:trivia`, JSON.stringify(triviaData));
  }

  async getCurrentTrivia(sessionId: string): Promise<any | null> {
    if (!this.client) return null;
    const data = await this.client.get(`session:${sessionId}:trivia`);
    return data ? JSON.parse(data) : null;
  }

  async clearCurrentTrivia(sessionId: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(`session:${sessionId}:trivia`);
  }

  // Rewards cache
  async setRewards(barId: string, rewards: any[]): Promise<void> {
    if (!this.client) return;
    await this.client.set(`bar:${barId}:rewards`, JSON.stringify(rewards));
  }

  async getRewards(barId: string): Promise<any[] | null> {
    if (!this.client) return null;
    const data = await this.client.get(`bar:${barId}:rewards`);
    return data ? JSON.parse(data) : null;
  }
}
