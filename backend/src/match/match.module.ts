import { Module } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { LiveModule } from '../live/live.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [LiveModule, SessionModule],
  controllers: [MatchController],
  providers: [MatchService],
  exports: [MatchService],
})
export class MatchModule {}
