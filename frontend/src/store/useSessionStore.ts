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

  activeTrivias: {
    id: string;
    questionText: string;
    options: { id: number; text: string; count: number; percentage: number }[];
    pointsReward: number;
    isFlash: boolean;
    isClosed?: boolean;
    expiresAt: string;
    totalVotes: number;
    imageUrl?: string | null;
  }[];

  resolvedTrivias: {
    id: string;
    questionText: string;
    options: { id: number; text: string; count: number; percentage: number }[];
    pointsReward: number;
    isFlash: boolean;
    expiresAt: string;
    totalVotes: number;
    imageUrl?: string | null;
    correctOptionId: number;
    winnersCount: number;
  }[];

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
    votedTriviaIds: string[];
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
  // Contador que se incrementa con cada evento de canje (reserved/delivered):
  // las pantallas lo usan como señal para refrescar vouchers/puntos vía REST
  rewardsVersion: number;

  setConnected: (connected: boolean) => void;
  applySnapshot: (snapshot: SessionSnapshot) => void;
  applyEvent: (event: string, payload: any) => void;
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  snapshot: null,
  lastEventNumber: 0,
  isConnected: false,
  rewardsVersion: 0,

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

    // Sequence number check: ignore old/duplicate events.
    // OJO: si Redis está caído, el backend emite siempre eventNumber=1; en ese caso
    // no descartamos (lastEventNumber <= 1) para no congelar la pantalla.
    if (payload?.eventNumber && payload.eventNumber <= lastEventNumber && lastEventNumber > 1) {
      return;
    }

    // Los eventos legacy SIN eventNumber aplican su cambio pero NO tocan el contador:
    // asignarles un número sintético inflaba lastEventNumber y provocaba que los
    // eventos numerados reales posteriores (votos, goles) fueran descartados.
    const nextEventNumber = payload?.eventNumber || lastEventNumber;

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
        // Upsert por id: varias trivias pueden coexistir activas
        const exists = snapshot.activeTrivias.some((t) => t.id === payload.id);
        set({
          snapshot: {
            ...snapshot,
            activeTrivias: exists
              ? snapshot.activeTrivias.map((t) => (t.id === payload.id ? payload : t))
              : [...snapshot.activeTrivias, payload],
          },
          lastEventNumber: nextEventNumber,
        });
      }
      return;
    }

    if (event === 'question_resolved') {
      if (snapshot) {
        const triviaId = payload?.triviaId;
        set({
          snapshot: {
            ...snapshot,
            activeTrivias: triviaId
              ? snapshot.activeTrivias.map((t) => (t.id === triviaId ? { ...t, isClosed: true } : t))
              : snapshot.activeTrivias,
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
        set({
          snapshot: {
            ...snapshot,
            match: { ...snapshot.match, ...payload },
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      case 'MATCH_FINISHED':
        // Payload null (reset de pantallas) debe limpiar el marcador, no hacer spread
        set({
          snapshot: {
            ...snapshot,
            match: payload ? { ...snapshot.match, ...payload } : null,
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      case 'TRIVIA_OPENED':
      case 'TRIVIA_CREATED': {
        const trivia = payload.trivia || payload;
        const exists = snapshot.activeTrivias.some((t) => t.id === trivia.id);
        set({
          snapshot: {
            ...snapshot,
            activeTrivias: exists
              ? snapshot.activeTrivias.map((t) => (t.id === trivia.id ? trivia : t))
              : [...snapshot.activeTrivias, trivia],
          },
          lastEventNumber: nextEventNumber,
        });
        break;
      }

      case 'TRIVIA_CLOSED':
        // La trivia cerrada por tiempo permanece visible (isClosed) para que el
        // admin declare el resultado; solo se remueve al resolverse (TRIVIA_RESULT)
        set({
          snapshot: {
            ...snapshot,
            activeTrivias: snapshot.activeTrivias.map((t) =>
              t.id === payload?.triviaId ? { ...t, isClosed: true } : t,
            ),
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      case 'TRIVIA_RESULT': {
        // La trivia resuelta pasa al historial de la sesión (con resultado, votos y porcentajes)
        const resolved = payload?.trivia
          ? { ...payload.trivia, correctOptionId: payload.correctOptionId, winnersCount: payload.winnersCount }
          : null;
        const alreadyResolved = resolved
          ? snapshot.resolvedTrivias.some((t) => t.id === resolved.id)
          : false;
        set({
          snapshot: {
            ...snapshot,
            activeTrivias: payload?.triviaId
              ? snapshot.activeTrivias.filter((t) => t.id !== payload.triviaId)
              : snapshot.activeTrivias,
            resolvedTrivias:
              resolved && !alreadyResolved
                ? [...snapshot.resolvedTrivias, resolved]
                : snapshot.resolvedTrivias,
            leaderboardTop10: payload.leaderboard || snapshot.leaderboardTop10,
          },
          lastEventNumber: nextEventNumber,
        });
        break;
      }

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
        set({
          snapshot: {
            ...snapshot,
            activeTrivias: snapshot.activeTrivias.map((t) =>
              t.id === payload.triviaId
                ? {
                    ...t,
                    options: payload.options || t.options,
                    totalVotes: payload.totalVotes ?? t.totalVotes,
                  }
                : t,
            ),
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      case 'REWARD_RESERVED':
      case 'REWARD_DELIVERED':
        // Señal para que las pantallas refresquen vouchers/puntos vía REST
        set({
          rewardsVersion: get().rewardsVersion + 1,
          lastEventNumber: nextEventNumber,
        });
        break;

      default:
        break;
    }
  },
}));
