import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BarModule } from './bar/bar.module';
import { MatchModule } from './match/match.module';
import { LiveModule } from './live/live.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [PrismaModule, BarModule, MatchModule, LiveModule, AuthModule, RedisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
