"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveModule = void 0;
const common_1 = require("@nestjs/common");
const live_gateway_1 = require("./live.gateway");
const prisma_module_1 = require("../prisma/prisma.module");
const redis_module_1 = require("../redis/redis.module");
const session_module_1 = require("../session/session.module");
let LiveModule = class LiveModule {
};
exports.LiveModule = LiveModule;
exports.LiveModule = LiveModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, redis_module_1.RedisModule, (0, common_1.forwardRef)(() => session_module_1.SessionModule)],
        providers: [live_gateway_1.LiveGateway],
        exports: [live_gateway_1.LiveGateway],
    })
], LiveModule);
//# sourceMappingURL=live.module.js.map