import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { SessionEngine } from './session.engine';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionEngine: SessionEngine) {}

  @Get('snapshot/:sessionId')
  async getSnapshot(
    @Param('sessionId') sessionId: string,
    @Query('playerId') playerId?: string,
  ) {
    return this.sessionEngine.buildSnapshot(sessionId, playerId);
  }

  @Post('start-match')
  async startMatch(
    @Body() body: { sessionId: string; homeTeam: string; awayTeam: string; status?: 'SCHEDULED' | 'LIVE' },
  ) {
    return this.sessionEngine.startMatch(body.sessionId, body.homeTeam, body.awayTeam, body.status || 'SCHEDULED');
  }
}
