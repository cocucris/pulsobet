"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const bar_module_1 = require("./bar/bar.module");
const match_module_1 = require("./match/match.module");
const live_module_1 = require("./live/live.module");
const auth_module_1 = require("./auth/auth.module");
const redis_module_1 = require("./redis/redis.module");
const session_module_1 = require("./session/session.module");
const cards_module_1 = require("./cards/cards.module");
const party_games_module_1 = require("./party-games/party-games.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, bar_module_1.BarModule, match_module_1.MatchModule, live_module_1.LiveModule, auth_module_1.AuthModule, redis_module_1.RedisModule, session_module_1.SessionModule, cards_module_1.CardsModule, party_games_module_1.PartyGamesModule],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map