'use client';

interface PodiumEntry {
  rank: number;
  id: string;
  nickname: string;
  totalPoints: number;
  streakCount: number;
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function PodiumDisplay({
  leaderboard,
  title = '¡Gran Ganador!',
  subtitle,
}: {
  leaderboard: PodiumEntry[];
  title?: string;
  subtitle?: string;
}) {
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 10);
  const winner = top3[0];

  return (
    <div className="relative flex flex-col items-center w-full h-full gap-6 px-8 py-6 overflow-hidden">
      {/* Confetti CSS simple */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${(i * 37) % 100}%`,
              animationDelay: `${(i % 10) * 0.3}s`,
              backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#a855f7'][i % 5],
            }}
          />
        ))}
      </div>

      <div className="text-center z-10">
        <div className="text-6xl mb-2 animate-bounce">🏆</div>
        <h2 className="text-5xl font-black text-amber-400 tracking-widest uppercase drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xl font-bold text-amber-300/80 mt-1">{subtitle}</p>
        )}
        {winner && (
          <p className="text-4xl font-black text-white mt-2 animate-pulse">{winner.nickname}</p>
        )}
      </div>

      {/* Podio Top 3 */}
      <div className="flex items-end justify-center gap-4 z-10 mt-4">
        {top3[1] && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">{MEDALS[2]}</span>
            <div className="bg-slate-400/20 border border-slate-300/40 rounded-t-2xl px-6 py-4 text-center min-w-[140px]">
              <p className="text-xl font-black text-white truncate">{top3[1].nickname}</p>
              <p className="text-slate-300 font-bold">{top3[1].totalPoints} pts</p>
            </div>
            <div className="w-full h-16 bg-slate-400/30 rounded-b-lg" />
          </div>
        )}
        {winner && (
          <div className="flex flex-col items-center gap-2 -translate-y-4">
            <span className="text-6xl">{MEDALS[1]}</span>
            <div className="bg-amber-400/30 border border-amber-300/60 rounded-t-2xl px-8 py-6 text-center min-w-[160px] shadow-[0_0_40px_rgba(245,158,11,0.4)]">
              <p className="text-2xl font-black text-white truncate">{winner.nickname}</p>
              <p className="text-amber-300 font-black text-xl">{winner.totalPoints} pts</p>
            </div>
            <div className="w-full h-24 bg-amber-400/40 rounded-b-lg" />
          </div>
        )}
        {top3[2] && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">{MEDALS[3]}</span>
            <div className="bg-amber-700/20 border border-amber-600/40 rounded-t-2xl px-6 py-4 text-center min-w-[140px]">
              <p className="text-xl font-black text-white truncate">{top3[2].nickname}</p>
              <p className="text-amber-200/80 font-bold">{top3[2].totalPoints} pts</p>
            </div>
            <div className="w-full h-12 bg-amber-700/30 rounded-b-lg" />
          </div>
        )}
      </div>

      {/* Resto del Top 10 */}
      {rest.length > 0 && (
        <div className="w-full max-w-2xl z-10 mt-2">
          <div className="grid grid-cols-1 gap-1.5">
            {rest.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2"
              >
                <span className="text-white/60 font-bold w-10">#{p.rank}</span>
                <span className="flex-1 text-white font-semibold truncate">{p.nickname}</span>
                <span className="text-amber-300 font-bold">{p.totalPoints} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
