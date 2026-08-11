'use client';

import { useEffect, useState } from 'react';

interface BluffingRound {
  id: string;
  phase: string;
  prompt: string;
  timeLimit: number;
  createdAt: string;
  submittedCount: number;
  totalPlayers: number;
  options: { id: string; text: string; votes?: number; isReal?: boolean; submittedBy?: string }[];
}

export function BluffingDisplay({ round }: { round: BluffingRound }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (round.phase !== 'INPUT') return;
    const start = new Date(round.createdAt).getTime();
    const end = start + round.timeLimit * 1000;
    const update = () => setTimeLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    update();
    const iv = setInterval(update, 500);
    return () => clearInterval(iv);
  }, [round.createdAt, round.timeLimit, round.phase]);

  const totalVotes = round.options.reduce((sum, o) => sum + (o.votes ?? 0), 0);

  return (
    <div className="flex flex-col items-center w-full h-full gap-8 px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 text-amber-400 font-black text-2xl tracking-widest uppercase">
        <span>🤥</span>
        <span>Mentiroso / Falsa Alarma</span>
      </div>

      {/* Premisa */}
      <div className="w-full max-w-4xl bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 text-center">
        <p className="text-3xl font-bold text-white leading-snug">{round.prompt}</p>
      </div>

      {/* INPUT PHASE */}
      {round.phase === 'INPUT' && (
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="flex items-center gap-4">
            <div
              className={`text-7xl font-black tabular-nums transition-colors ${
                timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-amber-400'
              }`}
            >
              {timeLeft}s
            </div>
          </div>
          <div className="text-2xl text-white/70">
            Respondieron:{' '}
            <span className="text-white font-bold">
              {round.submittedCount}/{round.totalPlayers}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-3 mt-2">
            {Array.from({ length: round.totalPlayers }).map((_, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-full border-2 transition-all ${
                  i < round.submittedCount
                    ? 'bg-amber-400 border-amber-400'
                    : 'bg-white/10 border-white/20'
                }`}
              />
            ))}
          </div>
          <p className="text-lg text-white/50 mt-2">
            ✏️ Los jugadores están escribiendo sus respuestas falsas...
          </p>
        </div>
      )}

      {/* VOTING PHASE */}
      {round.phase === 'VOTING' && (
        <div className="w-full max-w-4xl grid grid-cols-1 gap-4">
          <p className="text-center text-xl text-white/60 mb-2">
            🗳️ ¿Cuál es la respuesta <span className="text-amber-400 font-bold">REAL</span>?
          </p>
          {round.options.map((opt, idx) => {
            const percentage = totalVotes > 0 ? Math.round(((opt.votes ?? 0) / totalVotes) * 100) : 0;
            return (
              <div key={opt.id} className="bg-white/10 rounded-2xl border border-white/20 p-4 flex items-center gap-4">
                <span className="text-3xl font-black text-amber-400 w-8">{String.fromCharCode(65 + idx)}</span>
                <span className="flex-1 text-xl text-white font-semibold">{opt.text}</span>
                <div className="flex items-center gap-2 min-w-[100px]">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-white/60 text-sm w-8 text-right">{opt.votes ?? 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REVEAL PHASE */}
      {round.phase === 'REVEAL' && (
        <div className="w-full max-w-4xl grid grid-cols-1 gap-4">
          <p className="text-center text-2xl font-black text-white mb-2 animate-pulse">
            🎉 ¡RESULTADOS!
          </p>
          {round.options.map((opt, idx) => {
            const percentage = totalVotes > 0 ? Math.round(((opt.votes ?? 0) / totalVotes) * 100) : 0;
            return (
              <div
                key={opt.id}
                className={`rounded-2xl border p-4 flex items-center gap-4 transition-all ${
                  opt.isReal
                    ? 'bg-emerald-500/30 border-emerald-400 scale-105'
                    : 'bg-red-500/20 border-red-400/40'
                }`}
              >
                <span className={`text-3xl font-black w-8 ${opt.isReal ? 'text-emerald-400' : 'text-red-400'}`}>
                  {opt.isReal ? '✅' : '🤥'}
                </span>
                <div className="flex-1">
                  <p className="text-xl text-white font-black tracking-wide">{opt.text}</p>
                  <p className={`text-xs font-bold mt-1 uppercase tracking-wider ${opt.isReal ? 'text-emerald-400 font-black' : 'text-slate-400'}`}>
                    {opt.isReal ? '⭐ RESPUESTA REAL / OFICIAL' : `🤥 Creada por: ${opt.submittedBy || 'Jugador'}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 min-w-[120px]">
                  <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${opt.isReal ? 'bg-emerald-400' : 'bg-red-400'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-white font-bold w-12 text-right">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
