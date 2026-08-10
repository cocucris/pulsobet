import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LiveGateway } from '../live/live.gateway';
import {
  PartyRoundStartedEvent,
  PartyPhaseChangedEvent,
  PartyInputSubmittedEvent,
  PartyVoteCastEvent,
  PartyRoundResultEvent,
  PartyRoundFinishedEvent,
  PartyBastaCalledEvent,
  PartyGameOverEvent,
} from './party-games.events';

@Injectable()
export class PartyGamesDispatcher {
  private readonly logger = new Logger(PartyGamesDispatcher.name);

  constructor(
    @Inject(forwardRef(() => LiveGateway))
    private liveGateway: LiveGateway,
  ) {}

  @OnEvent('party.round.started')
  handlePartyRoundStarted(event: PartyRoundStartedEvent) {
    try {
      this.logger.log(`[PartyDispatcher] PARTY_ROUND_STARTED → sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_ROUND_STARTED', {
        round: event.round,
        eventNumber: event.eventNumber,
      });
    } catch (e) {
      this.logger.error(`Error en handlePartyRoundStarted: ${e.message}`);
    }
  }

  @OnEvent('party.phase.changed')
  handlePartyPhaseChanged(event: PartyPhaseChangedEvent) {
    try {
      this.logger.log(`[PartyDispatcher] PARTY_PHASE_CHANGED (${event.phase}) → sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_PHASE_CHANGED', {
        roundId: event.roundId,
        phase: event.phase,
        payload: event.payload,
        eventNumber: event.eventNumber,
      });
    } catch (e) {
      this.logger.error(`Error en handlePartyPhaseChanged: ${e.message}`);
    }
  }

  @OnEvent('party.input.submitted')
  handlePartyInputSubmitted(event: PartyInputSubmittedEvent) {
    try {
      this.logger.log(`[PartyDispatcher] PARTY_INPUT_PROGRESS (${event.submittedCount}/${event.totalPlayers}) → sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_INPUT_PROGRESS', {
        roundId: event.roundId,
        submittedCount: event.submittedCount,
        totalPlayers: event.totalPlayers,
        eventNumber: event.eventNumber,
      });
    } catch (e) {
      this.logger.error(`Error en handlePartyInputSubmitted: ${e.message}`);
    }
  }

  @OnEvent('party.vote.cast')
  handlePartyVoteCast(event: PartyVoteCastEvent) {
    try {
      this.logger.log(`[PartyDispatcher] PARTY_VOTE_UPDATED → sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_VOTE_UPDATED', {
        roundId: event.roundId,
        votes: event.votes,
        eventNumber: event.eventNumber,
      });
    } catch (e) {
      this.logger.error(`Error en handlePartyVoteCast: ${e.message}`);
    }
  }

  @OnEvent('party.round.result')
  handlePartyRoundResult(event: PartyRoundResultEvent) {
    try {
      this.logger.log(`[PartyDispatcher] PARTY_ROUND_RESULT → sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_ROUND_RESULT', {
        roundId: event.roundId,
        results: event.results,
        leaderboard: event.leaderboard,
        eventNumber: event.eventNumber,
      });
      // También emitir leaderboard_update para compatibilidad con TV/frontend existente
      this.liveGateway.broadcastToSession(event.sessionId, 'leaderboard_update', event.leaderboard);
    } catch (e) {
      this.logger.error(`Error en handlePartyRoundResult: ${e.message}`);
    }
  }

  @OnEvent('party.round.finished')
  handlePartyRoundFinished(event: PartyRoundFinishedEvent) {
    try {
      this.logger.log(`[PartyDispatcher] PARTY_ROUND_FINISHED → sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_ROUND_FINISHED', {
        roundId: event.roundId,
        eventNumber: event.eventNumber,
      });
    } catch (e) {
      this.logger.error(`Error en handlePartyRoundFinished: ${e.message}`);
    }
  }

  @OnEvent('party.basta.called')
  handlePartyBastaCalled(event: PartyBastaCalledEvent) {
    try {
      this.logger.log(`[PartyDispatcher] PARTY_BASTA_CALLED (${event.nickname}) → sesión ${event.sessionId}`);
      // Broadcast global: congela los inputs de TV y de TODOS los celulares
      this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_BASTA_CALLED', {
        roundId: event.roundId,
        playerId: event.playerId,
        nickname: event.nickname,
        eventNumber: event.eventNumber,
      });
    } catch (e) {
      this.logger.error(`Error en handlePartyBastaCalled: ${e.message}`);
    }
  }

  @OnEvent('party.game.over')
  handlePartyGameOver(event: PartyGameOverEvent) {
    try {
      this.logger.log(`[PartyDispatcher] PARTY_GAME_OVER → sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'PARTY_GAME_OVER', {
        gameType: event.gameType,
        leaderboard: event.finalLeaderboard,
        eventNumber: event.eventNumber,
      });
    } catch (e) {
      this.logger.error(`Error en handlePartyGameOver: ${e.message}`);
    }
  }
}
