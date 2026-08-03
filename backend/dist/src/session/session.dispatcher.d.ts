import { LiveGateway } from '../live/live.gateway';
import { MatchScoreUpdatedEvent, TriviaOpenedEvent, TriviaClosedEvent, TriviaResultEvent, PlayerJoinedEvent, PlayerVotedEvent, LeaderboardUpdatedEvent, RewardReservedEvent, RewardDeliveredEvent, MatchStartedEvent, MatchFinishedEvent, SessionResetEvent, CardSubmittedEvent, CardPublishedEvent, CardVoteUpdatedEvent, CardClosedEvent, SessionModeChangedEvent } from './session.events';
export declare class SocketDispatcher {
    private liveGateway;
    private readonly logger;
    constructor(liveGateway: LiveGateway);
    handleMatchScoreUpdated(event: MatchScoreUpdatedEvent): void;
    handleMatchStarted(event: MatchStartedEvent): void;
    handleMatchFinished(event: MatchFinishedEvent): void;
    handleTriviaOpened(event: TriviaOpenedEvent): void;
    handleTriviaClosed(event: TriviaClosedEvent): void;
    handleTriviaResult(event: TriviaResultEvent): void;
    handlePlayerJoined(event: PlayerJoinedEvent): void;
    handlePlayerVoted(event: PlayerVotedEvent): void;
    handleLeaderboardUpdated(event: LeaderboardUpdatedEvent): void;
    handleRewardReserved(event: RewardReservedEvent): void;
    handleRewardDelivered(event: RewardDeliveredEvent): void;
    handleSessionReset(event: SessionResetEvent): void;
    handleCardSubmitted(event: CardSubmittedEvent): void;
    handleCardPublished(event: CardPublishedEvent): void;
    handleCardVoteUpdated(event: CardVoteUpdatedEvent): void;
    handleCardClosed(event: CardClosedEvent): void;
    handleSessionModeChanged(event: SessionModeChangedEvent): void;
}
