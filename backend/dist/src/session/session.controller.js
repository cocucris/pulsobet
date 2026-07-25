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
exports.SessionController = void 0;
const common_1 = require("@nestjs/common");
const session_engine_1 = require("./session.engine");
let SessionController = class SessionController {
    sessionEngine;
    constructor(sessionEngine) {
        this.sessionEngine = sessionEngine;
    }
    async getSnapshot(sessionId, playerId) {
        return this.sessionEngine.buildSnapshot(sessionId, playerId);
    }
    async startMatch(body) {
        return this.sessionEngine.startMatch(body.sessionId, body.homeTeam, body.awayTeam, body.status || 'SCHEDULED');
    }
};
exports.SessionController = SessionController;
__decorate([
    (0, common_1.Get)('snapshot/:sessionId'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Query)('playerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SessionController.prototype, "getSnapshot", null);
__decorate([
    (0, common_1.Post)('start-match'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SessionController.prototype, "startMatch", null);
exports.SessionController = SessionController = __decorate([
    (0, common_1.Controller)('session'),
    __metadata("design:paramtypes", [session_engine_1.SessionEngine])
], SessionController);
//# sourceMappingURL=session.controller.js.map