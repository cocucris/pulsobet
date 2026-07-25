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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchService = void 0;
const common_1 = require("@nestjs/common");
const session_engine_1 = require("../session/session.engine");
const prisma_service_1 = require("../prisma/prisma.service");
let MatchService = class MatchService {
    sessionEngine;
    prisma;
    constructor(sessionEngine, prisma) {
        this.sessionEngine = sessionEngine;
        this.prisma = prisma;
    }
    async createManualQuestion(dto) {
        return this.sessionEngine.createManualQuestion(dto);
    }
    async resolveQuestionExpress(questionId, correctOptionId) {
        return this.sessionEngine.resolveQuestionExpress(questionId, correctOptionId);
    }
    async updateMatchScore(dto) {
        return this.sessionEngine.updateScore(dto.matchId, dto.scoreHome, dto.scoreAway, dto.homeTeam, dto.awayTeam, dto.currentMinute);
    }
    async updateLiveQuestion(id, dto) {
        return this.sessionEngine.updateLiveQuestion(id, dto);
    }
    async getCurrentLeaderboard(sessionId) {
        const snapshot = await this.sessionEngine.buildSnapshot(sessionId);
        return snapshot.leaderboardTop10;
    }
    async getLiveMatch(sessionId) {
        const snapshot = await this.sessionEngine.buildSnapshot(sessionId);
        return snapshot.match;
    }
    async getActiveQuestions(sessionId) {
        const snapshot = await this.sessionEngine.buildSnapshot(sessionId);
        return snapshot.currentTrivia ? [snapshot.currentTrivia] : [];
    }
    async handleSportsWebhook(dto) {
        const match = await this.prisma.match.findUnique({
            where: { apiFootballId: dto.fixtureId },
        });
        if (!match)
            return { status: 'ignored', reason: 'Match not found' };
        if (dto.event === 'GOAL') {
            const isHome = dto.details?.team === 'HOME';
            const newHome = isHome ? match.scoreHome + 1 : match.scoreHome;
            const newAway = !isHome ? match.scoreAway + 1 : match.scoreAway;
            return this.sessionEngine.updateScore(match.id, newHome, newAway, match.homeTeam, match.awayTeam, dto.details?.minute || match.currentMinute);
        }
        return { status: 'processed' };
    }
};
exports.MatchService = MatchService;
exports.MatchService = MatchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [session_engine_1.SessionEngine,
        prisma_service_1.PrismaService])
], MatchService);
//# sourceMappingURL=match.service.js.map