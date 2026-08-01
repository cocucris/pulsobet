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
    try {
      this.logger.log(`[Dispatcher] Broadcast MATCH_SCORE_UPDATED a sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'MATCH_SCORE_UPDATED', {
        scoreHome: event.scoreHome,
        scoreAway: event.scoreAway,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        status: event.status,
        eventNumber: event.eventNumber,
      });
    } catch (e) {
      this.logger.error(`Error en handleMatchScoreUpdated: ${e.message}`);
    }
  }

  @OnEvent('match.started')
  handleMatchStarted(event: MatchStartedEvent) {
    try {
      this.logger.log(`[Dispatcher] Broadcast MATCH_STARTED a sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'MATCH_STARTED', {
        ...event.match,
        eventNumber: event.eventNumber,
      });
    } catch (e) {
      this.logger.error(`Error en handleMatchStarted: ${e.message}`);
    }
  }

  @OnEvent('match.finished')
  handleMatchFinished(event: MatchFinishedEvent) {
    try {
      this.logger.log(`[Dispatcher] Broadcast MATCH_FINISHED a sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'MATCH_FINISHED', {
        ...event.match,
        eventNumber: event.eventNumber,
      });
    } catch (e) {
      this.logger.error(`Error en handleMatchFinished: ${e.message}`);
    }
  }

  @OnEvent('trivia.opened')
  handleTriviaOpened(event: TriviaOpenedEvent) {
    try {
      this.logger.log(`[Dispatcher] Broadcast TRIVIA_OPENED a sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'TRIVIA_OPENED', {
        trivia: event.trivia,
        eventNumber: event.eventNumber,
      });
      this.liveGateway.broadcastToSession(event.sessionId, 'new_question_active', event.trivia);
    } catch (e) {
      this.logger.error(`Error en handleTriviaOpened: ${e.message}`);
    }
  }

  @OnEvent('trivia.closed')
  handleTriviaClosed(event: TriviaClosedEvent) {
    try {
      this.logger.log(`[Dispatcher] Broadcast TRIVIA_CLOSED a sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'TRIVIA_CLOSED', {
        triviaId: event.triviaId,
        eventNumber: event.eventNumber,
      });
      this.liveGateway.broadcastToSession(event.sessionId, 'question_resolved', {});
    } catch (e) {
      this.logger.error(`Error en handleTriviaClosed: ${e.message}`);
    }
  }

  @OnEvent('trivia.result')
  handleTriviaResult(event: TriviaResultEvent) {
    try {
      this.logger.log(`[Dispatcher] Broadcast TRIVIA_RESULT a sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'TRIVIA_RESULT', {
        triviaId: event.triviaId,
        correctOptionId: event.correctOptionId,
        winnersCount: event.winnersCount,
        leaderboard: event.leaderboard,
        eventNumber: event.eventNumber,
      });
      this.liveGateway.broadcastToSession(event.sessionId, 'leaderboard_update', event.leaderboard);
    } catch (e) {
      this.logger.error(`Error en handleTriviaResult: ${e.message}`);
    }
  }

  @OnEvent('player.joined')
  handlePlayerJoined(event: PlayerJoinedEvent) {
    try {
      this.logger.log(`[Dispatcher] Broadcast PLAYER_JOINED a sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'PLAYER_JOINED', {
        player: event.player,
        eventNumber: event.eventNumber,
      });
      this.liveGateway.broadcastToSession(event.sessionId, 'player_joined', { nickname: event.player.nickname });
    } catch (e) {
      this.logger.error(`Error en handlePlayerJoined: ${e.message}`);
    }
  }

  @OnEvent('player.voted')
  handlePlayerVoted(event: PlayerVotedEvent) {
    try {
      this.logger.log(`[Dispatcher] Broadcast PLAYER_VOTED a sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'PLAYER_VOTED', {
        triviaId: event.triviaId,
        options: event.options,
        totalVotes: event.totalVotes,
        eventNumber: event.eventNumber,
      });
    } catch (e) {
      this.logger.error(`Error en handlePlayerVoted: ${e.message}`);
    }
  }

  @OnEvent('leaderboard.updated')
  handleLeaderboardUpdated(event: LeaderboardUpdatedEvent) {
    try {
      this.logger.log(`[Dispatcher] Broadcast LEADERBOARD_UPDATED a sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'LEADERBOARD_UPDATED', {
        leaderboard: event.leaderboard,
        eventNumber: event.eventNumber,
      });
      this.liveGateway.broadcastToSession(event.sessionId, 'leaderboard_update', event.leaderboard);
    } catch (e) {
      this.logger.error(`Error en handleLeaderboardUpdated: ${e.message}`);
    }
  }

  @OnEvent('reward.reserved')
  handleRewardReserved(event: RewardReservedEvent) {
    try {
      this.logger.log(`[Dispatcher] Broadcast REWARD_RESERVED a sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'REWARD_RESERVED', {
        claimCode: event.claimCode,
        rewardTitle: event.rewardTitle,
        playerNickname: event.playerNickname,
        eventNumber: event.eventNumber,
      });
    } catch (e) {
      this.logger.error(`Error en handleRewardReserved: ${e.message}`);
    }
  }

  @OnEvent('reward.delivered')
  handleRewardDelivered(event: RewardDeliveredEvent) {
    try {
      this.logger.log(`[Dispatcher] Broadcast REWARD_DELIVERED a sesión ${event.sessionId}`);
      this.liveGateway.broadcastToSession(event.sessionId, 'REWARD_DELIVERED', {
        claimCode: event.claimCode,
        rewardTitle: event.rewardTitle,
        playerNickname: event.playerNickname,
        eventNumber: event.eventNumber,
      });
    } catch (e) {
      this.logger.error(`Error en handleRewardDelivered: ${e.message}`);
    }
  }
}
