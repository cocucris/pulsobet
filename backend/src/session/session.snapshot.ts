export interface SessionSnapshot {
  sessionId: string;
  barId: string;
  version: number;
  eventNumber: number;
  serverTime: string;

  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    scoreHome: number;
    scoreAway: number;
    status: 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'FINISHED';
    currentMinute: number;
  } | null;

  currentTrivia: {
    id: string;
    questionText: string;
    options: { id: number; text: string; count: number; percentage: number }[];
    pointsReward: number;
    isFlash: boolean;
    expiresAt: string;
    totalVotes: number;
    imageUrl?: string | null;
  } | null;

  leaderboardTop10: {
    rank: number;
    id: string;
    nickname: string;
    totalPoints: number;
    streakCount: number;
  }[];

  myPlayer: {
    id: string;
    nickname: string;
    totalPoints: number;
    hasVotedCurrentTrivia: boolean;
  } | null;

  connectedPlayersCount: number;

  rewards: {
    id: string;
    title: string;
    pointsCost: number;
    stock: number;
  }[];

  barSettings: {
    name: string;
    slug: string;
  };

  connectionStatus: 'connected';
}
