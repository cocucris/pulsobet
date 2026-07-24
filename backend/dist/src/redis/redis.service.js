"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisService = RedisService_1 = class RedisService {
    redisClient;
    logger = new common_1.Logger(RedisService_1.name);
    onModuleInit() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.redisClient = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: 3,
        });
        this.redisClient.on('connect', () => {
            this.logger.log('Conexión exitosa a la infraestructura de Redis/Dragonfly 🚀');
        });
        this.redisClient.on('error', (err) => {
            this.logger.error('Error en la conexión de Redis:', err);
        });
    }
    onModuleDestroy() {
        this.redisClient.disconnect();
    }
    async incrementPlayerScore(sessionId, playerId, points) {
        const key = `leaderboard:${sessionId}`;
        const newScore = await this.redisClient.zincrby(key, points, playerId);
        return parseFloat(newScore);
    }
    async setPlayerScore(sessionId, playerId, points) {
        const key = `leaderboard:${sessionId}`;
        await this.redisClient.zadd(key, points, playerId);
    }
    async getTopPlayers(sessionId, limit = 10) {
        const key = `leaderboard:${sessionId}`;
        const results = await this.redisClient.zrevrange(key, 0, limit - 1, 'WITHSCORES');
        const formatted = [];
        for (let i = 0; i < results.length; i += 2) {
            formatted.push({
                playerId: results[i],
                score: parseFloat(results[i + 1]),
            });
        }
        return formatted;
    }
    async clearLeaderboard(sessionId) {
        await this.redisClient.del(`leaderboard:${sessionId}`);
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)()
], RedisService);
//# sourceMappingURL=redis.service.js.map