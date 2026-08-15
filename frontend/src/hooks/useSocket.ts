import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSessionStore } from '@/store/useSessionStore';
import { API_URL, WS_URL } from '@/config/api';

export type VoteResult = { ok: boolean; reason?: string };

export const useSocket = (sessionId?: string, isTv: boolean = false, isAdmin: boolean = false) => {
  const socketRef = useRef<Socket | null>(null);
  const voteCallbacksRef = useRef(new Map<string, (result: VoteResult) => void>());
  // Cola de eventos Party pendientes de envío (declarada antes del useEffect que la usa)
  const partyQueueRef = useRef<{ event: string; data: any }[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    let token: string | null = null;
    let nickname: string = 'Jugador';
    let playerId: string | undefined = undefined;

    if (typeof window !== 'undefined') {
      token = isTv
        ? localStorage.getItem(`pulsobet_tv_token:${sessionId}`)
        : (isAdmin ? localStorage.getItem(`pulsobet_staff_token:${sessionId}`) : localStorage.getItem(`pulsobet_player_token:${sessionId}`));

      if (!isTv && !isAdmin) {
        nickname = localStorage.getItem(`pulsobet_nickname:${sessionId}`) || 'Jugador';
        playerId = localStorage.getItem(`pulsobet_player_id:${sessionId}`) || undefined;
      }
    }

    // Conectar socket (con o sin token para recibir eventos en tiempo real).
    // WebSocket directo: el long-polling a través del proxy de Railway provocaba
    // un bucle de desconexiones cada ~5s y se perdían los eventos en vivo.
    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: {
        token: token,
      },
      query: {
        token: token || '',
        sessionId,
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      useSessionStore.getState().setConnected(true);

      const deviceType = isTv ? 'tv' : (isAdmin ? 'admin' : 'player');
      let currentNickname = nickname;
      let currentPlayerId = playerId;
      if (typeof window !== 'undefined' && !isTv && !isAdmin) {
        currentNickname = localStorage.getItem(`pulsobet_nickname:${sessionId}`) || nickname;
        currentPlayerId = localStorage.getItem(`pulsobet_player_id:${sessionId}`) || playerId;
      }
      socket.emit('JOIN_SESSION', { sessionId, type: deviceType, nickname: currentNickname, playerId: currentPlayerId });

      // Reenviar eventos Party encolados mientras estaba desconectado
      const queued = partyQueueRef.current;
      partyQueueRef.current = [];
      queued.forEach(({ event, data }) => socket.emit(event, data));
    });

    socket.on('reconnect', () => {
      useSessionStore.getState().setConnected(true);
      const deviceType = isTv ? 'tv' : (isAdmin ? 'admin' : 'player');
      let currentNickname = nickname;
      let currentPlayerId = playerId;
      if (typeof window !== 'undefined' && !isTv && !isAdmin) {
        currentNickname = localStorage.getItem(`pulsobet_nickname:${sessionId}`) || nickname;
        currentPlayerId = localStorage.getItem(`pulsobet_player_id:${sessionId}`) || playerId;
      }
      socket.emit('JOIN_SESSION', { sessionId, type: deviceType, nickname: currentNickname, playerId: currentPlayerId });

      const queued = partyQueueRef.current;
      partyQueueRef.current = [];
      queued.forEach(({ event, data }) => socket.emit(event, data));
    });

    socket.on('connect_error', () => {
      // Si falla WS, no se bloquea la interfaz; el fallback REST mantendrá el snapshot al día
    });

    socket.on('disconnect', () => {
      useSessionStore.getState().setConnected(false);
    });

    // PING / PONG Heartbeat cada 15 segundos
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('PING');
      }
    }, 15000);

    // Fallback de respaldo HTTP REST polling cada 5s si el socket está desconectado
    const restFallbackInterval = setInterval(() => {
      const isConnected = useSessionStore.getState().isConnected;
      if (!isConnected && sessionId) {
        let pId: string | null = null;
        if (typeof window !== 'undefined') {
          pId = localStorage.getItem(`pulsobet_player_id:${sessionId}`);
        }
        const url = pId
          ? `${API_URL}/session/snapshot/${sessionId}?playerId=${encodeURIComponent(pId)}`
          : `${API_URL}/session/snapshot/${sessionId}`;

        fetch(url)
          .then((r) => (r.ok ? r.json() : null))
          .then((snapshot) => {
            if (snapshot) {
              useSessionStore.getState().applySnapshot(snapshot);
            }
          })
          .catch(() => {});
      }
    }, 5000);

    // Escuchar SNAPSHOT de hidratación completa
    socket.on('SNAPSHOT', (snapshot: any) => {
      if (snapshot) {
        useSessionStore.getState().applySnapshot(snapshot);
      }
    });

    // ACK de voto: el servidor confirma o rechaza cada predicción
    socket.on('VOTE_ACCEPTED', (payload: { questionId: string }) => {
      const cb = payload?.questionId ? voteCallbacksRef.current.get(payload.questionId) : undefined;
      if (cb) {
        voteCallbacksRef.current.delete(payload.questionId);
        cb({ ok: true });
      }
    });

    socket.on('VOTE_REJECTED', (payload: { questionId: string; reason?: string }) => {
      const cb = payload?.questionId ? voteCallbacksRef.current.get(payload.questionId) : undefined;
      if (cb) {
        voteCallbacksRef.current.delete(payload.questionId);
        cb({ ok: false, reason: payload?.reason });
      }
    });

    socket.on('unauthorized', (payload: { message?: string }) => {
      // Token inválido o faltante: rechazar todos los votos pendientes
      voteCallbacksRef.current.forEach((cb) => cb({ ok: false, reason: payload?.message || 'Sesión inválida. Volvé a registrarte.' }));
      voteCallbacksRef.current.clear();
    });

    // Confirmación de input de Party Games: actualizar mySubmission en el store inmediatamente
    socket.on('PARTY_INPUT_ACCEPTED', (payload: { roundId: string; content?: any }) => {
      const store = useSessionStore.getState();
      const snap = store.snapshot;
      if (!snap) return;
      const activeRound = snap.partyGame?.activeRound;
      if (!activeRound || activeRound.id !== payload?.roundId) return;
      // El contenido real llega vía snapshot o ACK; aquí marcamos que fue aceptado
      // para que el componente cambie de vista sin esperar el polling REST
      store.applyEvent('PARTY_MY_SUBMISSION_ACCEPTED', payload);
    });

    // Confirmación de TUTIFRUTI / BASTA de Party Games: actualizar mySubmission en el store
    socket.on('PARTY_BASTA_ACCEPTED', (payload: { roundId: string; isBasta?: boolean; answers?: any }) => {
      const store = useSessionStore.getState();
      const snap = store.snapshot;
      if (!snap) return;
      const activeRound = snap.partyGame?.activeRound;
      if (!activeRound || activeRound.id !== payload?.roundId) return;
      store.applyEvent('PARTY_MY_BASTA_ACCEPTED', payload);
    });

    // Confirmación de voto de Party Games: actualizar myVote en el store inmediatamente
    socket.on('PARTY_VOTE_ACCEPTED', (payload: { roundId: string }) => {
      const store = useSessionStore.getState();
      const snap = store.snapshot;
      if (!snap) return;
      const activeRound = snap.partyGame?.activeRound;
      if (!activeRound || activeRound.id !== payload?.roundId) return;
      store.applyEvent('PARTY_MY_VOTE_ACCEPTED', { roundId: payload.roundId });
    });

    // Escuchar eventos de dominio
    const domainEvents = [
      'MATCH_STARTED',
      'MATCH_SCORE_UPDATED',
      'MATCH_FINISHED',
      'TRIVIA_CREATED',
      'TRIVIA_OPENED',
      'TRIVIA_CLOSED',
      'TRIVIA_RESULT',
      'LEADERBOARD_UPDATED',
      'PLAYER_JOINED',
      'PLAYER_VOTED',
      'REWARD_RESERVED',
      'REWARD_DELIVERED',
      'SESSION_RESET',
      'SESSION_MODE_CHANGED',
      'CARD_SUBMITTED',
      'CARD_PUBLISHED',
      'CARD_VOTE_UPDATED',
      'CARD_CLOSED',
      // Party Games events
      'PARTY_ROUND_STARTED',
      'PARTY_PHASE_CHANGED',
      'PARTY_INPUT_PROGRESS',
      'PARTY_VOTE_UPDATED',
      'PARTY_ROUND_RESULT',
      'PARTY_ROUND_FINISHED',
      'PARTY_BASTA_CALLED',
      'PARTY_GAME_OVER',
      // compatibilidad
      'leaderboard_update',
      'match_score_update',
      'new_question_active',
      'question_resolved',
      'player_joined',
    ];

    domainEvents.forEach((evt) => {
      socket.on(evt, (payload: any) => {
        useSessionStore.getState().applyEvent(evt, payload);
      });
    });

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(restFallbackInterval);
      socket.disconnect();
    };
  }, [sessionId, isTv, isAdmin]);

  const sendPrediction = useCallback((questionId: string, chosenOptionId: number, onResult?: (result: VoteResult) => void) => {
    if (socketRef.current && socketRef.current.connected) {
      if (onResult) {
        voteCallbacksRef.current.set(questionId, onResult);
        // Si el servidor no responde en 8s, reportar fallo para no dejar al jugador colgado
        setTimeout(() => {
          const cb = voteCallbacksRef.current.get(questionId);
          if (cb) {
            voteCallbacksRef.current.delete(questionId);
            cb({ ok: false, reason: 'El servidor no confirmó el voto. Intentá de nuevo.' });
          }
        }, 8000);
      }
      socketRef.current.emit('submit_prediction', { questionId, chosenOptionId });
    } else {
      onResult?.({ ok: false, reason: 'Sin conexión en este momento. Intentá de nuevo.' });
    }
  }, []);

  // Tras el registro del jugador, el socket (que conectó sin token al montar la página)
  // debe reconectar con el JWT para que submit_prediction pase el WsJwtGuard.
  const reconnectWithToken = useCallback((newToken: string) => {
    if (socketRef.current) {
      socketRef.current.auth = { token: newToken };
      if (socketRef.current.io?.opts) {
        socketRef.current.io.opts.query = {
          token: newToken,
          sessionId,
        };
      }
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  }, [sessionId]);

  const emitPartyEvent = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      // Encolar para reenviar al reconectar (máx 50 para no acumular basura).
      // Sin esto, un BASTA durante una microcaída/reconexión se perdía en silencio.
      if (partyQueueRef.current.length < 50) {
        partyQueueRef.current.push({ event, data });
      }
    }
  }, []);

  return {
    sendPrediction,
    reconnectWithToken,
    emitPartyEvent,
  };
};
