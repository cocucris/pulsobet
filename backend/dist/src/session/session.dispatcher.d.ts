import { LiveGateway } from '../live/live.gateway';
import { MatchScoreUpdatedEvent, TriviaOpenedEvent, TriviaClosedEvent, TriviaResultEvent, PlayerJoinedEvent, PlayerVotedEvent, LeaderboardUpdatedEvent, MatchStartedEvent, MatchFinishedEvent } from './session.events';
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
}
