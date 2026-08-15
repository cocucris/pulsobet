import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { PartyGamesService } from './party-games.service';
import { SubmitPartyInputDto } from './dto/submit-input.dto';
import { BastaDto } from './dto/basta.dto';
import { CastPartyVoteDto } from './dto/cast-vote.dto';
import { CreatePartyRoundDto } from './dto/create-round.dto';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  // Heredar los mismos tiempos de ping que LiveGateway
  pingInterval: 10000,
  pingTimeout: 30000,
  transports: ['websocket', 'polling'],
})
export class PartyGamesGateway {
  private readonly logger = new Logger(PartyGamesGateway.name);

  constructor(private readonly partyGamesService: PartyGamesService) {}

  // ─── EVENTOS DE JUGADOR (protegidos con JWT) ──────────────────────────────

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('PARTY_SUBMIT_INPUT')
  async handleSubmitInput(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubmitPartyInputDto,
  ) {
    let user = (client as any).user;
    if (!user?.sub && data.playerId) {
      user = { sub: data.playerId };
    }
    if (!user?.sub) {
      client.emit('PARTY_INPUT_REJECTED', { reason: 'Token o jugador no identificado.' });
      return { status: 'rejected' };
    }

    try {
      let sessionId = user.sessionId;
      if (!sessionId) {
        const round = await this.partyGamesService.getActiveRound(data.roundId);
        sessionId = round.sessionId;
      }
      const result = await this.partyGamesService.submitInput(user.sub, sessionId, data);
      client.emit('PARTY_INPUT_ACCEPTED', { roundId: data.roundId });
      return { status: 'accepted', ...result };
    } catch (err) {
      this.logger.warn(`Error en PARTY_SUBMIT_INPUT: ${err.message}`);
      client.emit('PARTY_INPUT_REJECTED', { roundId: data.roundId, reason: err.message });
      return { status: 'rejected', reason: err.message };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('PARTY_BASTA')
  async handleBasta(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: BastaDto,
  ) {
    let user = (client as any).user;
    if (!user?.sub && data.playerId) {
      user = { sub: data.playerId };
    }
    if (!user?.sub) {
      client.emit('PARTY_BASTA_REJECTED', { reason: 'Token o jugador no identificado.' });
      return { status: 'rejected' };
    }

    try {
      let sessionId = user.sessionId;
      if (!sessionId) {
        const round = await this.partyGamesService.getActiveRound(data.roundId);
        sessionId = round.sessionId;
      }
      const result = await this.partyGamesService.submitBasta(user.sub, sessionId, data);
      client.emit('PARTY_BASTA_ACCEPTED', { roundId: data.roundId, isBasta: result.isBasta, answers: data.answers });
      return { status: 'accepted', ...result };
    } catch (err) {
      this.logger.warn(`Error en PARTY_BASTA: ${err.message}`);
      client.emit('PARTY_BASTA_REJECTED', { roundId: data.roundId, reason: err.message });
      return { status: 'rejected', reason: err.message };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('PARTY_CAST_VOTE')
  async handleCastVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CastPartyVoteDto,
  ) {
    let user = (client as any).user;
    if (!user?.sub && (data as any)?.playerId) {
      user = { sub: (data as any).playerId };
    }
    if (!user?.sub) {
      client.emit('PARTY_VOTE_REJECTED', { reason: 'Token o jugador no identificado.' });
      return { status: 'rejected' };
    }

    try {
      await this.partyGamesService.castVote(user.sub, data);
      client.emit('PARTY_VOTE_ACCEPTED', { roundId: data.roundId });
      return { status: 'accepted' };
    } catch (err) {
      this.logger.warn(`Error en PARTY_CAST_VOTE: ${err.message}`);
      client.emit('PARTY_VOTE_REJECTED', { roundId: data.roundId, reason: err.message });
      return { status: 'rejected', reason: err.message };
    }
  }

  // ─── EVENTOS DE ADMIN ─────────────────────────────────────────────────────

  @SubscribeMessage('PARTY_ADMIN_START_ROUND')
  async handleAdminStartRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreatePartyRoundDto,
  ) {
    try {
      const round = await this.partyGamesService.createRound(data);
      return { status: 'ok', round };
    } catch (err) {
      this.logger.warn(`Error en PARTY_ADMIN_START_ROUND: ${err.message}`);
      return { status: 'error', reason: err.message };
    }
  }

  @SubscribeMessage('PARTY_ADMIN_START_COUNTDOWN')
  async handleAdminStartCountdown(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roundId: string },
  ) {
    try {
      await this.partyGamesService.startCountdown(data.roundId);
      return { status: 'ok' };
    } catch (err) {
      this.logger.warn(`Error en PARTY_ADMIN_START_COUNTDOWN: ${err.message}`);
      return { status: 'error', reason: err.message };
    }
  }

  @SubscribeMessage('PARTY_ADMIN_NEXT_PHASE')
  async handleAdminNextPhase(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roundId: string },
  ) {
    try {
      await this.partyGamesService.advancePhase(data.roundId);
      return { status: 'ok' };
    } catch (err) {
      this.logger.warn(`Error en PARTY_ADMIN_NEXT_PHASE: ${err.message}`);
      return { status: 'error', reason: err.message };
    }
  }

  @SubscribeMessage('PARTY_ADMIN_END_ROUND')
  async handleAdminEndRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roundId: string },
  ) {
    try {
      await this.partyGamesService.endRound(data.roundId);
      return { status: 'ok' };
    } catch (err) {
      this.logger.warn(`Error en PARTY_ADMIN_END_ROUND: ${err.message}`);
      return { status: 'error', reason: err.message };
    }
  }
}
