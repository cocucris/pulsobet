import { create } from 'zustand';

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

interface SessionStoreState {
  snapshot: SessionSnapshot | null;
  lastEventNumber: number;
  isConnected: boolean;

  setConnected: (connected: boolean) => void;
  applySnapshot: (snapshot: SessionSnapshot) => void;
  applyEvent: (event: string, payload: any) => void;
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  snapshot: null,
  lastEventNumber: 0,
  isConnected: false,

  setConnected: (isConnected) => set({ isConnected }),

  applySnapshot: (snapshot) => {
    set({
      snapshot,
      lastEventNumber: snapshot.eventNumber || 0,
      isConnected: true,
    });
  },

  applyEvent: (event, payload) => {
    const { snapshot, lastEventNumber } = get();

    // Sequence number check: ignore old/duplicate events
    if (payload?.eventNumber && payload.eventNumber <= lastEventNumber) {
      return;
    }

    const nextEventNumber = payload?.eventNumber || lastEventNumber + 1;

    // Direct compatibility event handlers
    if (event === 'leaderboard_update' && Array.isArray(payload)) {
      if (snapshot) {
        set({
          snapshot: {
            ...snapshot,
            leaderboardTop10: payload.map((p, idx) => ({
              rank: idx + 1,
              id: p.id,
              nickname: p.nickname,
              totalPoints: p.totalPoints,
              streakCount: p.streakCount || 0,
            })),
          },
          lastEventNumber: nextEventNumber,
        });
      }
      return;
    }

    if (event === 'match_score_update' && payload) {
      if (snapshot) {
        set({
          snapshot: {
            ...snapshot,
            match: { ...snapshot.match, ...payload },
          },
          lastEventNumber: nextEventNumber,
        });
      }
      return;
    }

    if (event === 'new_question_active' && payload) {
      if (snapshot) {
        set({
          snapshot: {
            ...snapshot,
            currentTrivia: payload,
          },
          lastEventNumber: nextEventNumber,
        });
      }
      return;
    }

    if (event === 'question_resolved') {
      if (snapshot) {
        set({
          snapshot: {
            ...snapshot,
            currentTrivia: null,
          },
          lastEventNumber: nextEventNumber,
        });
      }
      return;
    }

    if (!snapshot) return;

    switch (event) {
      case 'MATCH_SCORE_UPDATED':
      case 'MATCH_STARTED':
      case 'MATCH_FINISHED':
        set({
          snapshot: {
            ...snapshot,
            match: { ...snapshot.match, ...payload },
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      case 'TRIVIA_OPENED':
      case 'TRIVIA_CREATED':
        set({
          snapshot: {
            ...snapshot,
            currentTrivia: payload.trivia || payload,
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      case 'TRIVIA_CLOSED':
        set({
          snapshot: {
            ...snapshot,
            currentTrivia: null,
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      case 'TRIVIA_RESULT':
        set({
          snapshot: {
            ...snapshot,
            currentTrivia: null,
            leaderboardTop10: payload.leaderboard || snapshot.leaderboardTop10,
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      case 'LEADERBOARD_UPDATED':
        set({
          snapshot: {
            ...snapshot,
            leaderboardTop10: payload.leaderboard || payload,
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      case 'PLAYER_JOINED':
      case 'player_joined':
        set({
          snapshot: {
            ...snapshot,
            connectedPlayersCount: snapshot.connectedPlayersCount + 1,
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      case 'PLAYER_VOTED':
        if (snapshot.currentTrivia) {
          set({
            snapshot: {
              ...snapshot,
              currentTrivia: {
                ...snapshot.currentTrivia,
                options: payload.options || snapshot.currentTrivia.options,
                totalVotes: payload.totalVotes ?? snapshot.currentTrivia.totalVotes,
              },
            },
            lastEventNumber: nextEventNumber,
          });
        }
        break;

      default:
        break;
    }
  },
}));
