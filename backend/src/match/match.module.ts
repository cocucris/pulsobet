import { Module } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { LiveModule } from '../live/live.module'; // Importante para usar el Gateway

@Module({
  imports: [LiveModule],
  controllers: [MatchController],
  providers: [MatchService],
  exports: [MatchService],
})
export class MatchModule {}
