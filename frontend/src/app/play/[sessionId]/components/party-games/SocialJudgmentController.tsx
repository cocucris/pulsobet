'use client';

interface SocialJudgmentRound {
  id: string;
  phase: string;
  prompt: string;
  options: { id: string; nickname: string }[];
}

interface Props {
  round: SocialJudgmentRound;
  myVote: string | null;
  socket: any;
}

export function SocialJudgmentController({ round, myVote, socket }: Props) {
  const handleVote = (playerId: string) => {
    if (myVote) return;
    socket?.emit('PARTY_CAST_VOTE', { roundId: round.id, targetId: playerId });
  };

  if (myVote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 text-center">
        <div className="text-6xl">🔮</div>
        <h3 className="text-2xl font-black text-white">¡Voto secreto registrado!</h3>
        <p className="text-white/50">Mirá la pantalla para ver los resultados en vivo</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="text-center">
        <span className="text-3xl">🔮</span>
        <h2 className="text-lg font-black text-white mt-2">El más probable que...</h2>
        <p className="text-xl font-bold text-violet-400 mt-1">{round.prompt}</p>
        <p className="text-white/40 text-sm mt-2">Tu voto es secreto</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {round.options.map((player, idx) => (
          <button
            key={player.id}
            id={`social-vote-${idx}`}
            onClick={() => handleVote(player.id)}
            className="flex flex-col items-center gap-2 bg-white/10 border border-white/20 rounded-2xl p-4 active:scale-95 transition-all hover:border-violet-400/50 hover:bg-violet-500/10"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl font-black text-white">
              {player.nickname.charAt(0).toUpperCase()}
            </div>
            <span className="text-white font-semibold text-sm truncate w-full text-center">
              {player.nickname}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
