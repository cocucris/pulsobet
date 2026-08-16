'use client';

import { useSessionStore } from '@/store/useSessionStore';
import { BluffingDisplay } from './party-games/BluffingDisplay';
import { TutiFrutiDisplay } from './party-games/TutiFrutiDisplay';
import { SocialJudgmentDisplay } from './party-games/SocialJudgmentDisplay';
import { PodiumDisplay } from './party-games/PodiumDisplay';

export function PartyGamesDisplay() {
  const partyGame = useSessionStore((s) => s.snapshot?.partyGame);
  const leaderboardTop10 = useSessionStore((s) => s.snapshot?.leaderboardTop10 || []);

  // Podio definitivo (juego finalizado por el admin)
  if (partyGame?.gameOver) {
    return <PodiumDisplay leaderboard={partyGame.gameOver.leaderboard} title="¡Gran Ganador!" />;
  }

  // Si no hay ronda activa o la ronda terminó, mostrar podio de los mejores puntajes acumulados
  if (!partyGame?.activeRound || partyGame.activeRound.phase === 'FINISHED') {
    const currentLeaderboard = partyGame?.leaderboard || leaderboardTop10;
    const hasScores = currentLeaderboard && currentLeaderboard.length > 0 && currentLeaderboard.some((p: any) => p.totalPoints > 0);

    if (hasScores) {
      return (
        <PodiumDisplay
          leaderboard={currentLeaderboard}
          title="🏆 Mejores Puntajes"
          subtitle="Ronda finalizada • Esperando que el Admin inicie la siguiente..."
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6">
        <div className="text-8xl animate-pulse">🎮</div>
        <h2 className="text-4xl font-black text-white tracking-widest uppercase">Party Games</h2>
        <p className="text-xl text-white/50">Esperando que el Admin inicie una ronda...</p>
      </div>
    );
  }

  const { gameType } = partyGame.activeRound;

  return (
    <div className="w-full h-full">
      {gameType === 'BLUFFING' && <BluffingDisplay round={partyGame.activeRound} />}
      {gameType === 'TUTI_FRUTI' && <TutiFrutiDisplay round={partyGame.activeRound} />}
      {gameType === 'SOCIAL_JUDGMENT' && <SocialJudgmentDisplay round={partyGame.activeRound} />}
    </div>
  );
}
