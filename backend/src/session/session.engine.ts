import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RedisSessionCacheService } from './redis-session-cache.service';
import { SessionSnapshot } from './session.snapshot';
import { SessionScheduler } from './session.scheduler';
import {
  MatchScoreUpdatedEvent,
  TriviaCreatedEvent,
  TriviaOpenedEvent,
  TriviaClosedEvent,
  TriviaResultEvent,
  PlayerJoinedEvent,
  PlayerVotedEvent,
  LeaderboardUpdatedEvent,
  RewardReservedEvent,
  RewardDeliveredEvent,
  MatchStartedEvent,
  MatchFinishedEvent,
  SessionResetEvent,
} from './session.events';

@Injectable()
export class SessionEngine {
  private readonly logger = new Logger(SessionEngine.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private sessionCache: RedisSessionCacheService,
    private eventEmitter: EventEmitter2,
    private scheduler: SessionScheduler,
  ) {}

  // Helper para asegurar que siempre exista un bar y una sesión de juego activa
  public async ensureSession(sessionId: string) {
    let session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { bar: true },
    });

    if (!session) {
      session = await this.prisma.gameSession.findFirst({
        where: { isActive: true },
        include: { bar: true },
      });
    }

    if (!session) {
      let bar = await this.prisma.bar.findFirst({
        where: { OR: [{ id: sessionId }, { slug: sessionId }] },
      });
      if (!bar) {
        bar = await this.prisma.bar.findFirst();
      }
      if (!bar) {
        bar = await this.prisma.bar.upsert({
          where: { slug: 'kilkenny' },
          update: {},
          create: {
            id: 'local-kilkenny-test',
            name: 'Kilkenny Pub',
            slug: 'kilkenny',
            address: 'Asunción',
          },
        });
      }

      session = await this.prisma.gameSession.create({
        data: {
          id: sessionId || 'session-demo-01',
          barId: bar.id,
          isActive: true,
        },
        include: { bar: true },
      });
    }

    return session;
  }

  // ─── SNAPSHOT (Single Source of Truth de Hidratación) ─────────────────
  async buildSnapshot(sessionId: string, playerId?: string): Promise<SessionSnapshot> {
    const session = await this.ensureSession(sessionId);

    const actualSessionId = session.id;
    const version = await this.sessionCache.getVersion(actualSessionId);
    const eventNumber = await this.sessionCache.getEventNumber(actualSessionId);
    const connectedPlayersCount = await this.sessionCache.getConnectedCount(actualSessionId);

    // 1. Partido en vivo
    let matchData = await this.sessionCache.getMatch(actualSessionId);
    if (!matchData && session.matchId) {
      const match = await this.prisma.match.findUnique({ where: { id: session.matchId } });
      if (match) {
        matchData = {
          id: match.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          scoreHome: match.scoreHome,
          scoreAway: match.scoreAway,
          status: match.status,
          currentMinute: match.currentMinute,
        };
        await this.sessionCache.setMatch(actualSessionId, matchData);
      }
    }



    // 2. Trivias activas actuales (pueden coexistir varias: pre-partido + flash).
    // Incluye las cerradas por tiempo sin resolver (isClosed, correctOptionId null):
    // el admin debe poder declarar su resultado igual.
    // AISLAMIENTO POR NOCHE: solo trivias del partido vinculado a ESTA sesión.
    const cachedTrivias = await this.sessionCache.getActiveTrivias(actualSessionId);
    const dbQuestions = session.matchId
      ? await this.prisma.liveQuestion.findMany({
          where: { correctOptionId: null, matchId: session.matchId },
          orderBy: { expiresAt: 'asc' },
        })
      : [];

    // Merge por id: la hidratación NO pisa el cache (evita perder trivias recién
    // creadas por race conditions entre el upsert y el fallback a Postgres)
    const dbTrivias = await Promise.all(dbQuestions.map((q) => this.enrichQuestionStats(q)));
    const merged = [...dbTrivias];
    for (const cached of cachedTrivias) {
      if (cached?.id && !merged.some((t) => t.id === cached.id) && cached.correctOptionId == null) {
        merged.push(cached);
      }
    }
    const activeTrivias = merged;
    await this.sessionCache.setActiveTrivias(actualSessionId, activeTrivias);

    // 2b. Historial de trivias resueltas de la sesión (solo del partido de ESTA noche)
    let resolvedTrivias = await this.sessionCache.getResolvedTrivias(actualSessionId);
    if (resolvedTrivias.length === 0 && session.matchId) {
      const resolvedQuestions = await this.prisma.liveQuestion.findMany({
        where: { correctOptionId: { not: null }, matchId: session.matchId },
        orderBy: { expiresAt: 'asc' },
        take: 20,
      });

      if (resolvedQuestions.length > 0) {
        resolvedTrivias = await Promise.all(
          resolvedQuestions.map(async (q) => {
            const enriched = await this.enrichQuestionStats(q);
            const winnersCount = await this.prisma.prediction.count({
              where: { questionId: q.id, status: 'HIT' },
            });
            return { ...enriched, correctOptionId: q.correctOptionId, winnersCount };
          }),
        );
        for (const t of resolvedTrivias) {
          await this.sessionCache.addResolvedTrivia(actualSessionId, t);
        }
      }
    }

    // 3. Leaderboard Top 10
    const topPlayersRaw = await this.prisma.player.findMany({
      where: { sessionId: actualSessionId },
      orderBy: { totalPoints: 'desc' },
      take: 10,
    });

    const leaderboardTop10 = topPlayersRaw.map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      nickname: p.nickname,
      totalPoints: p.totalPoints,
      streakCount: p.streakCount,
    }));

    // 4. Perfil del jugador actual
    let myPlayer = null;
    if (playerId) {
      const playerObj = await this.prisma.player.findUnique({ where: { id: playerId } });
      if (playerObj) {
        let votedTriviaIds: string[] = [];
        if (activeTrivias.length > 0) {
          const votes = await this.prisma.prediction.findMany({
            where: { playerId, questionId: { in: activeTrivias.map((t) => t.id) } },
            select: { questionId: true },
          });
          votedTriviaIds = votes.map((v) => v.questionId);
        }

        myPlayer = {
          id: playerObj.id,
          nickname: playerObj.nickname,
          totalPoints: playerObj.totalPoints,
          votedTriviaIds,
        };
      }
    }

    // 5. Premios del bar
    let rewards = await this.sessionCache.getRewards(session.barId);
    if (!rewards) {
      rewards = await this.prisma.reward.findMany({
        where: { barId: session.barId },
        select: { id: true, title: true, pointsCost: true, stock: true },
      });
      await this.sessionCache.setRewards(session.barId, rewards);
    }

    return {
      sessionId: actualSessionId,
      barId: session.barId,
      version,
      eventNumber,
      serverTime: new Date().toISOString(),
      match: matchData,
      activeTrivias,
      resolvedTrivias,
      leaderboardTop10,
      myPlayer,
      connectedPlayersCount,
      rewards: rewards || [],
      barSettings: {
        name: session.bar?.name || 'PulsoBet Bar',
        slug: session.bar?.slug || 'pulsobet',
      },
      connectionStatus: 'connected',
    };
  }

  // ─── COMANDOS DE PARTIDO ─────────────────────────────────────────────

  async startMatch(sessionId: string, homeTeam: string, awayTeam: string, status: 'SCHEDULED' | 'LIVE' = 'SCHEDULED') {
    // ensureSession resuelve barId/slug/sessionId a la sesión activa real (con fallback)
    const session = await this.ensureSession(sessionId);

    const match = await this.prisma.match.create({
      data: {
        apiFootballId: Math.floor(1000 + Math.random() * 9000),
        homeTeam,
        awayTeam,
        startTime: new Date(),
        status,
      },
    });

    await this.prisma.gameSession.update({
      where: { id: session.id },
      data: { matchId: match.id },
    });

    const matchPayload = {
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      scoreHome: 0,
      scoreAway: 0,
      status: match.status,
      currentMinute: 0,
    };

    await this.sessionCache.setMatch(session.id, matchPayload);
    await this.sessionCache.incrementVersion(session.id);
    const eventNumber = await this.sessionCache.incrementEventNumber(session.id);

    this.eventEmitter.emit(
      'match.started',
      new MatchStartedEvent(session.id, matchPayload, eventNumber),
    );

    // Devolvemos también el sessionId real para que el admin pueda alinear su sala de socket
    return { ...matchPayload, sessionId: session.id };
  }

  async resetMatch(sessionId: string) {
    const session = await this.ensureSession(sessionId);

    await this.prisma.gameSession.update({
      where: { id: session.id },
      data: { matchId: null },
    });

    await this.sessionCache.setMatch(session.id, null);
    await this.sessionCache.incrementVersion(session.id);
    const eventNumber = await this.sessionCache.incrementEventNumber(session.id);

    this.eventEmitter.emit(
      'match.finished',
      new MatchFinishedEvent(session.id, null, eventNumber),
    );

    return { status: 'success', message: 'Partido reseteado' };
  }

  /**
   * CERRAR NOCHE: archiva la sesión actual (con jugadores, puntos y canjes para
   * reportes) y crea una fresca con el MISMO id, para que el QR/link de siempre
   * arranque en cero. Limpia todo el estado efímero (Redis) y avisa por socket.
   */
  async closeAndResetSession(sessionId: string) {
    const session = await this.ensureSession(sessionId);
    const oldId = session.id;
    const archivedId = `${oldId}-closed-${Date.now()}`;

    await this.prisma.$transaction(async (tx) => {
      // Archivar la sesión vieja: se renombra el id para liberar el id fijo y se desactiva
      await tx.gameSession.update({
        where: { id: oldId },
        data: { id: archivedId, isActive: false, matchId: null },
      });

      // Crear la sesión fresca con el id de siempre
      await tx.gameSession.create({
        data: {
          id: oldId,
          barId: session.barId,
          isActive: true,
          matchId: null,
        },
      });
    });

    // Limpiar todo el estado efímero (mismo id de sesión)
    await this.sessionCache.resetSessionState(oldId);
    try {
      await this.redisService.clearLeaderboard(oldId);
    } catch (e) {
      this.logger.warn(`Redis fallback on clearLeaderboard al cerrar noche: ${e.message}`);
    }

    const eventNumber = await this.sessionCache.incrementEventNumber(oldId);

    this.eventEmitter.emit('session.reset', new SessionResetEvent(oldId, eventNumber));

    this.logger.log(`Noche cerrada: sesión ${oldId} archivada como ${archivedId} y recreada en cero.`);

    return { status: 'success', newSessionId: oldId, archivedSessionId: archivedId };
  }

  async updateScore(
    matchId: string,
    scoreHome: number,
    scoreAway: number,
    homeTeam?: string,
    awayTeam?: string,
    currentMinute?: number,
    status?: 'SCHEDULED' | 'LIVE' | 'FINISHED',
  ) {
    const dataToUpdate: any = { scoreHome, scoreAway };
    if (homeTeam) dataToUpdate.homeTeam = homeTeam;
    if (awayTeam) dataToUpdate.awayTeam = awayTeam;
    if (currentMinute !== undefined) dataToUpdate.currentMinute = currentMinute;
    if (status) dataToUpdate.status = status;

    // Regla de negocio: no se puede finalizar el partido con trivias sin resolver
    if (status === 'FINISHED') {
      const pendingTrivias = await this.prisma.liveQuestion.count({
        where: { matchId, correctOptionId: null },
      });
      if (pendingTrivias > 0) {
        throw new BadRequestException(
          `Tenés ${pendingTrivias} trivia(s) sin resolver. Resolvelas en el Control de Trivias antes de finalizar el partido.`,
        );
      }
    }

    const match = await this.prisma.match.update({
      where: { id: matchId },
      data: dataToUpdate,
    });

    const session = await this.prisma.gameSession.findFirst({
      where: { matchId: match.id, isActive: true },
    });

    const matchPayload = {
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      scoreHome: match.scoreHome,
      scoreAway: match.scoreAway,
      status: match.status,
      currentMinute: match.currentMinute,
    };

    // Sin fallback hardcodeado: si no hay sesión activa con este partido, degradamos
    // a cualquier sesión activa real para que el broadcast llegue a las pantallas
    let sessionId: string;
    if (session) {
      sessionId = session.id;
    } else {
      const anyActive = await this.prisma.gameSession.findFirst({ where: { isActive: true } });
      if (!anyActive) {
        this.logger.warn(`updateScore: partido ${matchId} actualizado sin sesión activa asociada`);
        return matchPayload;
      }
      sessionId = anyActive.id;
    }

    await this.sessionCache.setMatch(sessionId, matchPayload);
    await this.sessionCache.incrementVersion(sessionId);
    const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);

    this.eventEmitter.emit(
      'match.score.updated',
      new MatchScoreUpdatedEvent(
        sessionId,
        match.scoreHome,
        match.scoreAway,
        match.homeTeam,
        match.awayTeam,
        match.status,
        eventNumber,
      ),
    );

    return matchPayload;
  }

  // ─── COMANDOS DE TRIVIA ──────────────────────────────────────────────

  async createManualQuestion(dto: {
    barId: string;
    questionText: string;
    options: { id: number; text: string }[];
    pointsReward?: number;
    expiresInSeconds?: number;
    imageUrl?: string | null;
    isFlash?: boolean;
  }) {
    let activeSession = await this.prisma.gameSession.findFirst({
      where: { barId: dto.barId, isActive: true },
    });

    if (!activeSession) {
      activeSession = await this.prisma.gameSession.findFirst({ where: { isActive: true } });
    }

    if (!activeSession) {
      let bar = await this.prisma.bar.findFirst({ where: { id: dto.barId } });
      if (!bar) {
        bar = await this.prisma.bar.upsert({
          where: { slug: 'kilkenny' },
          update: {},
          create: {
            id: dto.barId || 'local-kilkenny-test',
            name: 'Kilkenny Pub',
            slug: 'kilkenny',
            address: 'Asunción',
          },
        });
      }
      activeSession = await this.prisma.gameSession.create({
        data: {
          id: 'session-demo-01',
          barId: bar.id,
          isActive: true,
        },
      });
    }

    // Enlazar la trivia al partido de ESTA sesión (aislamiento por noche);
    // si la sesión aún no tiene partido, usar/crear uno LIVE como antes
    let liveMatch = activeSession.matchId
      ? await this.prisma.match.findUnique({ where: { id: activeSession.matchId } })
      : null;

    if (!liveMatch) {
      liveMatch = await this.prisma.match.findFirst({
        where: { status: 'LIVE' },
        orderBy: { startTime: 'desc' },
      });
    }

    if (!liveMatch) {
      liveMatch = await this.prisma.match.create({
        data: {
          apiFootballId: Math.floor(1000 + Math.random() * 9000),
          homeTeam: 'Olimpia',
          awayTeam: 'Cerro Porteño',
          startTime: new Date(),
          status: 'LIVE',
        },
      });
    }

    // Si la sesión no tenía partido vinculado, vincularlo ahora
    if (!activeSession.matchId) {
      await this.prisma.gameSession.update({
        where: { id: activeSession.id },
        data: { matchId: liveMatch.id },
      });
    }

    const isFlash = dto.isFlash === true;
    const duration = isFlash
      ? (dto.expiresInSeconds || 15)
      : (dto.expiresInSeconds && dto.expiresInSeconds >= 10 ? dto.expiresInSeconds : 3600);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + duration);

    const liveQuestion = await this.prisma.liveQuestion.create({
      data: {
        matchId: liveMatch.id,
        questionText: dto.questionText,
        options: dto.options as any,
        expiresAt,
        pointsReward: dto.pointsReward || (isFlash ? 900 : 150),
        imageUrl: dto.imageUrl || null,
        isFlash,
      },
    });

    const enrichedTrivia = await this.enrichQuestionStats(liveQuestion);
    await this.sessionCache.upsertActiveTrivia(activeSession.id, enrichedTrivia);

    await this.sessionCache.incrementVersion(activeSession.id);
    const eventNumber = await this.sessionCache.incrementEventNumber(activeSession.id);

    // Programar cierre automático limpio mediante Scheduler (sin setTimeout suelto)
    const delayMs = expiresAt.getTime() - Date.now();
    if (delayMs > 0) {
      this.scheduler.scheduleAutoClose(liveQuestion.id, delayMs, async () => {
        await this.closeTrivia(activeSession.id, liveQuestion.id);
      });
    }

    this.eventEmitter.emit(
      'trivia.opened',
      new TriviaOpenedEvent(activeSession.id, enrichedTrivia, eventNumber),
    );

    return {
      status: 'success',
      questionId: liveQuestion.id,
      expiresAt: liveQuestion.expiresAt,
      trivia: enrichedTrivia,
    };
  }

  async closeTrivia(sessionId: string, triviaId: string) {
    const closed = await this.prisma.liveQuestion.update({
      where: { id: triviaId },
      data: { isClosed: true },
    });

    // La trivia cerrada por tiempo PERMANECE visible (isClosed) para que el admin
    // pueda declarar su resultado; solo se remueve al resolverse.
    const enriched = await this.enrichQuestionStats(closed);
    await this.sessionCache.upsertActiveTrivia(sessionId, enriched);
    await this.sessionCache.incrementVersion(sessionId);
    const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);

    this.eventEmitter.emit(
      'trivia.closed',
      new TriviaClosedEvent(sessionId, triviaId, eventNumber, enriched),
    );
  }

  async resolveQuestionExpress(questionId: string, correctOptionId: number) {
    const question = await this.prisma.liveQuestion.findUnique({
      where: { id: questionId },
      include: { predictions: true },
    });
    if (!question) throw new BadRequestException('Pregunta no encontrada');

    await this.prisma.liveQuestion.update({
      where: { id: questionId },
      data: { correctOptionId, isClosed: true },
    });

    this.scheduler.cancelTimer(questionId);

    const winningPredictions = question.predictions.filter(
      (p) => Number(p.chosenOptionId) === Number(correctOptionId),
    );

    const pointsToAward = question.pointsReward || 100;

    let targetSessionId = 'session-demo-01';
    const activeSession = await this.prisma.gameSession.findFirst({ where: { isActive: true } });
    if (activeSession) targetSessionId = activeSession.id;

    for (const winPred of winningPredictions) {
      await this.prisma.prediction.update({
        where: { id: winPred.id },
        data: { status: 'HIT', pointsEarned: pointsToAward },
      });

      await this.prisma.player.update({
        where: { id: winPred.playerId },
        data: {
          totalPoints: { increment: pointsToAward },
          streakCount: { increment: 1 },
        },
      });

      await this.redisService.incrementPlayerScore(targetSessionId, winPred.playerId, pointsToAward);
    }

    const losingPredictions = question.predictions.filter(
      (p) => Number(p.chosenOptionId) !== Number(correctOptionId),
    );

    for (const losePred of losingPredictions) {
      await this.prisma.prediction.update({
        where: { id: losePred.id },
        data: { status: 'MISSED', pointsEarned: -pointsToAward },
      });

      // Regla de negocio: el fallo resta puntos y el saldo puede quedar negativo
      await this.prisma.player.update({
        where: { id: losePred.playerId },
        data: {
          totalPoints: { decrement: pointsToAward },
          streakCount: 0,
        },
      });

      await this.redisService.incrementPlayerScore(targetSessionId, losePred.playerId, -pointsToAward);
    }

    await this.sessionCache.removeActiveTrivia(targetSessionId, questionId);

    // Guardar en el historial de resueltas de la sesión (visible hasta cerrar la sesión)
    const resolvedTrivia = {
      ...(await this.enrichQuestionStats(question)),
      correctOptionId,
      winnersCount: winningPredictions.length,
    };
    await this.sessionCache.addResolvedTrivia(targetSessionId, resolvedTrivia);

    await this.sessionCache.incrementVersion(targetSessionId);
    const eventNumber = await this.sessionCache.incrementEventNumber(targetSessionId);

    // Obtener nuevo leaderboard
    const topPlayers = await this.getLeaderboard(targetSessionId);

    this.eventEmitter.emit(
      'trivia.result',
      new TriviaResultEvent(
        targetSessionId,
        questionId,
        correctOptionId,
        winningPredictions.length,
        topPlayers,
        eventNumber,
        resolvedTrivia,
      ),
    );

    return {
      status: 'resolved',
      winnersCount: winningPredictions.length,
      pointsAwarded: pointsToAward,
    };
  }

  async updateLiveQuestion(questionId: string, dto: { questionText?: string; options?: { id: number; text: string }[] }) {
    const existing = await this.prisma.liveQuestion.findUnique({ where: { id: questionId } });
    if (!existing) throw new BadRequestException('Trivia no encontrada');

    const updated = await this.prisma.liveQuestion.update({
      where: { id: questionId },
      data: {
        ...(dto.questionText && { questionText: dto.questionText }),
        ...(dto.options && { options: dto.options as any }),
      },
    });

    const activeSession = await this.prisma.gameSession.findFirst({ where: { isActive: true } });
    const sessionId = activeSession ? activeSession.id : 'session-demo-01';

    const enriched = await this.enrichQuestionStats(updated);
    await this.sessionCache.upsertActiveTrivia(sessionId, enriched);

    await this.sessionCache.incrementVersion(sessionId);
    const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);

    this.eventEmitter.emit(
      'trivia.opened',
      new TriviaOpenedEvent(sessionId, enriched, eventNumber),
    );

    return enriched;
  }

  // ─── COMANDOS DE VOTO Y JUGADOR ──────────────────────────────────────

  async submitVote(sessionId: string, playerId: string, questionId: string, chosenOptionId: number) {
    const question = await this.prisma.liveQuestion.findUnique({ where: { id: questionId } });

    if (!question) {
      return { accepted: false, reason: 'La trivia ya no está disponible.' };
    }
    if (question.isClosed || question.correctOptionId !== null) {
      return { accepted: false, reason: 'Esta trivia ya fue cerrada.' };
    }
    if (question.expiresAt && question.expiresAt.getTime() < Date.now()) {
      return { accepted: false, reason: 'Se acabó el tiempo para votar.' };
    }

    const existing = await this.prisma.prediction.findFirst({
      where: { playerId, questionId },
    });

    if (existing) {
      // El jugador ya votó: lo tratamos como aceptado (idempotente) para que la UI quede consistente
      return { accepted: true };
    }

    const optionNum = Number(chosenOptionId);

    await this.prisma.prediction.create({
      data: {
        playerId,
        questionId,
        chosenOptionId: optionNum,
        status: 'PENDING',
      },
    });

    const enriched = await this.enrichQuestionStats(question);
    await this.sessionCache.upsertActiveTrivia(sessionId, enriched);

    await this.sessionCache.incrementVersion(sessionId);
    const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);

    this.eventEmitter.emit(
      'player.voted',
      new PlayerVotedEvent(
        sessionId,
        questionId,
        enriched.options,
        enriched.totalVotes,
        eventNumber,
      ),
    );

    return { accepted: true };
  }

  // ─── HELPER MÉTODOS ──────────────────────────────────────────────────

  private async getLeaderboard(sessionId: string) {
    const topPlayers = await this.prisma.player.findMany({
      where: { sessionId },
      orderBy: { totalPoints: 'desc' },
      take: 10,
    });

    return topPlayers.map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      nickname: p.nickname,
      totalPoints: p.totalPoints,
      streakCount: p.streakCount,
    }));
  }

  private async enrichQuestionStats(question: any) {
    const voteCounts = await this.prisma.prediction.groupBy({
      by: ['chosenOptionId'],
      where: { questionId: question.id },
      _count: { id: true },
    });

    const totalVotes = voteCounts.reduce((sum, item) => sum + item._count.id, 0);
    const optionsArray = Array.isArray(question.options) ? (question.options as any[]) : [];

    const optionsWithStats = optionsArray.map((opt) => {
      const match = voteCounts.find((v) => Number(v.chosenOptionId) === Number(opt.id));
      const count = match ? match._count.id : 0;
      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      return {
        ...opt,
        count,
        percentage,
      };
    });

    return {
      id: question.id,
      questionText: question.questionText,
      options: optionsWithStats,
      pointsReward: question.pointsReward,
      imageUrl: question.imageUrl,
      isFlash: question.isFlash,
      isClosed: question.isClosed,
      expiresAt: question.expiresAt,
      totalVotes,
    };
  }
}
