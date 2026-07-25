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
        return this.redisService.redisClient;
    }
    async incrementVersion(sessionId) {
        if (!this.client)
            return 1;
        return await this.client.incr(`session:${sessionId}:version`);
    }
    async getVersion(sessionId) {
        if (!this.client)
            return 1;
        const v = await this.client.get(`session:${sessionId}:version`);
        return v ? parseInt(v, 10) : 1;
    }
    async incrementEventNumber(sessionId) {
        if (!this.client)
            return 1;
        return await this.client.incr(`session:${sessionId}:event_number`);
    }
    async getEventNumber(sessionId) {
        if (!this.client)
            return 1;
        const n = await this.client.get(`session:${sessionId}:event_number`);
        return n ? parseInt(n, 10) : 0;
    }
    async incrementConnected(sessionId) {
        if (!this.client)
            return 1;
        return await this.client.incr(`session:${sessionId}:connected`);
    }
    async decrementConnected(sessionId) {
        if (!this.client)
            return 0;
        const count = await this.client.decr(`session:${sessionId}:connected`);
        return Math.max(0, count);
    }
    async getConnectedCount(sessionId) {
        if (!this.client)
            return 0;
        const count = await this.client.get(`session:${sessionId}:connected`);
        return count ? Math.max(0, parseInt(count, 10)) : 0;
    }
    async setMatch(sessionId, matchData) {
        if (!this.client)
            return;
        await this.client.set(`session:${sessionId}:match`, JSON.stringify(matchData));
    }
    async getMatch(sessionId) {
        if (!this.client)
            return null;
        const data = await this.client.get(`session:${sessionId}:match`);
        return data ? JSON.parse(data) : null;
    }
    async setCurrentTrivia(sessionId, triviaData) {
        if (!this.client)
            return;
        await this.client.set(`session:${sessionId}:trivia`, JSON.stringify(triviaData));
    }
    async getCurrentTrivia(sessionId) {
        if (!this.client)
            return null;
        const data = await this.client.get(`session:${sessionId}:trivia`);
        return data ? JSON.parse(data) : null;
    }
    async clearCurrentTrivia(sessionId) {
        if (!this.client)
            return;
        await this.client.del(`session:${sessionId}:trivia`);
    }
    async setRewards(barId, rewards) {
        if (!this.client)
            return;
        await this.client.set(`bar:${barId}:rewards`, JSON.stringify(rewards));
    }
    async getRewards(barId) {
        if (!this.client)
            return null;
        const data = await this.client.get(`bar:${barId}:rewards`);
        return data ? JSON.parse(data) : null;
    }
};
exports.RedisSessionCacheService = RedisSessionCacheService;
exports.RedisSessionCacheService = RedisSessionCacheService = RedisSessionCacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], RedisSessionCacheService);
//# sourceMappingURL=redis-session-cache.service.js.map