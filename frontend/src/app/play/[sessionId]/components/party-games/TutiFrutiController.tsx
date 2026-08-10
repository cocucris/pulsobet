'use client';

import { useState } from 'react';

interface TutiFrutiRound {
  id: string;
  phase: string;
  prompt: string;
  categories: string[] | null;
  submittedCount: number;
  totalPlayers: number;
}

interface Props {
  round: TutiFrutiRound;
  mySubmission: any | null;
  socket: any;
}

export function TutiFrutiController({ round, mySubmission, socket }: Props) {
  const categories = round.categories ?? [];
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(categories.map((c) => [c, ''])),
  );
  const [sending, setSending] = useState(false);

  const handleBasta = () => {
    if (sending) return;
    setSending(true);
    socket?.emit('PARTY_BASTA', { roundId: round.id, answers });
    setTimeout(() => setSending(false), 1500);
  };

  if (mySubmission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 text-center">
        {mySubmission.isBasta ? (
          <>
            <div className="text-7xl">🏆</div>
            <h3 className="text-3xl font-black text-emerald-400">¡BASTA!</h3>
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
              <p className="text-white font-semibold">{mySubmission.content?.answers?.[cat] || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (round.phase === 'INPUT') {
    return (
      <div className="flex flex-col gap-5 p-4">
        <div className="text-center">
          <div className="text-7xl font-black text-emerald-400 leading-none">{round.prompt}</div>
          <p className="text-white/50 text-sm mt-2">Completá todas las categorías y presioná BASTA</p>
        </div>

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
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-400 transition-colors text-lg"
              />
            </div>
          ))}
        </div>

        <button
          id="tuti-basta-btn"
          onClick={handleBasta}
          disabled={sending}
          className="w-full py-5 bg-emerald-400 text-black font-black text-2xl rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-emerald-400/30 mt-2"
        >
          {sending ? 'Enviando...' : '🛑 ¡BASTA!'}
        </button>
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
