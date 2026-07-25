import { Module, forwardRef } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [PrismaModule, RedisModule, forwardRef(() => SessionModule)],
  providers: [LiveGateway],
  exports: [LiveGateway],
})
export class LiveModule {}
