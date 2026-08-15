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
    rank?: number;
    votedTriviaIds: string[];
  } | null;

  sessionReset?: boolean;

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

  mode: string;

  activeCards: {
    id: string;
    sessionId: string;
    tableNumber: string | null;
    name: string;
    age: number | null;
    position: string | null;
    strongFoot: string | null;
    fitness: number | null;
    skills: { key: string; label: string; icon: string; stars: number }[];
    objective: string | null;
    photoUrl: string | null;
    status: string;
    createdAt: string;
    counts: { interested: number; introduce: number; pass: number };
    totalVotes: number;
  }[];

  cardsHistory: any[];

  pendingCardsCount: number;

  myCardVotes: Record<string, string>;

  votingClosed: boolean;

  votingResults: {
    topInterested: {
      id: string;
      name: string;
      photoUrl: string | null;
      tableNumber: string | null;
      percentage: number;
      votes: number;
      totalVotes: number;
    }[];
    topIntroduce: {
      id: string;
      name: string;
      photoUrl: string | null;
      tableNumber: string | null;
      percentage: number;
      votes: number;
      totalVotes: number;
    }[];
  } | null;

  partyGame: {
    activeRound: {
      id: string;
      gameType: 'BLUFFING' | 'TUTI_FRUTI' | 'SOCIAL_JUDGMENT';
      phase: 'LOBBY' | 'COUNTDOWN' | 'INPUT' | 'VOTING' | 'REVEAL' | 'FINISHED';
      prompt: string;
      categories: string[] | null;
      timeLimit: number;
      createdAt: string;
      submittedCount: number;
      totalPlayers: number;
      options: any[];
      countdownEndsAt?: string; // ISO — fin de la cuenta regresiva (fase COUNTDOWN)
      inputStartedAt?: string;  // ISO — inicio real de INPUT (para el timer)
      bastaBy?: string;         // nickname del que gritó BASTA (Tuti Fruti)
      results?: {
        pointsAwarded: { playerId: string; points: number; source: string }[];
        submissions: {
          id: string;
          playerId: string;
          nickname: string;
          content: any;
          isBasta: boolean;
          pointsEarned: number;
        }[];
      };
    } | null;
    mySubmission: any | null;
    myVote: string | null;
    // Podio definitivo cuando el admin finaliza el juego completo
    gameOver?: {
      leaderboard: { rank: number; id: string; nickname: string; totalPoints: number; streakCount: number }[];
    } | null;
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

  applySnapshot: (newSnapshot) => {
    const currentSnapshot = get().snapshot;
    // Preservar myPlayer existente si el nuevo snapshot viene sin perfil del jugador (ej. snapshot público o REST genérico)
    const mergedSnapshot = {
      ...newSnapshot,
      myPlayer: newSnapshot?.myPlayer ?? currentSnapshot?.myPlayer ?? null,
    };
    set({
      snapshot: mergedSnapshot,
      lastEventNumber: newSnapshot.eventNumber || 0,
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

      case 'SESSION_RESET':
        // Cierre de noche: todas las pantallas vuelven a cero conservando la identidad
        set({
          snapshot: snapshot
            ? {
                ...snapshot,
                match: null,
                activeTrivias: [],
                resolvedTrivias: [],
                leaderboardTop10: [],
                myPlayer: null,
                connectedPlayersCount: 0,
                mode: 'MATCH',
                activeCards: [],
                cardsHistory: [],
                pendingCardsCount: 0,
                myCardVotes: {},
                votingClosed: false,
                votingResults: null,
                partyGame: { activeRound: null, mySubmission: null, myVote: null },
                sessionReset: true,
              }
            : snapshot,
          lastEventNumber: nextEventNumber,
        });
        break;

      case 'SESSION_MODE_CHANGED':
        set({
          snapshot: { ...snapshot, mode: payload?.mode || 'MATCH' },
          lastEventNumber: nextEventNumber,
        });
        break;

      case 'CARD_SUBMITTED':
        set({
          snapshot: {
            ...snapshot,
            pendingCardsCount: payload?.pendingCount ?? snapshot.pendingCardsCount + 1,
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      case 'CARD_PUBLISHED': {
        const newCard = payload?.card;
        if (!newCard) break;
        const existing = snapshot.activeCards.findIndex((c) => c.id === newCard.id);
        const updatedCards =
          existing >= 0
            ? snapshot.activeCards.map((c, i) => (i === existing ? newCard : c))
            : [...snapshot.activeCards, newCard];
        set({
          snapshot: {
            ...snapshot,
            activeCards: updatedCards,
            pendingCardsCount: Math.max(0, snapshot.pendingCardsCount - 1),
          },
          lastEventNumber: nextEventNumber,
        });
        break;
      }

      case 'CARD_VOTE_UPDATED': {
        const cardIndex = snapshot.activeCards.findIndex((c) => c.id === payload?.cardId);
        if (cardIndex >= 0) {
          const updatedCards = snapshot.activeCards.map((c, i) =>
            i === cardIndex ? { ...c, counts: payload.counts, totalVotes: payload.totalVotes } : c,
          );
          set({
            snapshot: {
              ...snapshot,
              activeCards: updatedCards,
            },
            lastEventNumber: nextEventNumber,
          });
        }
        break;
      }

      case 'CARD_CLOSED': {
        const closedCard = payload?.card;
        set({
          snapshot: {
            ...snapshot,
            activeCards: snapshot.activeCards.filter((c) => c.id !== payload?.cardId),
            cardsHistory:
              closedCard && !snapshot.cardsHistory.some((c: any) => c.id === closedCard.id)
                ? [...snapshot.cardsHistory, closedCard]
                : snapshot.cardsHistory,
          },
          lastEventNumber: nextEventNumber,
        });
        break;
      }

      case 'VOTING_CLOSED':
        // Cierre de votación general: limpiar fichas activas y guardar resultados
        set({
          snapshot: {
            ...snapshot,
            votingClosed: true,
            votingResults: payload?.results || null,
            activeCards: [],
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      // ─── PARTY GAMES EVENTS ─────────────────────────────────────────────

      case 'PARTY_ROUND_STARTED':
        set({
          snapshot: {
            ...snapshot,
            partyGame: {
              activeRound: payload?.round ?? null,
              mySubmission: null,
              myVote: null,
              gameOver: null, // nueva ronda: limpiar podio anterior
            },
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      // Feedback inmediato al jugador: el servidor confirmó su input (sin esperar polling REST)
      case 'PARTY_MY_SUBMISSION_ACCEPTED': {
        const round = snapshot.partyGame?.activeRound;
        if (!round || round.id !== payload?.roundId) break;
        // En TUTI_FRUTI el input es continuo (autosave), no pisamos el estado con pending
        if (round.gameType === 'TUTI_FRUTI') break;
        set({
          snapshot: {
            ...snapshot,
            partyGame: {
              ...snapshot.partyGame,
              // Marcar un mySubmission con el contenido real del jugador
              mySubmission: {
                content: payload.content || snapshot.partyGame.mySubmission?.content || { text: '...' },
                isBasta: false,
                _pending: true,
              },
            },
          },
          lastEventNumber: nextEventNumber,
        });
        break;
      }

      // Feedback inmediato al jugador que cantó TUTIFRUTI / BASTA
      case 'PARTY_MY_BASTA_ACCEPTED': {
        const round = snapshot.partyGame?.activeRound;
        if (!round || round.id !== payload?.roundId) break;
        set({
          snapshot: {
            ...snapshot,
            partyGame: {
              ...snapshot.partyGame,
              mySubmission: {
                content: { answers: payload.answers || (snapshot.partyGame.mySubmission as any)?.content?.answers || {} },
                isBasta: payload.isBasta ?? true,
              },
            },
          },
          lastEventNumber: nextEventNumber,
        });
        break;
      }

      // Feedback inmediato al jugador: el servidor confirmó su voto
      case 'PARTY_MY_VOTE_ACCEPTED': {
        const round = snapshot.partyGame?.activeRound;
        if (!round || round.id !== payload?.roundId) break;
        set({
          snapshot: {
            ...snapshot,
            partyGame: {
              ...snapshot.partyGame,
              myVote: snapshot.partyGame.myVote ?? '__voted__',
            },
          },
          lastEventNumber: nextEventNumber,
        });
        break;
      }

      case 'PARTY_GAME_OVER':
        set({
          snapshot: {
            ...snapshot,
            leaderboardTop10: payload.leaderboard || snapshot.leaderboardTop10,
            partyGame: {
              ...snapshot.partyGame,
              activeRound: null,
              mySubmission: null,
              myVote: null,
              gameOver: { leaderboard: payload.leaderboard || [] },
            },
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      case 'PARTY_PHASE_CHANGED': {
        const currentRound = snapshot.partyGame?.activeRound;
        if (!currentRound || currentRound.id !== payload?.roundId) break;
        set({
          snapshot: {
            ...snapshot,
            partyGame: {
              ...snapshot.partyGame,
              activeRound: {
                ...currentRound,
                phase: payload.phase,
                ...(payload.payload?.options ? { options: payload.payload.options } : {}),
                ...(payload.payload?.countdownEndsAt ? { countdownEndsAt: payload.payload.countdownEndsAt } : {}),
                ...(payload.payload?.inputStartedAt ? { inputStartedAt: payload.payload.inputStartedAt } : {}),
              },
            },
          },
          lastEventNumber: nextEventNumber,
        });
        break;
      }

      case 'PARTY_BASTA_CALLED': {
        const round = snapshot.partyGame?.activeRound;
        if (!round || round.id !== payload?.roundId) break;
        const isMe = payload.playerId && snapshot.myPlayer?.id && payload.playerId === snapshot.myPlayer.id;
        set({
          snapshot: {
            ...snapshot,
            partyGame: {
              ...snapshot.partyGame,
              activeRound: { ...round, bastaBy: payload.nickname },
              ...(isMe
                ? {
                    mySubmission: {
                      content: { answers: (snapshot.partyGame.mySubmission as any)?.content?.answers || {} },
                      isBasta: true,
                    },
                  }
                : {}),
            },
          },
          lastEventNumber: nextEventNumber,
        });
        break;
      }

      case 'PARTY_INPUT_PROGRESS': {
        const round = snapshot.partyGame?.activeRound;
        if (!round || round.id !== payload?.roundId) break;
        set({
          snapshot: {
            ...snapshot,
            partyGame: {
              ...snapshot.partyGame,
              activeRound: {
                ...round,
                submittedCount: payload.submittedCount,
                totalPlayers: payload.totalPlayers,
              },
            },
          },
          lastEventNumber: nextEventNumber,
        });
        break;
      }

      case 'PARTY_VOTE_UPDATED': {
        const round = snapshot.partyGame?.activeRound;
        if (!round || round.id !== payload?.roundId) break;
        // Actualizar conteos de votos preservando isReal y submittedBy
        const updatedOptions = (round.options || []).map((opt: any) => {
          const voteEntry = (payload.votes || []).find((v: any) => v.targetId === opt.id);
          // CRÍTICO: preservar isReal y submittedBy al actualizar votos
          return voteEntry ? { ...opt, votes: voteEntry.count } : opt;
        });
        set({
          snapshot: {
            ...snapshot,
            partyGame: {
              ...snapshot.partyGame,
              activeRound: { ...round, options: updatedOptions },
            },
          },
          lastEventNumber: nextEventNumber,
        });
        break;
      }

      case 'PARTY_ROUND_RESULT': {
        // CRÍTICO: las options con isReal vienen en PARTY_PHASE_CHANGED (REVEAL),
        // que siempre se emite justo DESPUÉS de PARTY_ROUND_RESULT. NO sobreescribir options aquí.
        const existingRound = snapshot.partyGame?.activeRound;
        set({
          snapshot: {
            ...snapshot,
            leaderboardTop10: payload.leaderboard || snapshot.leaderboardTop10,
            partyGame: {
              ...snapshot.partyGame,
              activeRound: existingRound
                ? { ...existingRound, phase: 'REVEAL', results: payload.results }
                : null,
            },
          },
          lastEventNumber: nextEventNumber,
        });
        break;
      }

      case 'PARTY_ROUND_FINISHED':
        set({
          snapshot: {
            ...snapshot,
            partyGame: { activeRound: null, mySubmission: null, myVote: null },
          },
          lastEventNumber: nextEventNumber,
        });
        break;

      default:
        break;
    }
  },
}));
