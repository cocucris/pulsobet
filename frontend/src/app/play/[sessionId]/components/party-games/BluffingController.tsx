'use client';

import { useState } from 'react';

interface BluffingRound {
  id: string;
  phase: string;
  prompt: string;
  submittedCount: number;
  totalPlayers: number;
  options: { id: string; text: string; votes?: number }[];
}

interface Props {
  round: BluffingRound;
  mySubmission: any | null;
  myVote: string | null;
  socket: any;
}

export function BluffingController({ round, mySubmission, myVote, socket }: Props) {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [localVote, setLocalVote] = useState<string | null>(null);

  const activeVote = myVote || localVote;

  const handleSubmit = async () => {
    if (!inputText.trim() || sending) return;
    setSending(true);
    socket?.emit('PARTY_SUBMIT_INPUT', {
      roundId: round.id,
      content: { text: inputText.trim() },
    });
    setTimeout(() => setSending(false), 1000);
  };

  const handleVote = (targetId: string) => {
    if (activeVote) return;
    setLocalVote(targetId);
    socket?.emit('PARTY_CAST_VOTE', { roundId: round.id, targetId });
  };

  // Fase INPUT
  if (round.phase === 'INPUT') {
    if (mySubmission) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 text-center">
          <div className="text-6xl">✅</div>
          <h3 className="text-2xl font-black text-white">¡Respuesta enviada!</h3>
          <div className="bg-white/10 rounded-2xl border border-white/20 p-4 w-full max-w-sm">
            <p className="text-white/60 text-sm mb-1">Tu respuesta</p>
            <p className="text-xl font-bold text-amber-400">"{mySubmission.content?.text}"</p>
          </div>
          <p className="text-white/50">
            {round.submittedCount}/{round.totalPlayers} jugadores respondieron
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="text-center">
          <span className="text-4xl">🤥</span>
          <h2 className="text-xl font-black text-white mt-2">Inventá una respuesta falsa</h2>
          <p className="text-white/50 text-sm mt-1">Hacé que suene creíble...</p>
        </div>

        <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4">
          <p className="text-white/60 text-sm mb-1 uppercase tracking-wider">Premisa</p>
          <p className="text-lg font-semibold text-white">{round.prompt}</p>
        </div>

        <textarea
          id="bluffing-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribí tu respuesta falsa aquí..."
          maxLength={120}
          rows={3}
          className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-amber-400 transition-colors text-lg"
        />
        <p className="text-right text-white/30 text-sm -mt-4">{inputText.length}/120</p>

        <button
          id="bluffing-submit-btn"
          onClick={handleSubmit}
          disabled={!inputText.trim() || sending}
          className="w-full py-4 bg-amber-400 text-black font-black text-xl rounded-2xl disabled:opacity-40 active:scale-95 transition-all"
        >
          {sending ? 'Enviando...' : '🃏 Enviar Respuesta'}
        </button>
      </div>
    );
  }

  // Fase VOTING
  if (round.phase === 'VOTING') {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="text-center mb-2">
          <span className="text-3xl">🗳️</span>
          <h2 className="text-xl font-black text-white mt-1">¿Cuál es la respuesta REAL?</h2>
          <p className="text-white/50 text-sm">Solo tenés un voto</p>
        </div>

        {activeVote ? (
          <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-2xl p-6 text-center animate-fade-in">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-xl font-black text-white">¡Voto registrado!</p>
            <p className="text-white/60 text-sm mt-1">Mirá los resultados en la pantalla principal</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {round.options.map((opt, idx) => (
              <button
                key={opt.id}
                id={`bluffing-vote-${idx}`}
                onClick={() => handleVote(opt.id)}
                className="w-full flex items-center gap-4 bg-white/10 border border-white/20 rounded-2xl p-4 text-left active:scale-95 transition-all hover:border-amber-400/50"
              >
                <span className="text-2xl font-black text-amber-400">{String.fromCharCode(65 + idx)}</span>
                <span className="text-lg text-white font-medium">{opt.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Fase REVEAL / FINISHED
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6 text-center">
      <div className="text-6xl">🎉</div>
      <h2 className="text-2xl font-black text-white">¡Mirá la pantalla!</h2>
      <p className="text-white/50">Se están revelando los resultados...</p>
    </div>
  );
}
