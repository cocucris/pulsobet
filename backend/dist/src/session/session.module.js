"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionModule = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_module_1 = require("../prisma/prisma.module");
const redis_module_1 = require("../redis/redis.module");
const live_module_1 = require("../live/live.module");
const session_engine_1 = require("./session.engine");
const session_dispatcher_1 = require("./session.dispatcher");
const session_scheduler_1 = require("./session.scheduler");
const redis_session_cache_service_1 = require("./redis-session-cache.service");
const session_controller_1 = require("./session.controller");
let SessionModule = class SessionModule {
};
exports.SessionModule = SessionModule;
exports.SessionModule = SessionModule = __decorate([
    (0, common_1.Module)({
        imports: [
            event_emitter_1.EventEmitterModule.forRoot(),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            live_module_1.LiveModule,
        ],
        controllers: [session_controller_1.SessionController],
        providers: [
            session_engine_1.SessionEngine,
            session_dispatcher_1.SocketDispatcher,
            session_scheduler_1.SessionScheduler,
            redis_session_cache_service_1.RedisSessionCacheService,
        ],
        exports: [session_engine_1.SessionEngine, session_scheduler_1.SessionScheduler, redis_session_cache_service_1.RedisSessionCacheService],
    })
], SessionModule);
//# sourceMappingURL=session.module.js.map