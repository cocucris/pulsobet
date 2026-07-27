export class MatchScoreUpdatedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly scoreHome: number,
    public readonly scoreAway: number,
    public readonly homeTeam: string,
    public readonly awayTeam: string,
    public readonly status: string,
    public readonly eventNumber: number,
  ) {}
}

export class TriviaCreatedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly trivia: any,
    public readonly eventNumber: number,
  ) {}
}

export class TriviaOpenedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly trivia: any,
    public readonly eventNumber: number,
  ) {}
}

export class TriviaClosedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly triviaId: string,
    public readonly eventNumber: number,
  ) {}
}

export class TriviaResultEvent {
  constructor(
    public readonly sessionId: string,
    public readonly triviaId: string,
    public readonly correctOptionId: number,
    public readonly winnersCount: number,
    public readonly leaderboard: any[],
    public readonly eventNumber: number,
  ) {}
}

export class PlayerJoinedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly player: { id: string; nickname: string; tableNumber: string | null },
    public readonly eventNumber: number,
  ) {}
}

export class PlayerVotedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly triviaId: string,
    public readonly options: any[],
    public readonly totalVotes: number,
    public readonly eventNumber: number,
  ) {}
}

export class LeaderboardUpdatedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly leaderboard: any[],
    public readonly eventNumber: number,
  ) {}
}

export class RewardReservedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly claimCode: string,
    public readonly rewardTitle: string,
    public readonly playerNickname: string,
    public readonly eventNumber: number,
  ) {}
}

export class RewardDeliveredEvent {
  constructor(
    public readonly sessionId: string,
    public readonly claimCode: string,
    public readonly rewardTitle: string,
    public readonly playerNickname: string,
    public readonly eventNumber: number,
  ) {}
}

export class MatchStartedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly match: any,
    public readonly eventNumber: number,
  ) {}
}

export class MatchFinishedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly match: any,
    public readonly eventNumber: number,
  ) {}
}
