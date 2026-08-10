-- CreateTable
CREATE TABLE "TutiFrutiCategory" (
    "id" TEXT NOT NULL,
    "barId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutiFrutiCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyGameRound" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'INPUT',
    "prompt" TEXT NOT NULL,
    "categories" JSONB,
    "timeLimit" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "PartyGameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyGameSubmission" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isBasta" BOOLEAN NOT NULL DEFAULT false,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "pointsSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyGameSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyGameVote" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyGameVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutiFrutiCategory_barId_name_key" ON "TutiFrutiCategory"("barId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PartyGameSubmission_roundId_playerId_key" ON "PartyGameSubmission"("roundId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyGameVote_roundId_voterId_key" ON "PartyGameVote"("roundId", "voterId");

-- AddForeignKey
ALTER TABLE "TutiFrutiCategory" ADD CONSTRAINT "TutiFrutiCategory_barId_fkey" FOREIGN KEY ("barId") REFERENCES "Bar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyGameRound" ADD CONSTRAINT "PartyGameRound_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyGameSubmission" ADD CONSTRAINT "PartyGameSubmission_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "PartyGameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyGameSubmission" ADD CONSTRAINT "PartyGameSubmission_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyGameVote" ADD CONSTRAINT "PartyGameVote_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "PartyGameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyGameVote" ADD CONSTRAINT "PartyGameVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
