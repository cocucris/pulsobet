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
        `session:${sessionId}:card_active`,
        `session:${sessionId}:cards_active`,
        `session:${sessionId}:cards_history`,
        `session:${sessionId}:mode`,
      );
    } catch (e) {
      this.logger.warn(`Redis fallback on resetSessionState: ${e.message}`);
    }
  }

  // ─── MODO FICHAJE (Fichas Técnicas) ──────────────────────────────────

  async getMode(sessionId: string): Promise<string | null> {
    try {
      if (!this.client) return null;
      return await this.client.get(`session:${sessionId}:mode`);
    } catch (e) {
      return null;
    }
  }

  async setMode(sessionId: string, mode: string): Promise<void> {
    try {
      if (!this.client) return;
      await this.client.set(`session:${sessionId}:mode`, mode);
    } catch (e) {
      this.logger.warn(`Redis fallback on setMode: ${e.message}`);
    }
  }

  async getActiveCard(sessionId: string): Promise<any | null> {
    try {
      if (!this.client) return null;
      const data = await this.client.get(`session:${sessionId}:card_active`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  async setActiveCard(sessionId: string, card: any): Promise<void> {
    try {
      if (!this.client) return;
      await this.client.set(`session:${sessionId}:card_active`, JSON.stringify(card));
    } catch (e) {
      this.logger.warn(`Redis fallback on setActiveCard: ${e.message}`);
    }
  }

  // ─── MÚLTIPLES FICHAS ACTIVAS ────────────────────────────────────────

  async getActiveCards(sessionId: string): Promise<any[]> {
    try {
      if (!this.client) return [];
      const data = await this.client.get(`session:${sessionId}:cards_active`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  async setActiveCards(sessionId: string, cards: any[]): Promise<void> {
    try {
      if (!this.client) return;
      await this.client.set(`session:${sessionId}:cards_active`, JSON.stringify(cards));
    } catch (e) {
      this.logger.warn(`Redis fallback on setActiveCards: ${e.message}`);
    }
  }

  async addActiveCard(sessionId: string, card: any): Promise<void> {
    try {
      if (!this.client) return;
      const cards = await this.getActiveCards(sessionId);
      const idx = cards.findIndex((c) => c.id === card.id);
      if (idx >= 0) cards[idx] = card;
      else cards.push(card);
      await this.setActiveCards(sessionId, cards);
    } catch (e) {
      this.logger.warn(`Redis fallback on addActiveCard: ${e.message}`);
    }
  }

  async removeActiveCard(sessionId: string, cardId: string): Promise<void> {
    try {
      if (!this.client) return;
      const cards = await this.getActiveCards(sessionId);
      const filtered = cards.filter((c) => c.id !== cardId);
      await this.setActiveCards(sessionId, filtered);
    } catch (e) {
      this.logger.warn(`Redis fallback on removeActiveCard: ${e.message}`);
    }
  }

  async getCardsHistory(sessionId: string): Promise<any[]> {
    try {
      if (!this.client) return [];
      const data = await this.client.get(`session:${sessionId}:cards_history`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  async addCardToHistory(sessionId: string, card: any): Promise<void> {
    try {
      if (!this.client) return;
      const history = await this.getCardsHistory(sessionId);
      const idx = history.findIndex((c) => c.id === card.id);
      if (idx >= 0) history[idx] = card;
      else history.push(card);
      await this.client.set(`session:${sessionId}:cards_history`, JSON.stringify(history));
    } catch (e) {
      this.logger.warn(`Redis fallback on addCardToHistory: ${e.message}`);
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
