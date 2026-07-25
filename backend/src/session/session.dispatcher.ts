import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LiveGateway } from '../live/live.gateway';
import {
  MatchScoreUpdatedEvent,
  TriviaCreatedEvent,
  TriviaOpenedEvent,
  TriviaClosedEvent,
  TriviaResultEvent,
  PlayerJoinedEvent,
  PlayerVotedEvent,
  LeaderboardUpdatedEvent,
  RewardReservedEvent,
  RewardDeliveredEvent,
  MatchStartedEvent,
  MatchFinishedEvent,
} from './session.events';

@Injectable()
export class SocketDispatcher {
  private readonly logger = new Logger(SocketDispatcher.name);

  constructor(private liveGateway: LiveGateway) {}

  @OnEvent('match.score.updated')
  handleMatchScoreUpdated(event: MatchScoreUpdatedEvent) {
    this.logger.log(`[Dispatcher] Broadcast MATCH_SCORE_UPDATED a sesión ${event.sessionId}`);
    this.liveGateway.broadcastToSession(event.sessionId, 'MATCH_SCORE_UPDATED', {
      scoreHome: event.scoreHome,
      scoreAway: event.scoreAway,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      eventNumber: event.eventNumber,
    });
  }

  @OnEvent('match.started')
  handleMatchStarted(event: MatchStartedEvent) {
    this.logger.log(`[Dispatcher] Broadcast MATCH_STARTED a sesión ${event.sessionId}`);
    this.liveGateway.broadcastToSession(event.sessionId, 'MATCH_STARTED', {
      match: event.match,
      eventNumber: event.eventNumber,
    });
  }

  @OnEvent('match.finished')
  handleMatchFinished(event: MatchFinishedEvent) {
    this.logger.log(`[Dispatcher] Broadcast MATCH_FINISHED a sesión ${event.sessionId}`);
    this.liveGateway.broadcastToSession(event.sessionId, 'MATCH_FINISHED', {
      match: event.match,
      eventNumber: event.eventNumber,
    });
  }

  @OnEvent('trivia.opened')
  handleTriviaOpened(event: TriviaOpenedEvent) {
    this.logger.log(`[Dispatcher] Broadcast TRIVIA_OPENED a sesión ${event.sessionId}`);
    this.liveGateway.broadcastToSession(event.sessionId, 'TRIVIA_OPENED', {
      trivia: event.trivia,
      eventNumber: event.eventNumber,
    });
    // Emitir también compatibilidad hacia atrás
    this.liveGateway.broadcastToSession(event.sessionId, 'new_question_active', event.trivia);
  }

  @OnEvent('trivia.closed')
  handleTriviaClosed(event: TriviaClosedEvent) {
    this.logger.log(`[Dispatcher] Broadcast TRIVIA_CLOSED a sesión ${event.sessionId}`);
    this.liveGateway.broadcastToSession(event.sessionId, 'TRIVIA_CLOSED', {
      triviaId: event.triviaId,
      eventNumber: event.eventNumber,
    });
    this.liveGateway.broadcastToSession(event.sessionId, 'question_resolved', {});
  }

  @OnEvent('trivia.result')
  handleTriviaResult(event: TriviaResultEvent) {
    this.logger.log(`[Dispatcher] Broadcast TRIVIA_RESULT a sesión ${event.sessionId}`);
    this.liveGateway.broadcastToSession(event.sessionId, 'TRIVIA_RESULT', {
      triviaId: event.triviaId,
      correctOptionId: event.correctOptionId,
      winnersCount: event.winnersCount,
      leaderboard: event.leaderboard,
      eventNumber: event.eventNumber,
    });
    this.liveGateway.broadcastToSession(event.sessionId, 'leaderboard_update', event.leaderboard);
  }

  @OnEvent('player.joined')
  handlePlayerJoined(event: PlayerJoinedEvent) {
    this.logger.log(`[Dispatcher] Broadcast PLAYER_JOINED a sesión ${event.sessionId}`);
    this.liveGateway.broadcastToSession(event.sessionId, 'PLAYER_JOINED', {
      player: event.player,
      eventNumber: event.eventNumber,
    });
    this.liveGateway.broadcastToSession(event.sessionId, 'player_joined', { nickname: event.player.nickname });
  }

  @OnEvent('player.voted')
  handlePlayerVoted(event: PlayerVotedEvent) {
    this.logger.log(`[Dispatcher] Broadcast PLAYER_VOTED a sesión ${event.sessionId}`);
    this.liveGateway.broadcastToSession(event.sessionId, 'PLAYER_VOTED', {
      triviaId: event.triviaId,
      options: event.options,
      totalVotes: event.totalVotes,
      eventNumber: event.eventNumber,
    });
  }

  @OnEvent('leaderboard.updated')
  handleLeaderboardUpdated(event: LeaderboardUpdatedEvent) {
    this.logger.log(`[Dispatcher] Broadcast LEADERBOARD_UPDATED a sesión ${event.sessionId}`);
    this.liveGateway.broadcastToSession(event.sessionId, 'LEADERBOARD_UPDATED', {
      leaderboard: event.leaderboard,
      eventNumber: event.eventNumber,
    });
    this.liveGateway.broadcastToSession(event.sessionId, 'leaderboard_update', event.leaderboard);
  }
}
