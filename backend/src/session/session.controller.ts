import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
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

  @Patch(':sessionId/mode')
  async updateModeByParam(
    @Param('sessionId') sessionId: string,
    @Body() body: { mode: 'MATCH' | 'CARDS' | 'PARTY_GAMES' },
  ) {
    return this.sessionEngine.setMode(sessionId, body.mode);
  }

  @Patch('mode')
  async updateModeByBody(
    @Body() body: { sessionId: string; mode: 'MATCH' | 'CARDS' | 'PARTY_GAMES' },
  ) {
    return this.sessionEngine.setMode(body.sessionId, body.mode);
  }

  @Post('start-match')
  async startMatch(
    @Body() body: { sessionId: string; homeTeam: string; awayTeam: string; status?: 'SCHEDULED' | 'LIVE' },
  ) {
    return this.sessionEngine.startMatch(body.sessionId, body.homeTeam, body.awayTeam, body.status || 'SCHEDULED');
  }

  @Post('reset-match')
  async resetMatch(
    @Body() body: { sessionId: string },
  ) {
    return this.sessionEngine.resetMatch(body.sessionId);
  }

  @Post('close')
  async closeSession(
    @Body() body: { sessionId: string },
  ) {
    return this.sessionEngine.closeAndResetSession(body.sessionId);
  }
}
