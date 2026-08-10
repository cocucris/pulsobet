'use client';

import { useEffect, useState } from 'react';

interface TutiFrutiRound {
  id: string;
  phase: string;
  prompt: string; // La letra
  categories: string[] | null;
  timeLimit: number;
  createdAt: string;
  submittedCount: number;
  totalPlayers: number;
  options: { id: string; answers: Record<string, string>; nickname: string }[];
}

export function TutiFrutiDisplay({ round }: { round: TutiFrutiRound }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const categories = round.categories ?? [];
  const bastaPlayer = round.options[0]; // En VOTING, options[0] es el jugador que hizo BASTA

  useEffect(() => {
    if (round.phase !== 'INPUT') return;
    const start = new Date(round.createdAt).getTime();
    const end = start + round.timeLimit * 1000;
    const update = () => setTimeLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    update();
    const iv = setInterval(update, 500);
    return () => clearInterval(iv);
  }, [round.createdAt, round.timeLimit, round.phase]);

  return (
    <div className="flex flex-col items-center w-full h-full gap-8 px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 text-emerald-400 font-black text-2xl tracking-widest uppercase">
        <span>🔤</span>
        <span>Tuti Fruti / BASTA Digital</span>
      </div>

      {/* Letra gigante */}
      <div className="relative">
        <div className="text-[12rem] font-black text-emerald-400 leading-none drop-shadow-[0_0_60px_rgba(52,211,153,0.5)] animate-pulse">
          {round.prompt}
        </div>
      </div>

      {/* INPUT PHASE */}
      {round.phase === 'INPUT' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-3xl">
          {/* Timer */}
          <div
            className={`text-6xl font-black tabular-nums ${
              timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
            }`}
          >
            {timeLeft}s
          </div>

          {/* Categorías */}
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
      )}

      {/* VOTING PHASE — mostrar respuestas del primer BASTA */}
      {(round.phase === 'VOTING' || round.phase === 'REVEAL') && bastaPlayer && (
        <div className="w-full max-w-3xl">
          <div className="text-center text-2xl font-black text-emerald-400 mb-6 animate-bounce">
            ¡¡BASTA!! — {bastaPlayer.nickname}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {categories.map((cat) => (
              <div
                key={cat}
                className="bg-emerald-500/20 border border-emerald-400/40 rounded-2xl p-5"
              >
                <p className="text-white/50 text-sm uppercase tracking-wider mb-1">{cat}</p>
                <p className="text-2xl font-bold text-white">
                  {bastaPlayer.answers?.[cat] || (
                    <span className="text-red-400 text-lg">Sin respuesta ❌</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
