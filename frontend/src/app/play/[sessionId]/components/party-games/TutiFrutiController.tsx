'use client';

import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { API_URL } from '@/config/api';

interface TutiFrutiRound {
  id: string;
  phase: string;
  prompt: string;
  categories: string[] | null;
  submittedCount: number;
  totalPlayers: number;
  countdownEndsAt?: string;
  bastaBy?: string;
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
}

interface Props {
  round: TutiFrutiRound;
  mySubmission: any | null;
  socket: any;
}

export function TutiFrutiController({ round, mySubmission, socket }: Props) {
  const categories = round.categories ?? [];
  const myPlayerId = useSessionStore((s) => s.snapshot?.myPlayer?.id);
  const myNickname = useSessionStore((s) => s.snapshot?.myPlayer?.nickname);
  const myRank = useSessionStore((s) => s.snapshot?.myPlayer?.rank);
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(categories.map((c) => [c, ''])),
  );
  const [sending, setSending] = useState(false);
  const [iCalledBasta, setICalledBasta] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mis puntos en esta ronda (fase REVEAL)
  const myResult = round.results?.submissions.find((s) => s.playerId === myPlayerId);

  // ¿Quién cantó TUTIFRUTI?
  const isMeWhoCalled = iCalledBasta || mySubmission?.isBasta || (Boolean(round.bastaBy) && Boolean(myNickname) && round.bastaBy?.toLowerCase() === myNickname?.toLowerCase());
  const frozenByOther = Boolean(round.bastaBy) && !isMeWhoCalled;
  const inputsEnabled = round.phase === 'INPUT' && !frozenByOther && !isMeWhoCalled;

  // Cuenta regresiva sincronizada con el servidor
  useEffect(() => {
    if (round.phase !== 'COUNTDOWN' || !round.countdownEndsAt) {
      setCountdown(null);
      return;
    }
    const end = new Date(round.countdownEndsAt).getTime();
    const update = () => setCountdown(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    update();
    const iv = setInterval(update, 200);
    return () => clearInterval(iv);
  }, [round.countdownEndsAt, round.phase]);

  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Autosave: enviar respuestas parciales mientras se escribe (debounce 800ms) en segundo plano.
  // Así, si OTRO jugador grita TUTIFRUTI, el servidor ya tiene lo tuyo guardado.
  useEffect(() => {
    if (round.phase !== 'INPUT' || isMeWhoCalled) return;
    const hasContent = Object.values(answers).some((a) => a.trim() !== '');
    if (!hasContent) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      socket?.emit('PARTY_SUBMIT_INPUT', { roundId: round.id, content: { answers }, playerId: myPlayerId });
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, round.phase, round.id, isMeWhoCalled, myPlayerId]);

  // Flush inmediato de respuestas al momento que ALGUIEN grita TUTIFRUTI o cambia la fase
  useEffect(() => {
    if (!round.bastaBy || isMeWhoCalled) return;
    const hasContent = Object.values(answersRef.current).some((a) => a.trim() !== '');
    if (hasContent) {
      // 1. WebSocket
      socket?.emit('PARTY_SUBMIT_INPUT', { roundId: round.id, content: { answers: answersRef.current }, playerId: myPlayerId });
      // 2. Respaldo REST inmediato
      if (myPlayerId) {
        fetch(`${API_URL}/party-games/rounds/${round.id}/input`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: myPlayerId, content: { answers: answersRef.current } }),
        }).catch(() => {});
      }
    }
  }, [round.bastaBy, round.id, socket, isMeWhoCalled, myPlayerId]);

  const handleBasta = async () => {
    if (sending || !inputsEnabled) return;
    // No permitir TUTIFRUTI sin al menos una respuesta
    const hasContent = Object.values(answers).some((a) => a.trim() !== '');
    if (!hasContent) return;
    setSending(true);
    setICalledBasta(true);

    const payload = { roundId: round.id, answers, playerId: myPlayerId };

    // 1. Emisión en tiempo real vía WebSocket
    socket?.emit('PARTY_BASTA', payload);

    // 2. Respaldo HTTP REST garantizado: si el WebSocket sufre un microcorte, la petición REST asegura la llamada
    if (myPlayerId) {
      try {
        await fetch(`${API_URL}/party-games/rounds/${round.id}/basta`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: myPlayerId, answers }),
        });
      } catch (err) {
        console.warn('Fallback REST basta:', err);
      }
    }

    setTimeout(() => setSending(false), 1500);
  };

  const hasAnyAnswer = Object.values(answers).some((a) => a.trim() !== '');

  // Pantalla de éxito tras cantar TUTIFRUTI en fase INPUT
  if (isMeWhoCalled && round.phase === 'INPUT') {
    const displayAnswers = mySubmission?.content?.answers || answers;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 text-center">
        <div className="text-7xl animate-bounce">🏆</div>
        <h3 className="text-3xl font-black text-emerald-400">¡TUTIFRUTI!</h3>
        <p className="text-white font-medium">¡Fuiste el primero en responder y cantar TUTIFRUTI!</p>
        <div className="bg-white/10 rounded-2xl border border-white/20 p-4 w-full max-w-sm text-left">
          {categories.map((cat) => (
            <div key={cat} className="py-2 border-b border-white/10 last:border-0">
              <p className="text-white/40 text-xs uppercase tracking-wider">{cat}</p>
              <p className="text-white font-semibold">{displayAnswers[cat] || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Pantalla de confirmación si ya no estamos en INPUT pero no es REVEAL todavía
  if (mySubmission && !mySubmission._pending && round.phase !== 'INPUT' && round.phase !== 'REVEAL' && round.phase !== 'LOBBY' && round.phase !== 'COUNTDOWN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 text-center">
        {mySubmission.isBasta ? (
          <>
            <div className="text-7xl">🏆</div>
            <h3 className="text-3xl font-black text-emerald-400">¡TUTIFRUTI!</h3>
            <p className="text-white">¡Fuiste el primero en responder todas las categorías!</p>
          </>
        ) : (
          <>
            <div className="text-6xl">✅</div>
            <h3 className="text-2xl font-black text-white">¡Respuestas enviadas!</h3>
          </>
        )}
        <div className="bg-white/10 rounded-2xl border border-white/20 p-4 w-full max-w-sm text-left">
          {categories.map((cat) => (
            <div key={cat} className="py-2 border-b border-white/10 last:border-0">
              <p className="text-white/40 text-xs uppercase tracking-wider">{cat}</p>
              <p className="text-white font-semibold">{mySubmission.content?.answers?.[cat] || answers[cat] || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // LOBBY — espera con categorías
  if (round.phase === 'LOBBY') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 text-center">
        <div className="text-6xl">🔤</div>
        <h3 className="text-3xl font-black text-emerald-400">Tuti Fruti</h3>
        <p className="text-white/60">Categorías de esta ronda:</p>
        <div className="flex flex-wrap justify-center gap-2 max-w-sm">
          {categories.map((cat) => (
            <span
              key={cat}
              className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-4 py-2 rounded-full font-bold"
            >
              {cat}
            </span>
          ))}
        </div>
        <p className="text-white/40 animate-pulse">Esperando que arranque la ronda...</p>
      </div>
    );
  }

  // COUNTDOWN — 3, 2, 1 (inputs bloqueados)
  if (round.phase === 'COUNTDOWN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <p className="text-white/60 text-xl">La letra es</p>
        <div className="text-8xl font-black text-emerald-400">{round.prompt}</div>
        <div key={countdown} className="text-9xl font-black text-white leading-none animate-pulse">
          {countdown !== null && countdown > 0 ? countdown : '¡YA!'}
        </div>
        <p className="text-white/40">Preparate...</p>
      </div>
    );
  }

  // INPUT — formulario activo (o congelado si otro gritó TUTIFRUTI)
  if (round.phase === 'INPUT') {
    return (
      <div className="flex flex-col gap-5 p-4">
        <div className="text-center">
          <div className="text-7xl font-black text-emerald-400 leading-none">{round.prompt}</div>
          <p className="text-white/50 text-sm mt-2">Completá las categorías y presioná TUTIFRUTI</p>
        </div>

        {frozenByOther && (
          <div className="bg-red-500/20 border border-red-400/40 text-red-300 text-center font-bold rounded-xl px-4 py-3">
            🛑 ¡{round.bastaBy} cantó TUTIFRUTI! Tus respuestas ya fueron enviadas.
          </div>
        )}

        <div className="flex flex-col gap-3">
          {categories.map((cat) => (
            <div key={cat}>
              <label className="text-white/50 text-xs uppercase tracking-wider mb-1 block">
                {cat}
              </label>
              <input
                id={`tuti-${cat}`}
                type="text"
                value={answers[cat] ?? ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [cat]: e.target.value }))}
                placeholder={`${cat} con ${round.prompt}...`}
                disabled={!inputsEnabled}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-400 transition-colors text-lg disabled:opacity-40"
              />
            </div>
          ))}
        </div>

        <button
          id="tuti-basta-btn"
          onClick={handleBasta}
          disabled={sending || !inputsEnabled || !hasAnyAnswer}
          className="w-full py-5 bg-emerald-400 hover:bg-emerald-300 text-black font-black text-2xl rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-emerald-400/30 mt-2 cursor-pointer"
        >
          {sending ? 'Enviando...' : '🍓 ¡TUTIFRUTI!'}
        </button>
      </div>
    );
  }

  // REVEAL — mostrar mis puntos
  if (round.phase === 'REVEAL') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 text-center">
        <div className="text-7xl">{myResult && myResult.pointsEarned > 0 ? '🎉' : '😅'}</div>
        {myResult && myResult.pointsEarned > 0 ? (
          <>
            <h3 className="text-4xl font-black text-emerald-400">+{myResult.pointsEarned} pts</h3>
            <p className="text-white/60">¡Puntos sumados a tu total!</p>
          </>
        ) : (
          <>
            <h3 className="text-2xl font-black text-white">Sin puntos esta ronda</h3>
            <p className="text-white/60">¡La próxima sale!</p>
          </>
        )}
        {myRank && (
          <p className="text-lg text-white/80">
            Vas en el puesto <span className="font-black text-amber-400">#{myRank}</span>
          </p>
        )}
        <p className="text-white/40 text-sm animate-pulse">Mirá la pantalla para ver el ranking completo</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6 text-center">
      <div className="text-6xl">🎉</div>
      <h2 className="text-2xl font-black text-white">¡Mirá la pantalla!</h2>
      <p className="text-white/50">Se están revelando los resultados...</p>
    </div>
  );
}
