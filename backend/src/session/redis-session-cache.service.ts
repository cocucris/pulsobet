import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisSessionCacheService {
  private readonly logger = new Logger(RedisSessionCacheService.name);

  constructor(private redisService: RedisService) {}

  private get client() {
    try {
      return (this.redisService as any).redisClient;
    } catch {
      return null;
    }
  }

  // Version and event numbers
  async incrementVersion(sessionId: string): Promise<number> {
    try {
      if (!this.client) return 1;
      return await this.client.incr(`session:${sessionId}:version`);
    } catch (e) {
      this.logger.warn(`Redis fallback on incrementVersion: ${e.message}`);
      return 1;
    }
  }

  async getVersion(sessionId: string): Promise<number> {
    try {
      if (!this.client) return 1;
      const v = await this.client.get(`session:${sessionId}:version`);
      return v ? parseInt(v, 10) : 1;
    } catch (e) {
      return 1;
    }
  }

  async incrementEventNumber(sessionId: string): Promise<number> {
    try {
      if (!this.client) return 1;
      return await this.client.incr(`session:${sessionId}:event_number`);
    } catch (e) {
      return 1;
    }
  }

  async getEventNumber(sessionId: string): Promise<number> {
    try {
      if (!this.client) return 0;
      const n = await this.client.get(`session:${sessionId}:event_number`);
      return n ? parseInt(n, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  // Connected players count
  async incrementConnected(sessionId: string): Promise<number> {
    try {
      if (!this.client) return 1;
      return await this.client.incr(`session:${sessionId}:connected`);
    } catch (e) {
      return 1;
    }
  }

  async decrementConnected(sessionId: string): Promise<number> {
    try {
      if (!this.client) return 0;
      const count = await this.client.decr(`session:${sessionId}:connected`);
      return Math.max(0, count);
    } catch (e) {
      return 0;
    }
  }

  async getConnectedCount(sessionId: string): Promise<number> {
    try {
      if (!this.client) return 0;
      const count = await this.client.get(`session:${sessionId}:connected`);
      return count ? Math.max(0, parseInt(count, 10)) : 0;
    } catch (e) {
      return 0;
    }
  }

  // Match state cache
  async setMatch(sessionId: string, matchData: any): Promise<void> {
    try {
      if (!this.client) return;
      await this.client.set(`session:${sessionId}:match`, JSON.stringify(matchData));
    } catch (e) {
      this.logger.warn(`Redis fallback on setMatch: ${e.message}`);
    }
  }

  async getMatch(sessionId: string): Promise<any | null> {
    try {
      if (!this.client) return null;
      const data = await this.client.get(`session:${sessionId}:match`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  // Trivia cache (lista de trivias activas simultáneas)
  async getActiveTrivias(sessionId: string): Promise<any[]> {
    try {
      if (!this.client) return [];
      const data = await this.client.get(`session:${sessionId}:trivias`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  async setActiveTrivias(sessionId: string, trivias: any[]): Promise<void> {
    try {
      if (!this.client) return;
      await this.client.set(`session:${sessionId}:trivias`, JSON.stringify(trivias));
    } catch (e) {
      this.logger.warn(`Redis fallback on setActiveTrivias: ${e.message}`);
    }
  }

  async upsertActiveTrivia(sessionId: string, trivia: any): Promise<void> {
    try {
      const trivias = await this.getActiveTrivias(sessionId);
      const idx = trivias.findIndex((t) => t.id === trivia.id);
      if (idx >= 0) trivias[idx] = trivia;
      else trivias.push(trivia);
      await this.setActiveTrivias(sessionId, trivias);
    } catch (e) {
      this.logger.warn(`Redis fallback on upsertActiveTrivia: ${e.message}`);
    }
  }

  async removeActiveTrivia(sessionId: string, triviaId: string): Promise<void> {
    try {
      const trivias = await this.getActiveTrivias(sessionId);
      await this.setActiveTrivias(sessionId, trivias.filter((t) => t.id !== triviaId));
    } catch (e) {
      this.logger.warn(`Redis fallback on removeActiveTrivia: ${e.message}`);
    }
  }

  // Historial de trivias resueltas de la sesión (persiste hasta cerrar la sesión)
  async getResolvedTrivias(sessionId: string): Promise<any[]> {
    try {
      if (!this.client) return [];
      const data = await this.client.get(`session:${sessionId}:trivias_resolved`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  async addResolvedTrivia(sessionId: string, trivia: any): Promise<void> {
    try {
      if (!this.client) return;
      const resolved = await this.getResolvedTrivias(sessionId);
      const idx = resolved.findIndex((t) => t.id === trivia.id);
      if (idx >= 0) resolved[idx] = trivia;
      else resolved.push(trivia);
      await this.client.set(`session:${sessionId}:trivias_resolved`, JSON.stringify(resolved));
    } catch (e) {
      this.logger.warn(`Redis fallback on addResolvedTrivia: ${e.message}`);
    }
  }

  // Limpieza total del estado efímero de una sesión (al cerrar la noche)
  async resetSessionState(sessionId: string): Promise<void> {
    try {
      if (!this.client) return;
      await this.client.del(
        `session:${sessionId}:match`,
        `session:${sessionId}:trivias`,
        `session:${sessionId}:trivias_resolved`,
        `session:${sessionId}:event_number`,
        `session:${sessionId}:version`,
        `session:${sessionId}:connected`,
      );
    } catch (e) {
      this.logger.warn(`Redis fallback on resetSessionState: ${e.message}`);
    }
  }

  // Rewards cache
  async setRewards(barId: string, rewards: any[]): Promise<void> {
    try {
      if (!this.client) return;
      await this.client.set(`bar:${barId}:rewards`, JSON.stringify(rewards));
    } catch (e) {
      this.logger.warn(`Redis fallback on setRewards: ${e.message}`);
    }
  }

  async getRewards(barId: string): Promise<any[] | null> {
    try {
      if (!this.client) return null;
      const data = await this.client.get(`bar:${barId}:rewards`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }
}
