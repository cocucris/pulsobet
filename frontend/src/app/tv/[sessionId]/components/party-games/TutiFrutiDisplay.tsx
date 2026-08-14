'use client';

import { useEffect, useState } from 'react';
import { useSessionStore } from '@/store/useSessionStore';

interface TutiFrutiOption {
  id: string;
  answers: Record<string, string>;
  nickname: string;
  isBasta?: boolean;
}

interface TutiFrutiRound {
  id: string;
  phase: string;
  prompt: string; // La letra
  categories: string[] | null;
  timeLimit: number;
  createdAt: string;
  submittedCount: number;
  totalPlayers: number;
  options: TutiFrutiOption[];
  countdownEndsAt?: string;
  inputStartedAt?: string;
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

export function TutiFrutiDisplay({ round }: { round: TutiFrutiRound }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const categories = round.categories ?? [];
  const leaderboard = useSessionStore((s) => s.snapshot?.leaderboardTop10) ?? [];

  // Timer de la fase INPUT: arranca desde inputStartedAt (no createdAt)
  useEffect(() => {
    if (round.phase !== 'INPUT' || !round.inputStartedAt) return;
    const start = new Date(round.inputStartedAt).getTime();
    const end = start + round.timeLimit * 1000;
    const update = () => setTimeLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    update();
    const iv = setInterval(update, 500);
    return () => clearInterval(iv);
  }, [round.inputStartedAt, round.timeLimit, round.phase]);

  // Cuenta regresiva sincronizada con el servidor (countdownEndsAt)
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

  return (
    <div className="flex flex-col items-center w-full h-full gap-8 px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 text-emerald-400 font-black text-2xl tracking-widest uppercase">
        <span>🔤</span>
        <span>Tuti Fruti / BASTA Digital</span>
      </div>

      {/* LOBBY — previa con categorías */}
      {round.phase === 'LOBBY' && (
        <div className="flex flex-col items-center gap-8 w-full max-w-3xl justify-center flex-1">
          <h2 className="text-5xl font-black text-white text-center">¡Preparate para jugar!</h2>
          <p className="text-white/50 text-xl">Estas son las categorías de esta ronda:</p>
          <div className="grid grid-cols-2 gap-4 w-full">
            {categories.map((cat) => (
              <div
                key={cat}
                className="bg-white/10 backdrop-blur-md border border-emerald-400/30 rounded-2xl px-6 py-5 text-center"
              >
                <p className="text-2xl font-bold text-emerald-300">{cat}</p>
              </div>
            ))}
          </div>
          <p className="text-lg text-white/40 animate-pulse">Esperando que el admin inicie la ronda...</p>
        </div>
      )}

      {/* COUNTDOWN — 3, 2, 1, ¡A JUGAR! */}
      {round.phase === 'COUNTDOWN' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-6">
          <div
            key={countdown}
            className="text-[14rem] font-black text-emerald-400 leading-none drop-shadow-[0_0_80px_rgba(52,211,153,0.6)] animate-pulse"
          >
            {countdown !== null && countdown > 0 ? countdown : '¡YA!'}
          </div>
          <p className="text-2xl text-white/60 font-bold">La letra es...</p>
          <div className="text-8xl font-black text-white">{round.prompt}</div>
        </div>
      )}

      {/* INPUT — letra + timer + categorías */}
      {round.phase === 'INPUT' && (
        <>
          <div className="relative">
            <div className="text-[12rem] font-black text-emerald-400 leading-none drop-shadow-[0_0_60px_rgba(52,211,153,0.5)] animate-pulse">
              {round.prompt}
            </div>
          </div>
          <div className="flex flex-col items-center gap-6 w-full max-w-3xl">
            <div
              className={`text-6xl font-black tabular-nums ${
                timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
              }`}
            >
              {timeLeft}s
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-4 flex items-center gap-3"
                >
                  <span className="text-emerald-400 text-2xl font-black">{round.prompt}</span>
                  <div className="flex-1">
                    <p className="text-white/50 text-sm uppercase tracking-wider">{cat}</p>
                    <div className="h-1 bg-white/20 rounded-full mt-1 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-lg text-white/50">
              📱 Los jugadores están completando sus categorías en sus celulares...
            </p>
          </div>
        </>
      )}

      {/* VOTING / REVEAL — tabla comparativa de TODOS los jugadores */}
      {(round.phase === 'VOTING' || round.phase === 'REVEAL') && (
        <div className="w-full max-w-4xl flex flex-col gap-6">
          <div className="text-center text-3xl font-black text-emerald-400 animate-bounce">
            {round.bastaBy ? `¡¡TUTIFRUTI!! — ${round.bastaBy}` : '¡Tiempo!'}
          </div>

          {/* En REVEAL: ranking por puntos de la ronda */}
          {round.phase === 'REVEAL' && round.results ? (
            <div className="flex flex-col gap-4">
              {[...round.results.submissions]
                .sort((a, b) => b.pointsEarned - a.pointsEarned)
                .map((sub, idx) => (
                  <div
                    key={sub.id}
                    className={`rounded-2xl p-5 border ${
                      idx === 0
                        ? 'bg-amber-500/20 border-amber-400/50'
                        : sub.isBasta
                        ? 'bg-emerald-500/20 border-emerald-400/50'
                        : 'bg-white/5 border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {idx === 0 && <span className="text-2xl">👑</span>}
                        <span className="text-xl font-black text-white">{sub.nickname}</span>
                        {sub.isBasta && (
                          <span className="text-xs font-bold bg-emerald-400 text-black px-2 py-0.5 rounded-full">
                            🍓 TUTIFRUTI
                          </span>
                        )}
                      </div>
                      <span className="text-2xl font-black text-amber-400">+{sub.pointsEarned} pts</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {categories.map((cat) => (
                        <div key={cat}>
                          <p className="text-white/40 text-xs uppercase tracking-wider">{cat}</p>
                          <p className="text-lg font-bold text-white">
                            {sub.content?.answers?.[cat] || <span className="text-red-400 text-sm">—</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : round.options.length === 0 ? (
            <p className="text-center text-white/40 text-xl">Nadie envió respuestas 😅</p>
          ) : (
            <div className="flex flex-col gap-4">
              {round.options.map((opt) => (
                <div
                  key={opt.id}
                  className={`rounded-2xl p-5 border ${
                    opt.isBasta
                      ? 'bg-emerald-500/20 border-emerald-400/50'
                      : 'bg-white/5 border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl font-black text-white">{opt.nickname}</span>
                    {opt.isBasta && (
                      <span className="text-xs font-bold bg-emerald-400 text-black px-2 py-0.5 rounded-full">
                        🍓 TUTIFRUTI
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {categories.map((cat) => (
                      <div key={cat}>
                        <p className="text-white/40 text-xs uppercase tracking-wider">{cat}</p>
                        <p className="text-lg font-bold text-white">
                          {opt.answers?.[cat] || <span className="text-red-400 text-sm">—</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Leaderboard acumulado Top 10 (solo en REVEAL) */}
          {round.phase === 'REVEAL' && leaderboard.length > 0 && (
            <div className="w-full max-w-2xl mt-4">
              <h3 className="text-center text-2xl font-black text-amber-400 uppercase tracking-widest mb-3">
                🏆 Tabla General (Top 10)
              </h3>
              <div className="flex flex-col gap-1.5">
                {leaderboard.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-xl px-4 py-2 border ${
                      p.rank === 1
                        ? 'bg-amber-400/20 border-amber-400/50'
                        : p.rank <= 3
                        ? 'bg-white/10 border-white/20'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <span className="text-white/60 font-bold w-12">
                      {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`}
                    </span>
                    <span className="flex-1 text-white font-semibold truncate">{p.nickname}</span>
                    <span className="text-amber-300 font-black">{p.totalPoints} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
