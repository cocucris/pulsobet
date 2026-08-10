import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisSessionCacheService } from '../session/redis-session-cache.service';
import { SessionScheduler } from '../session/session.scheduler';
import {
  PartyRoundStartedEvent,
  PartyPhaseChangedEvent,
  PartyInputSubmittedEvent,
  PartyVoteCastEvent,
  PartyRoundResultEvent,
  PartyRoundFinishedEvent,
} from './party-games.events';
import { CreatePartyRoundDto } from './dto/create-round.dto';
import { SubmitPartyInputDto } from './dto/submit-input.dto';
import { CastPartyVoteDto } from './dto/cast-vote.dto';
import { BastaDto } from './dto/basta.dto';
import { ManageCategoryDto } from './dto/manage-categories.dto';

type GamePhase = 'INPUT' | 'VOTING' | 'REVEAL' | 'FINISHED';

// Categorías predefinidas del sistema
const DEFAULT_CATEGORIES = [
  'Nombre',
  'Ciudad/País',
  'Fruta/Verdura',
  'Animal',
  'Marca',
  'Película/Serie',
];

@Injectable()
export class PartyGamesService {
  private readonly logger = new Logger(PartyGamesService.name);

  constructor(
    private prisma: PrismaService,
    private sessionCache: RedisSessionCacheService,
    private eventEmitter: EventEmitter2,
    private scheduler: SessionScheduler,
  ) {}

  // ─── GESTIÓN DE CATEGORÍAS TUTI FRUTI ────────────────────────────────────

  // Resuelve el identificador recibido (id de Bar o slug) al id real del Bar.
  // La FK de TutiFrutiCategory exige el id, no el slug.
  private async resolveBarId(barIdOrSlug: string): Promise<string> {
    const bar = await this.prisma.bar.findFirst({
      where: { OR: [{ id: barIdOrSlug }, { slug: barIdOrSlug }] },
      select: { id: true },
    });
    if (!bar) {
      throw new NotFoundException(`No se encontró el bar "${barIdOrSlug}".`);
    }
    return bar.id;
  }

  async getCategories(barId: string) {
    const realBarId = await this.resolveBarId(barId);
    // Asegurar que el bar tenga las categorías por defecto
    await this.ensureDefaultCategories(realBarId);

    return this.prisma.tutiFrutiCategory.findMany({
      where: { barId: realBarId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async addCategory(barId: string, dto: ManageCategoryDto) {
    const realBarId = await this.resolveBarId(barId);
    return this.prisma.tutiFrutiCategory.upsert({
      where: { barId_name: { barId: realBarId, name: dto.name } },
      update: {},
      create: {
        barId: realBarId,
        name: dto.name,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async deleteCategory(barId: string, categoryId: string) {
    const realBarId = await this.resolveBarId(barId);
    const cat = await this.prisma.tutiFrutiCategory.findUnique({
      where: { id: categoryId },
    });
    if (!cat || cat.barId !== realBarId) {
      throw new NotFoundException('Categoría no encontrada para este bar.');
    }
    return this.prisma.tutiFrutiCategory.delete({ where: { id: categoryId } });
  }

  private async ensureDefaultCategories(barId: string) {
    try {
      const existing = await this.prisma.tutiFrutiCategory.count({ where: { barId, isDefault: true } });
      if (existing < DEFAULT_CATEGORIES.length) {
        for (const name of DEFAULT_CATEGORIES) {
          await this.prisma.tutiFrutiCategory.upsert({
            where: { barId_name: { barId, name } },
            update: {},
            create: { barId, name, isDefault: true },
          });
        }
      }
    } catch (err) {
      this.logger.warn(`No se pudieron sembrar categorías por defecto para bar ${barId}: ${err.message}`);
    }
  }

  // ─── CICLO DE VIDA DE UNA RONDA ──────────────────────────────────────────

  async createRound(dto: CreatePartyRoundDto) {
    const session = await this.prisma.gameSession.findFirst({
      where: { OR: [{ id: dto.sessionId }, { bar: { slug: dto.sessionId } }], isActive: true },
    });
    if (!session) {
      throw new NotFoundException(`No se encontró sesión activa con id "${dto.sessionId}".`);
    }

    // Validar que no haya ya una ronda activa en la sesión
    const activeRound = await this.prisma.partyGameRound.findFirst({
      where: { sessionId: session.id, phase: { not: 'FINISHED' } },
    });
    if (activeRound) {
      throw new BadRequestException('Ya hay una ronda de Party Game activa en esta sesión. Finalizá la ronda actual primero.');
    }

    // Validar categorías de Tuti Fruti (máx 4)
    if (dto.gameType === 'TUTI_FRUTI') {
      if (!dto.categories || dto.categories.length === 0) {
        throw new BadRequestException('Tuti Fruti requiere al menos 1 categoría.');
      }
      if (dto.categories.length > 4) {
        throw new BadRequestException('Tuti Fruti acepta un máximo de 4 categorías.');
      }
    }

    const eventNumber = await this.sessionCache.incrementEventNumber(session.id);

    const round = await this.prisma.partyGameRound.create({
      data: {
        sessionId: session.id,
        gameType: dto.gameType,
        phase: 'INPUT',
        prompt: dto.prompt,
        categories: dto.categories ? dto.categories : undefined,
        timeLimit: dto.timeLimit ?? 60,
      },
    });

    const roundPayload = this.serializeRound(round);

    this.eventEmitter.emit(
      'party.round.started',
      new PartyRoundStartedEvent(session.id, roundPayload, eventNumber),
    );

    // Programar auto-cierre de la fase INPUT por tiempo
    this.scheduler.scheduleAutoClose(
      `party-input-${round.id}`,
      round.timeLimit * 1000,
      async () => {
        await this.advanceToVoting(round.id, session.id);
      },
    );

    this.logger.log(`[PartyGames] Ronda ${round.id} (${dto.gameType}) iniciada en sesión ${session.id}`);
    return roundPayload;
  }

  async submitInput(playerId: string, sessionId: string, dto: SubmitPartyInputDto) {
    const round = await this.getActiveRound(dto.roundId);

    if (round.phase !== 'INPUT') {
      throw new BadRequestException('La fase de Input ya terminó.');
    }

    // Upsert: si ya envió, actualizar
    await this.prisma.partyGameSubmission.upsert({
      where: { roundId_playerId: { roundId: round.id, playerId } },
      update: { content: dto.content },
      create: {
        roundId: round.id,
        playerId,
        content: dto.content,
      },
    });

    const submittedCount = await this.prisma.partyGameSubmission.count({
      where: { roundId: round.id },
    });
    const totalPlayers = await this.prisma.player.count({
      where: { sessionId: round.sessionId },
    });

    const eventNumber = await this.sessionCache.incrementEventNumber(round.sessionId);

    this.eventEmitter.emit(
      'party.input.submitted',
      new PartyInputSubmittedEvent(round.sessionId, round.id, submittedCount, totalPlayers, eventNumber),
    );

    // Auto-avanzar si todos respondieron
    if (submittedCount >= totalPlayers && totalPlayers > 0) {
      this.scheduler.cancelTimer(`party-input-${round.id}`);
      await this.advanceToVoting(round.id, round.sessionId);
    }

    return { accepted: true, submittedCount, totalPlayers };
  }

  async submitBasta(playerId: string, sessionId: string, dto: BastaDto) {
    const round = await this.getActiveRound(dto.roundId);

    if (round.phase !== 'INPUT') {
      throw new BadRequestException('La fase de Input ya terminó.');
    }
    if (round.gameType !== 'TUTI_FRUTI') {
      throw new BadRequestException('BASTA solo es válido en el juego Tuti Fruti.');
    }

    // Solo el primer BASTA congela el timer
    const existingBasta = await this.prisma.partyGameSubmission.findFirst({
      where: { roundId: round.id, isBasta: true },
    });

    // Guardar la submission con isBasta = true solo si es el primero
    const isBasta = !existingBasta;

    await this.prisma.partyGameSubmission.upsert({
      where: { roundId_playerId: { roundId: round.id, playerId } },
      update: { content: { answers: dto.answers }, isBasta: isBasta || undefined },
      create: {
        roundId: round.id,
        playerId,
        content: { answers: dto.answers },
        isBasta,
      },
    });

    if (isBasta) {
      this.scheduler.cancelTimer(`party-input-${round.id}`);
      this.logger.log(`[PartyGames] ¡BASTA! en ronda ${round.id} por jugador ${playerId}`);
      await this.advanceToVoting(round.id, round.sessionId);
    }

    return { accepted: true, isBasta };
  }

  async castVote(voterId: string, dto: CastPartyVoteDto) {
    const round = await this.getActiveRound(dto.roundId);

    if (round.phase !== 'VOTING') {
      throw new BadRequestException('La fase de Votación no está activa.');
    }

    await this.prisma.partyGameVote.upsert({
      where: { roundId_voterId: { roundId: round.id, voterId } },
      update: { targetId: dto.targetId },
      create: {
        roundId: round.id,
        voterId,
        targetId: dto.targetId,
      },
    });

    const votesSummary = await this.buildVotesSummary(round.id, round.gameType);
    const eventNumber = await this.sessionCache.incrementEventNumber(round.sessionId);

    this.eventEmitter.emit(
      'party.vote.cast',
      new PartyVoteCastEvent(round.sessionId, round.id, votesSummary, eventNumber),
    );

    return { accepted: true };
  }

  async advancePhase(roundId: string) {
    const round = await this.getActiveRound(roundId);

    if (round.phase === 'INPUT') {
      await this.advanceToVoting(round.id, round.sessionId);
    } else if (round.phase === 'VOTING') {
      await this.advanceToReveal(round.id, round.sessionId);
    } else if (round.phase === 'REVEAL') {
      await this.finishRound(round.id, round.sessionId);
    } else {
      throw new BadRequestException('La ronda ya está finalizada.');
    }
  }

  async endRound(roundId: string) {
    const round = await this.getActiveRound(roundId);
    if (round.phase !== 'FINISHED') {
      await this.finishRound(round.id, round.sessionId);
    }
  }

  // ─── HELPERS INTERNOS DE FASES ──────────────────────────────────────────

  private async advanceToVoting(roundId: string, sessionId: string) {
    const round = await this.prisma.partyGameRound.findUnique({
      where: { id: roundId },
      include: { submissions: { include: { player: true } } },
    });
    if (!round || round.phase === 'VOTING' || round.phase === 'REVEAL' || round.phase === 'FINISHED') {
      return;
    }

    await this.prisma.partyGameRound.update({
      where: { id: roundId },
      data: { phase: 'VOTING' },
    });

    const options = this.buildVotingOptions(round);
    const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);

    this.eventEmitter.emit(
      'party.phase.changed',
      new PartyPhaseChangedEvent(sessionId, roundId, 'VOTING', { options }, eventNumber),
    );

    this.logger.log(`[PartyGames] Ronda ${roundId} → VOTING`);
  }

  private async advanceToReveal(roundId: string, sessionId: string) {
    const round = await this.prisma.partyGameRound.findUnique({
      where: { id: roundId },
      include: {
        submissions: { include: { player: true } },
        votes: true,
      },
    });
    if (!round) return;

    await this.prisma.partyGameRound.update({
      where: { id: roundId },
      data: { phase: 'REVEAL' },
    });

    // Calcular y asignar puntos
    const results = await this.calculateAndAwardPoints(round);
    const leaderboard = await this.getLeaderboard(sessionId);
    const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);

    this.eventEmitter.emit(
      'party.round.result',
      new PartyRoundResultEvent(sessionId, roundId, results, leaderboard, eventNumber),
    );

    this.eventEmitter.emit(
      'party.phase.changed',
      new PartyPhaseChangedEvent(sessionId, roundId, 'REVEAL', { results, leaderboard }, eventNumber),
    );

    this.logger.log(`[PartyGames] Ronda ${roundId} → REVEAL`);
  }

  private async finishRound(roundId: string, sessionId: string) {
    await this.prisma.partyGameRound.update({
      where: { id: roundId },
      data: { phase: 'FINISHED', finishedAt: new Date() },
    });

    this.scheduler.cancelTimer(`party-input-${roundId}`);
    this.scheduler.cancelTimer(`party-voting-${roundId}`);

    const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);

    this.eventEmitter.emit(
      'party.round.finished',
      new PartyRoundFinishedEvent(sessionId, roundId, eventNumber),
    );

    this.eventEmitter.emit(
      'party.phase.changed',
      new PartyPhaseChangedEvent(sessionId, roundId, 'FINISHED', {}, eventNumber),
    );

    this.logger.log(`[PartyGames] Ronda ${roundId} → FINISHED`);
  }

  // ─── LÓGICA DE SCORING ───────────────────────────────────────────────────

  private async calculateAndAwardPoints(round: any) {
    const { submissions, votes, gameType } = round;
    const pointsMap: Map<string, { points: number; source: string }[]> = new Map();

    if (gameType === 'BLUFFING') {
      // Encontrar la submission real (la creada por el admin como "respuesta verdadera")
      // Convención: la primera submission con content.isReal = true, o la que tenga playerId = '__real__'
      const realSubmission = submissions.find((s: any) => s.content?.isReal === true);

      if (realSubmission) {
        // Puntos por adivinar la respuesta real
        const correctVoters = votes.filter((v: any) => v.targetId === realSubmission.id);
        for (const vote of correctVoters) {
          this.addPoints(pointsMap, vote.voterId, 200, 'BLUFFING_GUESS');
        }

        // Puntos por engañar: cada submission falsa recibe 100 pts por cada voto que recibió
        for (const sub of submissions) {
          if (sub.id === realSubmission.id) continue;
          const trickedVotes = votes.filter((v: any) => v.targetId === sub.id);
          if (trickedVotes.length > 0) {
            this.addPoints(pointsMap, sub.playerId, trickedVotes.length * 100, 'BLUFFING_TRICK');
          }
        }
      }
    } else if (gameType === 'TUTI_FRUTI') {
      const categories: string[] = round.categories ?? [];

      // Basta bonus: el primer jugador que presionó BASTA
      const bastaSubmission = submissions.find((s: any) => s.isBasta);
      if (bastaSubmission) {
        this.addPoints(pointsMap, bastaSubmission.playerId, 300, 'TUTI_BASTA');
      }

      // Por cada categoría, detectar respuestas únicas vs compartidas
      for (const category of categories) {
        const answersByPlayer: { playerId: string; answer: string }[] = submissions
          .filter((s: any) => s.content?.answers?.[category])
          .map((s: any) => ({
            playerId: s.playerId,
            answer: (s.content.answers[category] as string).trim().toLowerCase(),
          }));

        const answerCounts = new Map<string, number>();
        for (const { answer } of answersByPlayer) {
          answerCounts.set(answer, (answerCounts.get(answer) ?? 0) + 1);
        }

        for (const { playerId, answer } of answersByPlayer) {
          const count = answerCounts.get(answer) ?? 0;
          if (count === 1) {
            this.addPoints(pointsMap, playerId, 150, 'TUTI_UNIQUE');
          } else {
            this.addPoints(pointsMap, playerId, 75, 'TUTI_SHARED');
          }
        }
      }
    } else if (gameType === 'SOCIAL_JUDGMENT') {
      // El jugador más votado recibe 250 pts
      const voteCounts = new Map<string, number>();
      for (const vote of votes) {
        voteCounts.set(vote.targetId, (voteCounts.get(vote.targetId) ?? 0) + 1);
      }

      let maxVotes = 0;
      let topPlayer = '';
      for (const [playerId, count] of voteCounts) {
        if (count > maxVotes) {
          maxVotes = count;
          topPlayer = playerId;
        }
      }

      if (topPlayer) {
        this.addPoints(pointsMap, topPlayer, 250, 'SOCIAL_TOP');
      }
    }

    // Persistir puntos y actualizar Player.totalPoints
    const pointsArray: { playerId: string; points: number; source: string }[] = [];
    for (const [playerId, pointsList] of pointsMap) {
      const totalEarned = pointsList.reduce((sum, p) => sum + p.points, 0);
      const sources = pointsList.map((p) => p.source).join(',');

      if (totalEarned > 0) {
        await this.prisma.partyGameSubmission.updateMany({
          where: { roundId: round.id, playerId },
          data: { pointsEarned: totalEarned, pointsSource: sources },
        });

        // Incrementar totalPoints unificado del Player (igual que las Trivias)
        await this.prisma.player.update({
          where: { id: playerId },
          data: { totalPoints: { increment: totalEarned } },
        });

        pointsArray.push({ playerId, points: totalEarned, source: sources });
      }
    }

    return {
      gameType: round.gameType,
      pointsAwarded: pointsArray,
      submissions: submissions.map((s: any) => ({
        id: s.id,
        playerId: s.playerId,
        nickname: s.player?.nickname,
        content: s.content,
        isBasta: s.isBasta,
        pointsEarned: pointsMap.get(s.playerId)?.reduce((sum, p) => sum + p.points, 0) ?? 0,
      })),
      votes: votes.map((v: any) => ({ voterId: v.voterId, targetId: v.targetId })),
    };
  }

  private addPoints(
    map: Map<string, { points: number; source: string }[]>,
    playerId: string,
    points: number,
    source: string,
  ) {
    if (!map.has(playerId)) map.set(playerId, []);
    map.get(playerId)!.push({ points, source });
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────

  private buildVotingOptions(round: any) {
    if (round.gameType === 'BLUFFING') {
      // Mezclar submissions (respuestas de jugadores + real) aleatoriamente
      const shuffled = [...round.submissions].sort(() => Math.random() - 0.5);
      return shuffled.map((s: any) => ({
        id: s.id,
        text: s.content?.text ?? '',
        // No revelar aquí si es real
      }));
    }

    if (round.gameType === 'TUTI_FRUTI') {
      // Para Tuti Fruti, la "votación" es la visualización de respuestas del primer BASTA
      const bastaSubmission = round.submissions.find((s: any) => s.isBasta);
      return bastaSubmission
        ? [{ id: bastaSubmission.id, answers: bastaSubmission.content?.answers, nickname: bastaSubmission.player?.nickname }]
        : [];
    }

    if (round.gameType === 'SOCIAL_JUDGMENT') {
      // Para Juicio Social: lista de jugadores de la sesión para votar
      return round.submissions.map((s: any) => ({
        id: s.playerId,
        nickname: s.player?.nickname,
      }));
    }

    return [];
  }

  private async buildVotesSummary(roundId: string, gameType: string) {
    const votes = await this.prisma.partyGameVote.findMany({ where: { roundId } });
    const counts = new Map<string, number>();
    for (const vote of votes) {
      counts.set(vote.targetId, (counts.get(vote.targetId) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([targetId, count]) => ({ targetId, count }));
  }

  private async getActiveRound(roundId: string) {
    const round = await this.prisma.partyGameRound.findUnique({
      where: { id: roundId },
    });
    if (!round) {
      throw new NotFoundException(`Ronda de Party Game "${roundId}" no encontrada.`);
    }
    return round;
  }

  private serializeRound(round: any) {
    return {
      id: round.id,
      sessionId: round.sessionId,
      gameType: round.gameType,
      phase: round.phase,
      prompt: round.prompt,
      categories: round.categories,
      timeLimit: round.timeLimit,
      createdAt: round.createdAt?.toISOString?.() ?? round.createdAt,
      submittedCount: 0,
      totalPlayers: 0,
    };
  }

  async getActiveRoundForSession(sessionId: string) {
    const round = await this.prisma.partyGameRound.findFirst({
      where: { sessionId, phase: { not: 'FINISHED' } },
      include: { submissions: { include: { player: { select: { id: true, nickname: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!round) return null;

    const submittedCount = round.submissions.length;
    const totalPlayers = await this.prisma.player.count({ where: { sessionId } });
    const myVotesByPlayer = await this.prisma.partyGameVote.findMany({ where: { roundId: round.id } });

    return {
      ...this.serializeRound(round),
      submittedCount,
      totalPlayers,
      options: round.phase === 'VOTING' ? this.buildVotingOptions(round) : [],
    };
  }

  private async getLeaderboard(sessionId: string) {
    const players = await this.prisma.player.findMany({
      where: { sessionId },
      orderBy: { totalPoints: 'desc' },
      take: 10,
    });
    return players.map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      nickname: p.nickname,
      totalPoints: p.totalPoints,
      streakCount: p.streakCount,
    }));
  }
}
