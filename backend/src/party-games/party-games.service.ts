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
  PartyBastaCalledEvent,
  PartyGameOverEvent,
} from './party-games.events';
import { CreatePartyRoundDto } from './dto/create-round.dto';
import { SubmitPartyInputDto } from './dto/submit-input.dto';
import { CastPartyVoteDto } from './dto/cast-vote.dto';
import { BastaDto } from './dto/basta.dto';
import { ManageCategoryDto } from './dto/manage-categories.dto';

type GamePhase = 'LOBBY' | 'COUNTDOWN' | 'INPUT' | 'VOTING' | 'REVEAL' | 'FINISHED';

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

    // Tuti Fruti nace en LOBBY (previa con categorías); el admin dispara el
    // countdown que lo lleva a INPUT. El resto de los juegos nace en INPUT.
    const isTutiFruti = dto.gameType === 'TUTI_FRUTI';

    const round = await this.prisma.partyGameRound.create({
      data: {
        sessionId: session.id,
        gameType: dto.gameType,
        phase: isTutiFruti ? 'LOBBY' : 'INPUT',
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

    // El auto-cierre de INPUT solo se programa al entrar en INPUT (ver startInput).
    if (!isTutiFruti) {
      this.scheduler.scheduleAutoClose(
        `party-input-${round.id}`,
        round.timeLimit * 1000,
        async () => {
          await this.advanceToVoting(round.id, session.id);
        },
      );
    }

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

    // Auto-avanzar si todos respondieron. En TUTI_FRUTI no aplica: el autosave
    // parcial ya crea submission, así que el corte es por BASTA o por timer.
    if (round.gameType !== 'TUTI_FRUTI' && submittedCount >= totalPlayers && totalPlayers > 0) {
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

    // No permitir BASTA sin ninguna respuesta (evita cortes vacíos)
    const tieneRespuestas = Object.values(dto.answers ?? {}).some((a) => String(a).trim() !== '');
    if (!tieneRespuestas) {
      throw new BadRequestException('Completá al menos una categoría antes de gritar BASTA.');
    }

    // Transacción: el check de "ya hay BASTA" + el upsert son atómicos para
    // que dos BASTA simultáneos no se marquen ambos como primero.
    const isBasta = await this.prisma.$transaction(async (tx) => {
      const existingBasta = await tx.partyGameSubmission.findFirst({
        where: { roundId: round.id, isBasta: true },
      });
      const esPrimero = !existingBasta;

      // No pisar respuestas buenas con vacías: mergear con el autosave previo.
      // Si el BASTA llega con una categoría vacía pero el autosave ya la tenía,
      // se conserva la del autosave.
      const previa = await tx.partyGameSubmission.findUnique({
        where: { roundId_playerId: { roundId: round.id, playerId } },
      });
      const prevAnswers = (previa?.content as any)?.answers ?? {};
      const mergedAnswers: Record<string, string> = { ...prevAnswers };
      for (const [cat, val] of Object.entries(dto.answers ?? {})) {
        if (String(val).trim() !== '') mergedAnswers[cat] = val;
      }

      await tx.partyGameSubmission.upsert({
        where: { roundId_playerId: { roundId: round.id, playerId } },
        update: { content: { answers: mergedAnswers }, isBasta: esPrimero || undefined },
        create: {
          roundId: round.id,
          playerId,
          content: { answers: mergedAnswers },
          isBasta: esPrimero,
        },
      });

      return esPrimero;
    });

    if (isBasta) {
      this.scheduler.cancelTimer(`party-input-${round.id}`);
      this.logger.log(`[PartyGames] ¡BASTA! en ronda ${round.id} por jugador ${playerId}`);

      // Broadcast global del BASTA (congela los inputs de todos al instante)
      const player = await this.prisma.player.findUnique({
        where: { id: playerId },
        select: { nickname: true },
      });
      const eventNumber = await this.sessionCache.incrementEventNumber(round.sessionId);
      this.eventEmitter.emit(
        'party.basta.called',
        new PartyBastaCalledEvent(round.sessionId, round.id, playerId, player?.nickname ?? 'Jugador', eventNumber),
      );

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

  // Dispara la cuenta regresiva (3-2-1) desde LOBBY; al terminar entra a INPUT solo.
  async startCountdown(roundId: string) {
    const round = await this.getActiveRound(roundId);
    if (round.phase !== 'LOBBY') {
      throw new BadRequestException('La ronda no está en Lobby.');
    }

    const countdownSeconds = 3;
    const countdownEndsAt = new Date(Date.now() + countdownSeconds * 1000);

    await this.prisma.partyGameRound.update({
      where: { id: roundId },
      data: { phase: 'COUNTDOWN' },
    });

    const eventNumber = await this.sessionCache.incrementEventNumber(round.sessionId);
    this.eventEmitter.emit(
      'party.phase.changed',
      new PartyPhaseChangedEvent(
        round.sessionId,
        roundId,
        'COUNTDOWN',
        { countdownSeconds, countdownEndsAt: countdownEndsAt.toISOString() },
        eventNumber,
      ),
    );

    this.scheduler.scheduleAutoClose(
      `party-countdown-${roundId}`,
      countdownSeconds * 1000,
      async () => {
        await this.startInput(roundId, round.sessionId);
      },
    );

    this.logger.log(`[PartyGames] Ronda ${roundId} → COUNTDOWN (${countdownSeconds}s)`);
    return { status: 'ok' };
  }

  // Entrada real a la fase INPUT: arranca el timer de la ronda.
  private async startInput(roundId: string, sessionId: string) {
    const round = await this.prisma.partyGameRound.findUnique({ where: { id: roundId } });
    if (!round || round.phase !== 'COUNTDOWN') return;

    const inputStartedAt = new Date();

    await this.prisma.partyGameRound.update({
      where: { id: roundId },
      data: { phase: 'INPUT' },
    });

    const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
    this.eventEmitter.emit(
      'party.phase.changed',
      new PartyPhaseChangedEvent(sessionId, roundId, 'INPUT', { inputStartedAt: inputStartedAt.toISOString() }, eventNumber),
    );

    // Programar auto-cierre de INPUT por tiempo (arranca ahora, no en createRound)
    this.scheduler.scheduleAutoClose(
      `party-input-${roundId}`,
      round.timeLimit * 1000,
      async () => {
        await this.advanceToVoting(roundId, sessionId);
      },
    );

    this.logger.log(`[PartyGames] Ronda ${roundId} → INPUT (timer ${round.timeLimit}s)`);
  }

  async advancePhase(roundId: string) {
    const round = await this.getActiveRound(roundId);

    if (round.phase === 'LOBBY') {
      await this.startCountdown(round.id);
    } else if (round.phase === 'COUNTDOWN') {
      // El backend avanza a INPUT solo; no se fuerza manualmente.
      throw new BadRequestException('La cuenta regresiva ya está en curso.');
    } else if (round.phase === 'INPUT') {
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

  // Finaliza el juego completo de la sesión (podio definitivo Top 10).
  // Cierra cualquier ronda activa y emite el ranking final consolidado.
  async endGame(sessionId: string) {
    const session = await this.prisma.gameSession.findFirst({
      where: { OR: [{ id: sessionId }, { bar: { slug: sessionId } }], isActive: true },
    });
    if (!session) {
      throw new NotFoundException(`No se encontró sesión activa con id "${sessionId}".`);
    }

    // Cerrar la ronda activa si quedó alguna abierta
    const activeRound = await this.prisma.partyGameRound.findFirst({
      where: { sessionId: session.id, phase: { not: 'FINISHED' } },
    });
    if (activeRound) {
      await this.finishRound(activeRound.id, session.id);
    }

    const finalLeaderboard = await this.getLeaderboard(session.id);
    const eventNumber = await this.sessionCache.incrementEventNumber(session.id);

    this.eventEmitter.emit(
      'party.game.over',
      new PartyGameOverEvent(session.id, 'PARTY_GAMES', finalLeaderboard, eventNumber),
    );

    this.logger.log(`[PartyGames] Juego finalizado en sesión ${session.id} — ganador: ${finalLeaderboard[0]?.nickname ?? 'N/A'}`);
    return { status: 'ok', leaderboard: finalLeaderboard };
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
    this.scheduler.cancelTimer(`party-countdown-${roundId}`);

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
      // Todas las submissions (autosave parcial + BASTA) para la tabla comparativa
      // en la TV. El que hizo BASTA va primero y queda marcado.
      return [...round.submissions]
        .sort((a: any, b: any) => Number(b.isBasta) - Number(a.isBasta))
        .map((s: any) => ({
          id: s.id,
          answers: s.content?.answers ?? {},
          nickname: s.player?.nickname,
          isBasta: s.isBasta,
        }));
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
