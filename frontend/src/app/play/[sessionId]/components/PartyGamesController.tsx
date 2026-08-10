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
