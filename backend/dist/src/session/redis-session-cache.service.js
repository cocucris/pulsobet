"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RedisSessionCacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisSessionCacheService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
let RedisSessionCacheService = RedisSessionCacheService_1 = class RedisSessionCacheService {
    redisService;
    logger = new common_1.Logger(RedisSessionCacheService_1.name);
    constructor(redisService) {
        this.redisService = redisService;
    }
    get client() {
        try {
            return this.redisService.redisClient;
        }
        catch {
            return null;
        }
    }
    async incrementVersion(sessionId) {
        try {
            if (!this.client)
                return 1;
            return await this.client.incr(`session:${sessionId}:version`);
        }
        catch (e) {
            this.logger.warn(`Redis fallback on incrementVersion: ${e.message}`);
            return 1;
        }
    }
    async getVersion(sessionId) {
        try {
            if (!this.client)
                return 1;
            const v = await this.client.get(`session:${sessionId}:version`);
            return v ? parseInt(v, 10) : 1;
        }
        catch (e) {
            return 1;
        }
    }
    async incrementEventNumber(sessionId) {
        try {
            if (!this.client)
                return 1;
            return await this.client.incr(`session:${sessionId}:event_number`);
        }
        catch (e) {
            return 1;
        }
    }
    async getEventNumber(sessionId) {
        try {
            if (!this.client)
                return 0;
            const n = await this.client.get(`session:${sessionId}:event_number`);
            return n ? parseInt(n, 10) : 0;
        }
        catch (e) {
            return 0;
        }
    }
    async incrementConnected(sessionId) {
        try {
            if (!this.client)
                return 1;
            return await this.client.incr(`session:${sessionId}:connected`);
        }
        catch (e) {
            return 1;
        }
    }
    async decrementConnected(sessionId) {
        try {
            if (!this.client)
                return 0;
            const count = await this.client.decr(`session:${sessionId}:connected`);
            return Math.max(0, count);
        }
        catch (e) {
            return 0;
        }
    }
    async getConnectedCount(sessionId) {
        try {
            if (!this.client)
                return 0;
            const count = await this.client.get(`session:${sessionId}:connected`);
            return count ? Math.max(0, parseInt(count, 10)) : 0;
        }
        catch (e) {
            return 0;
        }
    }
    async setMatch(sessionId, matchData) {
        try {
            if (!this.client)
                return;
            await this.client.set(`session:${sessionId}:match`, JSON.stringify(matchData));
        }
        catch (e) {
            this.logger.warn(`Redis fallback on setMatch: ${e.message}`);
        }
    }
    async getMatch(sessionId) {
        try {
            if (!this.client)
                return null;
            const data = await this.client.get(`session:${sessionId}:match`);
            return data ? JSON.parse(data) : null;
        }
        catch (e) {
            return null;
        }
    }
    async getActiveTrivias(sessionId) {
        try {
            if (!this.client)
                return [];
            const data = await this.client.get(`session:${sessionId}:trivias`);
            return data ? JSON.parse(data) : [];
        }
        catch (e) {
            return [];
        }
    }
    async setActiveTrivias(sessionId, trivias) {
        try {
            if (!this.client)
                return;
            await this.client.set(`session:${sessionId}:trivias`, JSON.stringify(trivias));
        }
        catch (e) {
            this.logger.warn(`Redis fallback on setActiveTrivias: ${e.message}`);
        }
    }
    async upsertActiveTrivia(sessionId, trivia) {
        try {
            const trivias = await this.getActiveTrivias(sessionId);
            const idx = trivias.findIndex((t) => t.id === trivia.id);
            if (idx >= 0)
                trivias[idx] = trivia;
            else
                trivias.push(trivia);
            await this.setActiveTrivias(sessionId, trivias);
        }
        catch (e) {
            this.logger.warn(`Redis fallback on upsertActiveTrivia: ${e.message}`);
        }
    }
    async removeActiveTrivia(sessionId, triviaId) {
        try {
            const trivias = await this.getActiveTrivias(sessionId);
            await this.setActiveTrivias(sessionId, trivias.filter((t) => t.id !== triviaId));
        }
        catch (e) {
            this.logger.warn(`Redis fallback on removeActiveTrivia: ${e.message}`);
        }
    }
    async getResolvedTrivias(sessionId) {
        try {
            if (!this.client)
                return [];
            const data = await this.client.get(`session:${sessionId}:trivias_resolved`);
            return data ? JSON.parse(data) : [];
        }
        catch (e) {
            return [];
        }
    }
    async addResolvedTrivia(sessionId, trivia) {
        try {
            if (!this.client)
                return;
            const resolved = await this.getResolvedTrivias(sessionId);
            const idx = resolved.findIndex((t) => t.id === trivia.id);
            if (idx >= 0)
                resolved[idx] = trivia;
            else
                resolved.push(trivia);
            await this.client.set(`session:${sessionId}:trivias_resolved`, JSON.stringify(resolved));
        }
        catch (e) {
            this.logger.warn(`Redis fallback on addResolvedTrivia: ${e.message}`);
        }
    }
    async resetSessionState(sessionId) {
        try {
            if (!this.client)
                return;
            await this.client.del(`session:${sessionId}:match`, `session:${sessionId}:trivias`, `session:${sessionId}:trivias_resolved`, `session:${sessionId}:event_number`, `session:${sessionId}:version`, `session:${sessionId}:connected`, `session:${sessionId}:card_active`, `session:${sessionId}:cards_active`, `session:${sessionId}:cards_history`, `session:${sessionId}:mode`);
        }
        catch (e) {
            this.logger.warn(`Redis fallback on resetSessionState: ${e.message}`);
        }
    }
    async getMode(sessionId) {
        try {
            if (!this.client)
                return null;
            return await this.client.get(`session:${sessionId}:mode`);
        }
        catch (e) {
            return null;
        }
    }
    async setMode(sessionId, mode) {
        try {
            if (!this.client)
                return;
            await this.client.set(`session:${sessionId}:mode`, mode);
        }
        catch (e) {
            this.logger.warn(`Redis fallback on setMode: ${e.message}`);
        }
    }
    async getActiveCard(sessionId) {
        try {
            if (!this.client)
                return null;
            const data = await this.client.get(`session:${sessionId}:card_active`);
            return data ? JSON.parse(data) : null;
        }
        catch (e) {
            return null;
        }
    }
    async setActiveCard(sessionId, card) {
        try {
            if (!this.client)
                return;
            await this.client.set(`session:${sessionId}:card_active`, JSON.stringify(card));
        }
        catch (e) {
            this.logger.warn(`Redis fallback on setActiveCard: ${e.message}`);
        }
    }
    async getActiveCards(sessionId) {
        try {
            if (!this.client)
                return [];
            const data = await this.client.get(`session:${sessionId}:cards_active`);
            return data ? JSON.parse(data) : [];
        }
        catch (e) {
            return [];
        }
    }
    async setActiveCards(sessionId, cards) {
        try {
            if (!this.client)
                return;
            await this.client.set(`session:${sessionId}:cards_active`, JSON.stringify(cards));
        }
        catch (e) {
            this.logger.warn(`Redis fallback on setActiveCards: ${e.message}`);
        }
    }
    async addActiveCard(sessionId, card) {
        try {
            if (!this.client)
                return;
            const cards = await this.getActiveCards(sessionId);
            const idx = cards.findIndex((c) => c.id === card.id);
            if (idx >= 0)
                cards[idx] = card;
            else
                cards.push(card);
            await this.setActiveCards(sessionId, cards);
        }
        catch (e) {
            this.logger.warn(`Redis fallback on addActiveCard: ${e.message}`);
        }
    }
    async removeActiveCard(sessionId, cardId) {
        try {
            if (!this.client)
                return;
            const cards = await this.getActiveCards(sessionId);
            const filtered = cards.filter((c) => c.id !== cardId);
            await this.setActiveCards(sessionId, filtered);
        }
        catch (e) {
            this.logger.warn(`Redis fallback on removeActiveCard: ${e.message}`);
        }
    }
    async getCardsHistory(sessionId) {
        try {
            if (!this.client)
                return [];
            const data = await this.client.get(`session:${sessionId}:cards_history`);
            return data ? JSON.parse(data) : [];
        }
        catch (e) {
            return [];
        }
    }
    async addCardToHistory(sessionId, card) {
        try {
            if (!this.client)
                return;
            const history = await this.getCardsHistory(sessionId);
            const idx = history.findIndex((c) => c.id === card.id);
            if (idx >= 0)
                history[idx] = card;
            else
                history.push(card);
            await this.client.set(`session:${sessionId}:cards_history`, JSON.stringify(history));
        }
        catch (e) {
            this.logger.warn(`Redis fallback on addCardToHistory: ${e.message}`);
        }
    }
    async setRewards(barId, rewards) {
        try {
            if (!this.client)
                return;
            await this.client.set(`bar:${barId}:rewards`, JSON.stringify(rewards));
        }
        catch (e) {
            this.logger.warn(`Redis fallback on setRewards: ${e.message}`);
        }
    }
    async getRewards(barId) {
        try {
            if (!this.client)
                return null;
            const data = await this.client.get(`bar:${barId}:rewards`);
            return data ? JSON.parse(data) : null;
        }
        catch (e) {
            return null;
        }
    }
};
exports.RedisSessionCacheService = RedisSessionCacheService;
exports.RedisSessionCacheService = RedisSessionCacheService = RedisSessionCacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], RedisSessionCacheService);
//# sourceMappingURL=redis-session-cache.service.js.map