-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CardChoice" AS ENUM ('INTERESTED', 'INTRODUCE', 'PASS');

-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'MATCH';

-- CreateTable
CREATE TABLE "ProfileCard" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "playerId" TEXT,
    "tableNumber" TEXT,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "position" TEXT,
    "strongFoot" TEXT,
    "fitness" INTEGER,
    "skills" JSONB NOT NULL,
    "objective" TEXT,
    "photoUrl" TEXT,
    "status" "CardStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardVote" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "choice" "CardChoice" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardVote_cardId_playerId_key" ON "CardVote"("cardId", "playerId");

-- AddForeignKey
ALTER TABLE "ProfileCard" ADD CONSTRAINT "ProfileCard_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardVote" ADD CONSTRAINT "CardVote_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "ProfileCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
