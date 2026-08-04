import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisSessionCacheService } from '../session/redis-session-cache.service';
import {
  CardSubmittedEvent,
  CardPublishedEvent,
  CardVoteUpdatedEvent,
  CardClosedEvent,
  SessionModeChangedEvent,
} from '../session/session.events';
import { CreateCardDto } from './dto/create-card.dto';

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private sessionCache: RedisSessionCacheService,
  ) {}

  // Serializa la ficha con sus conteos de votos para cache/eventos/snapshot
  private async enrichCard(card: any) {
    const grouped = await this.prisma.cardVote.groupBy({
      by: ['choice'],
      where: { cardId: card.id },
      _count: { id: true },
    });

    const counts = { interested: 0, introduce: 0, pass: 0 };
    for (const g of grouped) {
      if (g.choice === 'INTERESTED') counts.interested = g._count.id;
      if (g.choice === 'INTRODUCE') counts.introduce = g._count.id;
      if (g.choice === 'PASS') counts.pass = g._count.id;
    }

    return {
      id: card.id,
      sessionId: card.sessionId,
      tableNumber: card.tableNumber,
      name: card.name,
      age: card.age,
      position: card.position,
      strongFoot: card.strongFoot,
      fitness: card.fitness,
      skills: card.skills,
      objective: card.objective,
      photoUrl: card.photoUrl,
      status: card.status,
      createdAt: card.createdAt,
      counts,
      totalVotes: counts.interested + counts.introduce + counts.pass,
    };
  }

  private async resolveActiveSession(sessionId: string) {
    let session = await this.prisma.gameSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      session = await this.prisma.gameSession.findFirst({ where: { isActive: true } });
    }
    if (!session) throw new BadRequestException('No existe sesión activa');
    return session;
  }

  // ─── CARGA DE FICHA (jugador) ────────────────────────────────────────

  async createCard(dto: CreateCardDto) {
    const session = await this.resolveActiveSession(dto.sessionId);

    const card = await this.prisma.profileCard.create({
      data: {
        sessionId: session.id,
        playerId: dto.playerId || null,
        tableNumber: dto.tableNumber || null,
        name: dto.name.trim(),
        age: dto.age ?? null,
        position: dto.position || null,
        strongFoot: dto.strongFoot || null,
        fitness: dto.fitness ?? null,
        skills: (dto.skills || []).slice(0, 6) as any,
        objective: dto.objective || null,
        photoUrl: dto.photoUrl || null,
      },
    });

    const pendingCount = await this.prisma.profileCard.count({
      where: { sessionId: session.id, status: 'PENDING' },
    });

    const eventNumber = await this.sessionCache.incrementEventNumber(session.id);
    this.eventEmitter.emit(
      'card.submitted',
      new CardSubmittedEvent(session.id, await this.enrichCard(card), pendingCount, eventNumber),
    );

    return { status: 'success', cardId: card.id };
  }

  async getPendingCards(sessionId: string) {
    const session = await this.resolveActiveSession(sessionId);
    const cards = await this.prisma.profileCard.findMany({
      where: { sessionId: session.id, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(cards.map((c) => this.enrichCard(c)));
  }

  // ─── MODERACIÓN (admin) ──────────────────────────────────────────────

  async approveCard(cardId: string) {
    const card = await this.prisma.profileCard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Ficha no encontrada');
    if (card.status !== 'PENDING') throw new BadRequestException('La ficha ya fue procesada');

    const approved = await this.prisma.profileCard.update({
      where: { id: cardId },
      data: { status: 'APPROVED' },
    });

    const enriched = await this.enrichCard(approved);
    // Agregar a la lista de fichas activas (múltiples fichas simultáneas)
    await this.sessionCache.addActiveCard(card.sessionId, enriched);

    const eventNumber = await this.sessionCache.incrementEventNumber(card.sessionId);
    this.eventEmitter.emit('card.published', new CardPublishedEvent(card.sessionId, enriched, eventNumber));

    return { status: 'success' };
  }

  async rejectCard(cardId: string) {
    const card = await this.prisma.profileCard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Ficha no encontrada');

    await this.prisma.profileCard.update({
      where: { id: cardId },
      data: { status: 'REJECTED' },
    });

    // Si estaba entre las activas, se quita de las pantallas
    const activeCards = await this.sessionCache.getActiveCards(card.sessionId);
    const wasActive = activeCards.some((c) => c.id === cardId);
    if (wasActive) {
      await this.sessionCache.removeActiveCard(card.sessionId, cardId);
      const eventNumber = await this.sessionCache.incrementEventNumber(card.sessionId);
      this.eventEmitter.emit('card.closed', new CardClosedEvent(card.sessionId, cardId, null, eventNumber));
    }

    return { status: 'success' };
  }

  async closeCard(cardId: string) {
    const card = await this.prisma.profileCard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Ficha no encontrada');

    const enriched = await this.enrichCard(card);
    await this.addCardToHistory(enriched);

    // Quitar de las fichas activas
    await this.sessionCache.removeActiveCard(card.sessionId, cardId);

    const eventNumber = await this.sessionCache.incrementEventNumber(card.sessionId);
    this.eventEmitter.emit('card.closed', new CardClosedEvent(card.sessionId, cardId, enriched, eventNumber));

    return { status: 'success' };
  }

  private async addCardToHistory(card: any) {
    const enriched = card.counts ? card : await this.enrichCard(card);
    await this.sessionCache.addCardToHistory(card.sessionId, enriched);
  }

  // ─── VOTACIÓN (jugadores) ────────────────────────────────────────────

  async voteCard(cardId: string, playerId: string, choice: 'INTERESTED' | 'INTRODUCE' | 'PASS') {
    const card = await this.prisma.profileCard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Ficha no encontrada');
    if (card.status !== 'APPROVED') {
      throw new BadRequestException('Esta ficha no está abierta a votación');
    }

    // La votación vale sobre cualquier ficha activa (múltiples fichas simultáneas)
    const activeCards = await this.sessionCache.getActiveCards(card.sessionId);
    const isActive = activeCards.some((c) => c.id === cardId);
    if (!isActive) {
      throw new BadRequestException('La votación de esta ficha ya fue cerrada');
    }

    await this.prisma.cardVote.upsert({
      where: { cardId_playerId: { cardId, playerId } },
      create: { cardId, playerId, choice },
      update: { choice },
    });

    const enriched = await this.enrichCard(card);
    // Actualizar la ficha en la lista de activas
    await this.sessionCache.addActiveCard(card.sessionId, enriched);

    const eventNumber = await this.sessionCache.incrementEventNumber(card.sessionId);
    this.eventEmitter.emit(
      'card.vote.updated',
      new CardVoteUpdatedEvent(card.sessionId, cardId, enriched.counts, enriched.totalVotes, eventNumber),
    );

    return { status: 'success', counts: enriched.counts, totalVotes: enriched.totalVotes };
  }

  // ─── MODO DE LA SESIÓN (admin) ───────────────────────────────────────

  async setMode(sessionId: string, mode: 'MATCH' | 'CARDS') {
    const session = await this.resolveActiveSession(sessionId);

    await this.prisma.gameSession.update({
      where: { id: session.id },
      data: { mode },
    });

    await this.sessionCache.setMode(session.id, mode);

    const eventNumber = await this.sessionCache.incrementEventNumber(session.id);
    this.eventEmitter.emit('session.mode.changed', new SessionModeChangedEvent(session.id, mode, eventNumber));

    return { status: 'success', mode };
  }
}
