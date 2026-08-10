'use client';

import { useSessionStore } from '@/store/useSessionStore';
import { BluffingController } from './party-games/BluffingController';
import { TutiFrutiController } from './party-games/TutiFrutiController';
import { SocialJudgmentController } from './party-games/SocialJudgmentController';

interface Props {
  socket: any;
}

export function PartyGamesController({ socket }: Props) {
  const partyGame = useSessionStore((s) => s.snapshot?.partyGame);
  const myPlayer = useSessionStore((s) => s.snapshot?.myPlayer);

  // Pantalla final (juego terminado): posición personal
  if (partyGame?.gameOver) {
    const total = partyGame.gameOver.leaderboard.length;
    const myEntry = partyGame.gameOver.leaderboard.find((p) => p.id === myPlayer?.id);
    const myRank = myEntry?.rank ?? myPlayer?.rank;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 text-center">
        <div className="text-7xl animate-bounce">🏆</div>
        <h2 className="text-3xl font-black text-amber-400">¡Juego Terminado!</h2>
        {myRank ? (
          <p className="text-xl text-white">
            Quedaste en el puesto <span className="font-black text-emerald-400">#{myRank}</span>
            {total > 0 ? ` de ${total}` : ''}
          </p>
        ) : (
          <p className="text-xl text-white">¡Gracias por jugar!</p>
        )}
        {myPlayer && (
          <p className="text-white/60">Total acumulado: <span className="font-bold text-amber-300">{myPlayer.totalPoints} pts</span></p>
        )}
        <p className="text-white/40 text-sm animate-pulse">Mirá la pantalla para ver el podio</p>
      </div>
    );
  }

  if (!partyGame?.activeRound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <div className="text-7xl">🎮</div>
        <h2 className="text-2xl font-black text-white text-center">Party Games</h2>
        <p className="text-white/50 text-center">
          El Admin está preparando la siguiente ronda...
        </p>
      </div>
    );
  }

  const { gameType } = partyGame.activeRound;

  return (
    <div className="w-full">
      {gameType === 'BLUFFING' && (
        <BluffingController
          round={partyGame.activeRound}
          mySubmission={partyGame.mySubmission}
          myVote={partyGame.myVote}
          socket={socket}
        />
      )}
      {gameType === 'TUTI_FRUTI' && (
        <TutiFrutiController
          round={partyGame.activeRound}
          mySubmission={partyGame.mySubmission}
          socket={socket}
        />
      )}
      {gameType === 'SOCIAL_JUDGMENT' && (
        <SocialJudgmentController
          round={partyGame.activeRound}
          myVote={partyGame.myVote}
          socket={socket}
        />
      )}
    </div>
  );
}
