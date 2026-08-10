'use client';

interface SocialJudgmentRound {
  id: string;
  phase: string;
  prompt: string; // La consigna
  totalPlayers: number;
  options: { id: string; nickname: string; votes?: number }[];
}

export function SocialJudgmentDisplay({ round }: { round: SocialJudgmentRound }) {
  const totalVotes = round.options.reduce((sum, o) => sum + (o.votes ?? 0), 0);
  const sorted = [...round.options].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));

  return (
    <div className="flex flex-col items-center w-full h-full gap-8 px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 text-violet-400 font-black text-2xl tracking-widest uppercase">
        <span>🔮</span>
        <span>Juicio Social</span>
      </div>

      {/* Consigna */}
      <div className="w-full max-w-4xl bg-violet-500/20 backdrop-blur-md rounded-3xl border border-violet-400/30 p-8 text-center">
        <p className="text-4xl font-black text-white leading-snug">
          El más probable que... <span className="text-violet-400">{round.prompt}</span>
        </p>
      </div>

      {/* INPUT PHASE */}
      {round.phase === 'INPUT' && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-6xl animate-bounce">🤫</div>
          <p className="text-2xl text-white/60">Los votos son secretos. Seleccioná en tu celular.</p>
          <p className="text-lg text-white/40">
            Votaron: <span className="text-white font-bold">{totalVotes}</span> de {round.totalPlayers}
          </p>
        </div>
      )}

      {/* VOTING / REVEAL PHASE */}
      {(round.phase === 'VOTING' || round.phase === 'REVEAL') && (
        <div className="w-full max-w-3xl flex flex-col gap-4">
          {sorted.map((player, idx) => {
            const percentage = totalVotes > 0 ? Math.round(((player.votes ?? 0) / totalVotes) * 100) : 0;
            const isTop = idx === 0 && (player.votes ?? 0) > 0;
            return (
              <div
                key={player.id}
                className={`flex items-center gap-4 rounded-2xl border p-4 transition-all duration-500 ${
                  isTop
                    ? 'bg-violet-500/40 border-violet-400 scale-105'
                    : 'bg-white/10 border-white/20'
                }`}
              >
                <span className="text-2xl font-black text-violet-400 w-8">
                  {isTop ? '👑' : `${idx + 1}`}
                </span>
                <span className="flex-1 text-xl text-white font-semibold truncate">
                  {player.nickname}
                </span>
                <div className="flex items-center gap-3 min-w-[160px]">
                  <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-400 rounded-full transition-all duration-700"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-white font-bold text-sm w-10 text-right">{percentage}%</span>
                </div>
                <span className="text-white/50 text-sm w-8 text-right">{player.votes ?? 0}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
