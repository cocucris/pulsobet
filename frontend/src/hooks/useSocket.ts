import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSessionStore } from '@/store/useSessionStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export const useSocket = (sessionId?: string, isTv: boolean = false, isAdmin: boolean = false) => {
  const socketRef = useRef<Socket | null>(null);

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

    // Conectar socket (con o sin token para recibir eventos en tiempo real)
    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      auth: {
        token: token,
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      useSessionStore.getState().setConnected(true);

      const deviceType = isTv ? 'tv' : (isAdmin ? 'admin' : 'player');
      socket.emit('JOIN_SESSION', { sessionId, type: deviceType, nickname, playerId });

      if (isTv) {
        socket.emit('join_tv_screen', { sessionId });
      } else if (!isAdmin) {
        socket.emit('join_bar_session', { sessionId, nickname });
      }
    });

    socket.on('reconnect', () => {
      const deviceType = isTv ? 'tv' : (isAdmin ? 'admin' : 'player');
      socket.emit('JOIN_SESSION', { sessionId, type: deviceType, nickname, playerId });
    });

    socket.on('disconnect', () => {
      useSessionStore.getState().setConnected(false);
    });

    // PING / PONG Heartbeat cada 20 segundos
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('PING');
      }
    }, 20000);

    // Escuchar SNAPSHOT de hidratación completa
    socket.on('SNAPSHOT', (snapshot: any) => {
      if (snapshot) {
        useSessionStore.getState().applySnapshot(snapshot);
      }
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
      socket.disconnect();
    };
  }, [sessionId, isTv, isAdmin]);

  const sendPrediction = useCallback((questionId: string, chosenOptionId: number) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('submit_prediction', { questionId, chosenOptionId });
    }
  }, []);

  return {
    sendPrediction,
  };
};
