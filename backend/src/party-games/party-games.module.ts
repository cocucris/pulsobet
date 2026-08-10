import { Module, forwardRef } from '@nestjs/common';
import { PartyGamesService } from './party-games.service';
import { PartyGamesController } from './party-games.controller';
import { PartyGamesGateway } from './party-games.gateway';
import { PartyGamesDispatcher } from './party-games.dispatcher';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SessionModule } from '../session/session.module';
import { LiveModule } from '../live/live.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    forwardRef(() => SessionModule), // Usa SessionScheduler + RedisSessionCacheService
    forwardRef(() => LiveModule),    // Usa LiveGateway para broadcasts
  ],
  controllers: [PartyGamesController],
  providers: [PartyGamesService, PartyGamesGateway, PartyGamesDispatcher],
  exports: [PartyGamesService],
})
export class PartyGamesModule {}
