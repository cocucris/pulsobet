import { LiveGateway } from '../live/live.gateway';
import { PartyRoundStartedEvent, PartyPhaseChangedEvent, PartyInputSubmittedEvent, PartyVoteCastEvent, PartyRoundResultEvent, PartyRoundFinishedEvent } from './party-games.events';
export declare class PartyGamesDispatcher {
    private liveGateway;
    private readonly logger;
    constructor(liveGateway: LiveGateway);
    handlePartyRoundStarted(event: PartyRoundStartedEvent): void;
    handlePartyPhaseChanged(event: PartyPhaseChangedEvent): void;
    handlePartyInputSubmitted(event: PartyInputSubmittedEvent): void;
    handlePartyVoteCast(event: PartyVoteCastEvent): void;
    handlePartyRoundResult(event: PartyRoundResultEvent): void;
    handlePartyRoundFinished(event: PartyRoundFinishedEvent): void;
}
