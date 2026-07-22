import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export const useSocket = (sessionId?: string, isTv: boolean = false) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [activeQuestions, setActiveQuestions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    // 1. Obtener el token correspondiente según el tipo de dispositivo
    let token: string | null = null;
    let nickname: string = 'Jugador';
    
    if (typeof window !== 'undefined') {
      token = isTv 
        ? localStorage.getItem(`pulsobet_tv_token:${sessionId}`)
        : localStorage.getItem(`pulsobet_player_token:${sessionId}`);
        
      if (!isTv) {
        nickname = localStorage.getItem(`pulsobet_nickname:${sessionId}`) || 'Jugador';
      }
    }

    // Si no es TV y no hay token de jugador, evitamos la conexión hasta que complete el onboarding
    if (!isTv && !token) return;

    // 2. Inicializar la conexión inyectando el JWT en el objeto 'auth' para el handshake seguro
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      auth: {
        token: token // El WsJwtGuard del backend interceptará y validará este campo
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Nos unimos a la sala adecuada del bar por WebSockets
      if (isTv) {
        socket.emit('join_tv_screen', { sessionId });
      } else {
        socket.emit('join_bar_session', { sessionId, nickname });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Si el backend rechaza el JWT (WsJwtGuard), limpiamos el token inválido del localStorage
    // y recargamos la página para que el jugador se registre de nuevo con un token fresco.
    socket.on('connect_error', (err) => {
      console.warn('[useSocket] connect_error:', err.message);
      if (!isTv && err.message && err.message.toLowerCase().includes('autorizado')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`pulsobet_player_token:${sessionId}`);
          localStorage.removeItem(`pulsobet_player_id:${sessionId}`);
          window.location.reload();
        }
      }
    });

    socket.on('exception', (error: any) => {
      console.warn('[useSocket] WS exception:', error);
    });

    // El backend emite 'unauthorized' cuando WsJwtGuard rechaza el token
    // Limpiamos el token inválido del localStorage y recargamos para re-registrarse
    socket.on('unauthorized', () => {
      console.warn('[useSocket] Token rechazado por el servidor. Limpiando y re-registrando...');
      if (!isTv && typeof window !== 'undefined') {
        localStorage.removeItem(`pulsobet_player_token:${sessionId}`);
        localStorage.removeItem(`pulsobet_player_id:${sessionId}`);
        window.location.reload();
      }
    });

    socket.on('new_question_active', (question: any) => {
      setActiveQuestion(question);
      if (question) {
        setActiveQuestions((prev) => {
          const exists = prev.some((q) => q.id === question.id);
          return exists ? prev : [question, ...prev];
        });
      }
    });

    socket.on('active_questions_list', (questions: any[]) => {
      if (Array.isArray(questions)) {
        setActiveQuestions(questions);
        if (questions.length === 0) {
          setActiveQuestion(null);
        } else {
          setActiveQuestion(questions[0]);
        }
      }
    });

    socket.on('question_resolved', () => {
      setActiveQuestion(null);
      setActiveQuestions([]);
    });

    socket.on('leaderboard_update', (data: any[]) => {
      setLeaderboard(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, isTv]);

  const sendPrediction = useCallback((questionId: string, chosenOptionId: number) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('submit_prediction', { questionId, chosenOptionId });
    }
  }, [isConnected]);

  return {
    isConnected,
    activeQuestion,
    activeQuestions,
    leaderboard,
    sendPrediction,
    setActiveQuestion,
    setActiveQuestions,
  };
};
