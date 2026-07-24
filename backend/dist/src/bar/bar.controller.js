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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarController = void 0;
const common_1 = require("@nestjs/common");
const bar_service_1 = require("./bar.service");
const redeem_reward_dto_1 = require("./dto/redeem-reward.dto");
const analytics_query_dto_1 = require("./dto/analytics-query.dto");
let BarController = class BarController {
    barService;
    constructor(barService) {
        this.barService = barService;
    }
    async getRewardsForSession(sessionId) {
        return this.barService.getAvailableRewards(sessionId);
    }
    async getPlayerProfile(playerId) {
        return this.barService.getPlayerProfile(playerId);
    }
    async getPlayerByNickname(sessionId, nickname) {
        return this.barService.getPlayerByNickname(sessionId, nickname);
    }
    async clientClaimReward(body, req) {
        const targetPlayerId = body.playerId || req.user?.sub;
        return this.barService.claimRewardInstant(targetPlayerId, body.rewardId);
    }
    async staffRedeemReward(redeemRewardDto, req) {
        const barId = req.user?.barId || 'local-kilkenny-test';
        return this.barService.redeemRewardCode(barId, redeemRewardDto.claimCode);
    }
    async getAnalytics(query) {
        const barId = 'local-kilkenny-test';
        return this.barService.getBarAnalytics(barId, query);
    }
    async exportCsv(query, res) {
        const barId = 'local-kilkenny-test';
        const csvContent = await this.barService.exportClaimsReport(barId, query);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=reporte_contable_${barId}_${query.preset}.csv`);
        return res.send(csvContent);
    }
};
exports.BarController = BarController;
__decorate([
    (0, common_1.Get)('rewards/list/:sessionId'),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BarController.prototype, "getRewardsForSession", null);
__decorate([
    (0, common_1.Get)('player/:playerId'),
    __param(0, (0, common_1.Param)('playerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BarController.prototype, "getPlayerProfile", null);
__decorate([
    (0, common_1.Get)('player/by-nickname/:sessionId/:nickname'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Param)('nickname')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BarController.prototype, "getPlayerByNickname", null);
__decorate([
    (0, common_1.Post)('rewards/claim'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BarController.prototype, "clientClaimReward", null);
__decorate([
    (0, common_1.Post)('rewards/redeem'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [redeem_reward_dto_1.RedeemRewardDto, Object]),
    __metadata("design:returntype", Promise)
], BarController.prototype, "staffRedeemReward", null);
__decorate([
    (0, common_1.Get)('analytics'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analytics_query_dto_1.AnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], BarController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)('analytics/export-csv'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analytics_query_dto_1.AnalyticsQueryDto, Object]),
    __metadata("design:returntype", Promise)
], BarController.prototype, "exportCsv", null);
exports.BarController = BarController = __decorate([
    (0, common_1.Controller)('bar'),
    __metadata("design:paramtypes", [bar_service_1.BarService])
], BarController);
//# sourceMappingURL=bar.controller.js.map