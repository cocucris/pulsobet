import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { LiveModule } from '../live/live.module';
import { SessionEngine } from './session.engine';
import { SocketDispatcher } from './session.dispatcher';
import { SessionScheduler } from './session.scheduler';
import { RedisSessionCacheService } from './redis-session-cache.service';
import { SessionController } from './session.controller';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    forwardRef(() => LiveModule),
  ],
  controllers: [SessionController],
  providers: [
    SessionEngine,
    SocketDispatcher,
    SessionScheduler,
    RedisSessionCacheService,
  ],
  exports: [SessionEngine, SessionScheduler, RedisSessionCacheService],
})
export class SessionModule {}
