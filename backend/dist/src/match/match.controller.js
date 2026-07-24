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
exports.MatchController = void 0;
const common_1 = require("@nestjs/common");
const match_service_1 = require("./match.service");
const create_manual_question_dto_1 = require("./dto/create-manual-question.dto");
const sports_api_webhook_dto_1 = require("./dto/sports-api-webhook.dto");
const resolve_question_dto_1 = require("./dto/resolve-question.dto");
let MatchController = class MatchController {
    matchService;
    constructor(matchService) {
        this.matchService = matchService;
    }
    async getLeaderboard(sessionId) {
        return this.matchService.getCurrentLeaderboard(sessionId);
    }
    async getActiveQuestion(sessionId) {
        return this.matchService.getActiveQuestions(sessionId);
    }
    async launchManualQuestion(createManualQuestionDto) {
        return this.matchService.createManualQuestion(createManualQuestionDto);
    }
    async resolveQuestion(dto) {
        return this.matchService.resolveQuestionExpress(dto.questionId, dto.correctOptionId);
    }
    async receiveSportsEvent(sportsApiWebhookDto) {
        return this.matchService.handleSportsWebhook(sportsApiWebhookDto);
    }
};
exports.MatchController = MatchController;
__decorate([
    (0, common_1.Get)('leaderboard/:sessionId'),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MatchController.prototype, "getLeaderboard", null);
__decorate([
    (0, common_1.Get)('questions/active/:sessionId'),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MatchController.prototype, "getActiveQuestion", null);
__decorate([
    (0, common_1.Post)('questions/manual'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_manual_question_dto_1.CreateManualQuestionDto]),
    __metadata("design:returntype", Promise)
], MatchController.prototype, "launchManualQuestion", null);
__decorate([
    (0, common_1.Post)('questions/resolve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [resolve_question_dto_1.ResolveQuestionDto]),
    __metadata("design:returntype", Promise)
], MatchController.prototype, "resolveQuestion", null);
__decorate([
    (0, common_1.Post)('webhooks/sports-provider'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sports_api_webhook_dto_1.SportsApiWebhookDto]),
    __metadata("design:returntype", Promise)
], MatchController.prototype, "receiveSportsEvent", null);
exports.MatchController = MatchController = __decorate([
    (0, common_1.Controller)('match'),
    __metadata("design:paramtypes", [match_service_1.MatchService])
], MatchController);
//# sourceMappingURL=match.controller.js.map