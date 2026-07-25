import { Injectable } from '@nestjs/common';
import { SessionEngine } from '../session/session.engine';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManualQuestionDto } from './dto/create-manual-question.dto';
import { UpdateMatchScoreDto } from './dto/update-match-score.dto';
import { UpdateQuestionTextDto } from './dto/update-question-text.dto';
import { SportsApiWebhookDto } from './dto/sports-api-webhook.dto';

@Injectable()
export class MatchService {
  constructor(
    private sessionEngine: SessionEngine,
    private prisma: PrismaService,
  ) {}

  async createManualQuestion(dto: CreateManualQuestionDto) {
    return this.sessionEngine.createManualQuestion(dto);
  }

  async resolveQuestionExpress(questionId: string, correctOptionId: number) {
    return this.sessionEngine.resolveQuestionExpress(questionId, correctOptionId);
  }

  async updateMatchScore(dto: UpdateMatchScoreDto) {
    return this.sessionEngine.updateScore(
      dto.matchId,
      dto.scoreHome,
      dto.scoreAway,
      dto.homeTeam,
      dto.awayTeam,
      dto.currentMinute,
      dto.status as any,
    );
  }

  async updateLiveQuestion(id: string, dto: UpdateQuestionTextDto) {
    return this.sessionEngine.updateLiveQuestion(id, dto);
  }

  async getCurrentLeaderboard(sessionId: string) {
    const snapshot = await this.sessionEngine.buildSnapshot(sessionId);
    return snapshot.leaderboardTop10;
  }

  async getLiveMatch(sessionId: string) {
    const snapshot = await this.sessionEngine.buildSnapshot(sessionId);
    return snapshot.match;
  }

  async getActiveQuestions(sessionId: string) {
    const snapshot = await this.sessionEngine.buildSnapshot(sessionId);
    return snapshot.currentTrivia ? [snapshot.currentTrivia] : [];
  }

  async handleSportsWebhook(dto: SportsApiWebhookDto) {
    const match = await this.prisma.match.findUnique({
      where: { apiFootballId: dto.fixtureId },
    });

    if (!match) return { status: 'ignored', reason: 'Match not found' };

    if (dto.event === 'GOAL') {
      const isHome = dto.details?.team === 'HOME';
      const newHome = isHome ? match.scoreHome + 1 : match.scoreHome;
      const newAway = !isHome ? match.scoreAway + 1 : match.scoreAway;
      return this.sessionEngine.updateScore(
        match.id,
        newHome,
        newAway,
        match.homeTeam,
        match.awayTeam,
        dto.details?.minute || match.currentMinute,
      );
    }
    return { status: 'processed' };
  }
}
