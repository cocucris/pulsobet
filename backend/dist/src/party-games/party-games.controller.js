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
var PartyGamesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartyGamesController = void 0;
const common_1 = require("@nestjs/common");
const party_games_service_1 = require("./party-games.service");
const create_round_dto_1 = require("./dto/create-round.dto");
const manage_categories_dto_1 = require("./dto/manage-categories.dto");
let PartyGamesController = PartyGamesController_1 = class PartyGamesController {
    partyGamesService;
    logger = new common_1.Logger(PartyGamesController_1.name);
    constructor(partyGamesService) {
        this.partyGamesService = partyGamesService;
    }
    async getCategories(barId) {
        return this.partyGamesService.getCategories(barId);
    }
    async addCategory(barId, dto) {
        return this.partyGamesService.addCategory(barId, dto);
    }
    async deleteCategory(barId, categoryId) {
        return this.partyGamesService.deleteCategory(barId, categoryId);
    }
    async createRound(dto) {
        return this.partyGamesService.createRound(dto);
    }
    async startCountdown(roundId) {
        await this.partyGamesService.startCountdown(roundId);
        return { status: 'ok' };
    }
    async advancePhase(roundId) {
        await this.partyGamesService.advancePhase(roundId);
        return { status: 'ok' };
    }
    async endRound(roundId) {
        await this.partyGamesService.endRound(roundId);
        return { status: 'ok' };
    }
    async endGame(sessionId) {
        return this.partyGamesService.endGame(sessionId);
    }
    async submitBasta(roundId, body) {
        const round = await this.partyGamesService.getActiveRound(roundId);
        return this.partyGamesService.submitBasta(body.playerId, round.sessionId, {
            roundId,
            answers: body.answers,
        });
    }
    async submitInput(roundId, body) {
        const round = await this.partyGamesService.getActiveRound(roundId);
        return this.partyGamesService.submitInput(body.playerId, round.sessionId, {
            roundId,
            content: body.content,
        });
    }
    async castVote(roundId, body) {
        return this.partyGamesService.castVote(body.playerId, {
            roundId,
            targetId: body.targetId,
        });
    }
    async getActiveRound(sessionId) {
        return this.partyGamesService.getActiveRoundForSession(sessionId);
    }
};
exports.PartyGamesController = PartyGamesController;
__decorate([
    (0, common_1.Get)('categories/:barId'),
    __param(0, (0, common_1.Param)('barId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartyGamesController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Post)('categories/:barId'),
    __param(0, (0, common_1.Param)('barId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, manage_categories_dto_1.ManageCategoryDto]),
    __metadata("design:returntype", Promise)
], PartyGamesController.prototype, "addCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:barId/:categoryId'),
    __param(0, (0, common_1.Param)('barId')),
    __param(1, (0, common_1.Param)('categoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PartyGamesController.prototype, "deleteCategory", null);
__decorate([
    (0, common_1.Post)('rounds'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_round_dto_1.CreatePartyRoundDto]),
    __metadata("design:returntype", Promise)
], PartyGamesController.prototype, "createRound", null);
__decorate([
    (0, common_1.Post)('rounds/:roundId/start'),
    __param(0, (0, common_1.Param)('roundId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartyGamesController.prototype, "startCountdown", null);
__decorate([
    (0, common_1.Post)('rounds/:roundId/advance'),
    __param(0, (0, common_1.Param)('roundId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartyGamesController.prototype, "advancePhase", null);
__decorate([
    (0, common_1.Post)('rounds/:roundId/end'),
    __param(0, (0, common_1.Param)('roundId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartyGamesController.prototype, "endRound", null);
__decorate([
    (0, common_1.Post)('game/end/:sessionId'),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartyGamesController.prototype, "endGame", null);
__decorate([
    (0, common_1.Post)('rounds/:roundId/basta'),
    __param(0, (0, common_1.Param)('roundId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PartyGamesController.prototype, "submitBasta", null);
__decorate([
    (0, common_1.Post)('rounds/:roundId/input'),
    __param(0, (0, common_1.Param)('roundId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PartyGamesController.prototype, "submitInput", null);
__decorate([
    (0, common_1.Post)('rounds/:roundId/vote'),
    __param(0, (0, common_1.Param)('roundId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PartyGamesController.prototype, "castVote", null);
__decorate([
    (0, common_1.Get)('rounds/active/:sessionId'),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartyGamesController.prototype, "getActiveRound", null);
exports.PartyGamesController = PartyGamesController = PartyGamesController_1 = __decorate([
    (0, common_1.Controller)('party-games'),
    __metadata("design:paramtypes", [party_games_service_1.PartyGamesService])
], PartyGamesController);
//# sourceMappingURL=party-games.controller.js.map