"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartyGamesModule = void 0;
const common_1 = require("@nestjs/common");
const party_games_service_1 = require("./party-games.service");
const party_games_controller_1 = require("./party-games.controller");
const party_games_gateway_1 = require("./party-games.gateway");
const party_games_dispatcher_1 = require("./party-games.dispatcher");
const prisma_module_1 = require("../prisma/prisma.module");
const redis_module_1 = require("../redis/redis.module");
const session_module_1 = require("../session/session.module");
const live_module_1 = require("../live/live.module");
let PartyGamesModule = class PartyGamesModule {
};
exports.PartyGamesModule = PartyGamesModule;
exports.PartyGamesModule = PartyGamesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            (0, common_1.forwardRef)(() => session_module_1.SessionModule),
            (0, common_1.forwardRef)(() => live_module_1.LiveModule),
        ],
        controllers: [party_games_controller_1.PartyGamesController],
        providers: [party_games_service_1.PartyGamesService, party_games_gateway_1.PartyGamesGateway, party_games_dispatcher_1.PartyGamesDispatcher],
        exports: [party_games_service_1.PartyGamesService],
    })
], PartyGamesModule);
//# sourceMappingURL=party-games.module.js.map