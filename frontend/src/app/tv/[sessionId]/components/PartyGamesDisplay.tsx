'use client';

import { useSessionStore } from '@/store/useSessionStore';
import { BluffingDisplay } from './party-games/BluffingDisplay';
import { TutiFrutiDisplay } from './party-games/TutiFrutiDisplay';
import { SocialJudgmentDisplay } from './party-games/SocialJudgmentDisplay';

export function PartyGamesDisplay() {
  const partyGame = useSessionStore((s) => s.snapshot?.partyGame);

  if (!partyGame?.activeRound) {
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
