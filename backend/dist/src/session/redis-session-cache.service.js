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