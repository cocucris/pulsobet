import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LiveGateway } from '../live/live.gateway';
import { RedisService } from '../redis/redis.service';
import { CreateManualQuestionDto } from './dto/create-manual-question.dto';
import { SportsApiWebhookDto } from './dto/sports-api-webhook.dto';

@Injectable()
export class MatchService {
  constructor(
    private prisma: PrismaService,
    private liveGateway: LiveGateway, // Inyectamos el Gateway de WebSockets
    private redisService: RedisService, // Inyectamos el Servicio de Redis para ZSET Leaderboard
  ) {}

  async createManualQuestion(dto: CreateManualQuestionDto) {
    // 1. Obtener la sesión activa del bar
    let activeSession = await this.prisma.gameSession.findFirst({
      where: { barId: dto.barId, isActive: true },
    });

    if (!activeSession) {
      activeSession = await this.prisma.gameSession.findFirst({
        where: { isActive: true },
      });
    }

    if (!activeSession) {
      throw new BadRequestException('No hay ninguna sesión de juego activa en este bar.');
    }

    // 2. Buscar si hay un partido EN VIVO actualmente para asociar la trivia
    const liveMatch = await this.prisma.match.findFirst({
      where: { status: 'LIVE' },
      orderBy: { startTime: 'desc' },
    });

    if (!liveMatch) {
      throw new BadRequestException('No se encontró ningún partido en vivo activo.');
    }

    // 3. Calcular la fecha exacta de expiración según el tipo (Flash vs Estándar)
    const isFlash = dto.isFlash === true;
    const duration = isFlash
      ? (dto.expiresInSeconds || 15)
      : (dto.expiresInSeconds && dto.expiresInSeconds >= 10 ? dto.expiresInSeconds : 3600);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + duration);

    // 4. Guardar la pregunta de forma persistente en PostgreSQL
    const liveQuestion = await this.prisma.liveQuestion.create({
      data: {
        matchId: liveMatch.id,
        questionText: dto.questionText,
        options: dto.options as any, // Mapeo automático al JSON de Postgres
        expiresAt,
        pointsReward: dto.pointsReward || (isFlash ? 900 : 150), // 900 PTS para Flash, 150 para estándar por defecto
        imageUrl: dto.imageUrl || null,
        isFlash,
      },
    });

    // 5. ¡BROADCAST EN TIEMPO REAL! Enviamos la pregunta a través del WebSocket
    // Usamos el id de la sesión para segmentar la sala del local
    this.liveGateway.broadcastNewQuestion(activeSession.id, {
      id: liveQuestion.id,
      questionText: liveQuestion.questionText,
      options: liveQuestion.options,
      pointsReward: liveQuestion.pointsReward,
      imageUrl: liveQuestion.imageUrl,
      isFlash: liveQuestion.isFlash,
      expiresAt: liveQuestion.expiresAt,
    });

    return {
      status: 'success',
      message: 'Trivia inyectada y propagada en tiempo real.',
      questionId: liveQuestion.id,
    };
  }

  /**
   * Obtiene TODAS las preguntas activas vigentes (no expiradas y sin resolver)
   * calculando las tendencias de votación en tiempo real para cada opción
   */
  async getActiveQuestions(sessionId?: string) {
    const activeQuestions = await this.prisma.liveQuestion.findMany({
      where: {
        correctOptionId: null,
      },
      orderBy: { expiresAt: 'desc' },
    });

    const enriched = await Promise.all(
      activeQuestions.map(async (q) => {
        const voteCounts = await this.prisma.prediction.groupBy({
          by: ['chosenOptionId'],
          where: { questionId: q.id },
          _count: { id: true },
        });

        const totalVotes = voteCounts.reduce((sum, item) => sum + item._count.id, 0);
        const optionsArray = Array.isArray(q.options) ? (q.options as any[]) : [];

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
          id: q.id,
          questionText: q.questionText,
          options: optionsWithStats,
          pointsReward: q.pointsReward,
          imageUrl: q.imageUrl,
          isFlash: q.isFlash,
          isClosed: q.isClosed,
          expiresAt: q.expiresAt,
          totalVotes,
        };
      })
    );

    return enriched;
  }

  /**
   * Obtiene la primera pregunta activa vigente (fallback para compatibilidad)
   */
  async getActiveQuestion(sessionId?: string) {
    const questions = await this.getActiveQuestions(sessionId);
    return questions.length > 0 ? questions[0] : null;
  }

  /**
   * Obtiene la tabla de posiciones actual del bar (Top 10) desde la base de datos
   * y sincroniza Redis ZSET para garantizar consistencia absoluta
   */
  async getCurrentLeaderboard(sessionId: string) {
    let targetSessionId = sessionId;

    let sessionExists = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!sessionExists) {
      const activeSession = await this.prisma.gameSession.findFirst({
        where: { isActive: true },
      });
      if (activeSession) {
        targetSessionId = activeSession.id;
      }
    }

    const topPlayers = await this.prisma.player.findMany({
      where: { sessionId: targetSessionId },
      orderBy: { totalPoints: 'desc' },
      take: 10,
    });

    for (const p of topPlayers) {
      await this.redisService.setPlayerScore(targetSessionId, p.id, p.totalPoints);
    }

    return topPlayers.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      tableNumber: p.tableNumber,
      totalPoints: p.totalPoints,
      streakCount: p.streakCount,
    }));
  }

  /**
   * Resolución ultra rápida de preguntas utilizando Redis ZSET para el cálculo de Leaderboards
   */
  async resolveQuestionExpress(questionId: string, correctOptionId: number) {
    // 1. Marcar en Postgres la respuesta correcta
    const question = await this.prisma.liveQuestion.update({
      where: { id: questionId },
      data: { correctOptionId },
      include: { match: true },
    });

    if (!question) return { status: 'error', message: 'Pregunta no encontrada' };

    // Actualizamos el estado de las predicciones en PostgreSQL
    await this.prisma.prediction.updateMany({
      where: { questionId, chosenOptionId: correctOptionId },
      data: { status: 'HIT' },
    });

    await this.prisma.prediction.updateMany({
      where: { questionId, NOT: { chosenOptionId: correctOptionId } },
      data: { status: 'MISSED' },
    });

    // Recuperamos a los ganadores que acertaron la pregunta
    const winners = await this.prisma.prediction.findMany({
      where: { questionId, chosenOptionId: correctOptionId },
      include: { player: true },
    });

    // Recuperamos a los jugadores que fallaron la pregunta
    const losers = await this.prisma.prediction.findMany({
      where: { questionId, NOT: { chosenOptionId: correctOptionId } },
      include: { player: true },
    });

    // Conseguimos la sesión activa de juego
    const activeSession = await this.prisma.gameSession.findFirst({
      where: { isActive: true },
    });

    if (!activeSession) return { status: 'error', message: 'No hay sesión activa' };

    // 2. ACREDITACIÓN A GANADORES
    for (const ticket of winners) {
      const basePoints = question.pointsReward || 150;
      const bonusMultiplier = 1 + (ticket.player.streakCount * 0.1);
      const finalPoints = Math.round(basePoints * bonusMultiplier);

      const updatedPlayer = await this.prisma.player.update({
        where: { id: ticket.playerId },
        data: {
          totalPoints: { increment: finalPoints },
          streakCount: { increment: 1 },
        },
      });

      await this.redisService.setPlayerScore(activeSession.id, ticket.player.id, updatedPlayer.totalPoints);
    }

    // 3. PENALIZACIÓN DE -100 PUNTOS A JUGADORES QUE FALLARON
    const penaltyPoints = 100;
    for (const ticket of losers) {
      const updatedPlayer = await this.prisma.player.update({
        where: { id: ticket.playerId },
        data: {
          totalPoints: { decrement: penaltyPoints },
          streakCount: 0, // Reseteo de racha
        },
      });

      await this.redisService.setPlayerScore(activeSession.id, ticket.player.id, updatedPlayer.totalPoints);
    }

    // 4. Extracción del nuevo Leaderboard consolidado y sincronizado
    const enrichedLeaderboard = await this.getCurrentLeaderboard(activeSession.id);

    // 5. Broadcast instantáneo a las Smart TVs y móviles
    this.liveGateway.sendLeaderboardUpdate(activeSession.id, enrichedLeaderboard);
    this.liveGateway.broadcastQuestionResolved(activeSession.id);

    return {
      status: 'success',
      message: 'Trivia resuelta y Leaderboard transmitido en tiempo real.',
      winnersCount: winners.length,
      losersCount: losers.length,
      leaderboard: enrichedLeaderboard,
    };
  }

  /**
   * Consumidor automático de eventos en tiempo real enviados por la API deportiva
   */
  async handleSportsWebhook(webhookDto: SportsApiWebhookDto) {
    // 1. Encontrar el partido mapeado en nuestro sistema
    const match = await this.prisma.match.findUnique({
      where: { apiFootballId: webhookDto.fixtureId },
    });

    if (!match || match.status !== 'LIVE') return { status: 'ignored', reason: 'Partido no activo' };

    // 2. Orquestar resolución según el tipo de evento
    switch (webhookDto.event) {
      case 'GOAL':
        // Buscar la pregunta activa de "¿Quién mete el próximo gol?" para ese partido
        const activeGoalQuestion = await this.prisma.liveQuestion.findFirst({
          where: { 
            matchId: match.id, 
            questionText: { contains: 'próximo gol' },
            correctOptionId: null 
          },
        });

        if (activeGoalQuestion) {
          // Determinamos cuál opción ID representaba al equipo anotador (1: Home, 2: Away)
          const correctOptionId = webhookDto.details.team === 'HOME' ? 1 : 2;
          
          // Invocamos nuestra capa express de Redis + Sockets
          await this.resolveQuestionExpress(activeGoalQuestion.id, correctOptionId);
        }

        // Actualizar marcador local
        await this.prisma.match.update({
          where: { id: match.id },
          data: {
            scoreHome: webhookDto.details.team === 'HOME' ? match.scoreHome + 1 : match.scoreHome,
            scoreAway: webhookDto.details.team === 'AWAY' ? match.scoreAway + 1 : match.scoreAway,
            currentMinute: webhookDto.details.minute
          }
        });
        break;

      case 'PERIOD_END':
        // Si termina el primer tiempo, podemos inyectar automáticamente una trivia de entretiempo
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Dura los 15 min de descanso

        const halftimeQuestion = await this.prisma.liveQuestion.create({
          data: {
            matchId: match.id,
            questionText: '¿Qué equipo mantendrá mayor posesión en el segundo tiempo?',
            options: [{ id: 1, text: match.homeTeam }, { id: 2, text: match.awayTeam }] as any,
            expiresAt,
            pointsReward: 200,
          }
        });

        // Buscamos todas las sesiones activas de bares que estén transmitiendo este partido
        const activeSessions = await this.prisma.gameSession.findMany({ where: { isActive: true } });
        for (const session of activeSessions) {
          this.liveGateway.broadcastNewQuestion(session.id, {
            id: halftimeQuestion.id,
            questionText: halftimeQuestion.questionText,
            options: halftimeQuestion.options,
            expiresAt: halftimeQuestion.expiresAt,
          });
        }
        break;

      case 'MATCH_END':
        // Finalizar partido y limpiar recursos volátiles
        await this.prisma.match.update({
          where: { id: match.id },
          data: { status: 'FINISHED' }
        });
        
        const sessionsToClear = await this.prisma.gameSession.findMany({ where: { isActive: true } });
        for (const session of sessionsToClear) {
          await this.redisService.clearLeaderboard(session.id);
        }
        break;
    }

    return { status: 'processed', event: webhookDto.event };
  }
}
