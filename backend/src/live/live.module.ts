import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';

@Module({
  providers: [LiveGateway],
  exports: [LiveGateway], // Lo exportamos para que MatchService pueda usarlo al resolver eventos
})
export class LiveModule {}
