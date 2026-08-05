"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CardsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardsService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_session_cache_service_1 = require("../session/redis-session-cache.service");
const session_events_1 = require("../session/session.events");
let CardsService = CardsService_1 = class CardsService {
    prisma;
    eventEmitter;
    sessionCache;
    logger = new common_1.Logger(CardsService_1.name);
    constructor(prisma, eventEmitter, sessionCache) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.sessionCache = sessionCache;
    }
    async enrichCard(card) {
        const grouped = await this.prisma.cardVote.groupBy({
            by: ['choice'],
            where: { cardId: card.id },
            _count: { id: true },
        });
        const counts = { interested: 0, introduce: 0, pass: 0 };
        for (const g of grouped) {
            if (g.choice === 'INTERESTED')
                counts.interested = g._count.id;
            if (g.choice === 'INTRODUCE')
                counts.introduce = g._count.id;
            if (g.choice === 'PASS')
                counts.pass = g._count.id;
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
    async resolveActiveSession(sessionId) {
        let session = await this.prisma.gameSession.findUnique({ where: { id: sessionId } });
        if (!session) {
            session = await this.prisma.gameSession.findFirst({ where: { isActive: true } });
        }
        if (!session)
            throw new common_1.BadRequestException('No existe sesión activa');
        return session;
    }
    async createCard(dto) {
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
                skills: (dto.skills || []).slice(0, 6),
                objective: dto.objective || null,
                photoUrl: dto.photoUrl || null,
            },
        });
        const pendingCount = await this.prisma.profileCard.count({
            where: { sessionId: session.id, status: 'PENDING' },
        });
        const eventNumber = await this.sessionCache.incrementEventNumber(session.id);
        this.eventEmitter.emit('card.submitted', new session_events_1.CardSubmittedEvent(session.id, await this.enrichCard(card), pendingCount, eventNumber));
        return { status: 'success', cardId: card.id };
    }
    async getPendingCards(sessionId) {
        const session = await this.resolveActiveSession(sessionId);
        const cards = await this.prisma.profileCard.findMany({
            where: { sessionId: session.id, status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
        });
        return Promise.all(cards.map((c) => this.enrichCard(c)));
    }
    async approveCard(cardId) {
        const card = await this.prisma.profileCard.findUnique({ where: { id: cardId } });
        if (!card)
            throw new common_1.NotFoundException('Ficha no encontrada');
        if (card.status !== 'PENDING')
            throw new common_1.BadRequestException('La ficha ya fue procesada');
        const approved = await this.prisma.profileCard.update({
            where: { id: cardId },
            data: { status: 'APPROVED' },
        });
        const enriched = await this.enrichCard(approved);
        await this.sessionCache.addActiveCard(card.sessionId, enriched);
        const eventNumber = await this.sessionCache.incrementEventNumber(card.sessionId);
        this.eventEmitter.emit('card.published', new session_events_1.CardPublishedEvent(card.sessionId, enriched, eventNumber));
        return { status: 'success' };
    }
    async rejectCard(cardId) {
        const card = await this.prisma.profileCard.findUnique({ where: { id: cardId } });
        if (!card)
            throw new common_1.NotFoundException('Ficha no encontrada');
        await this.prisma.profileCard.update({
            where: { id: cardId },
            data: { status: 'REJECTED' },
        });
        const activeCards = await this.sessionCache.getActiveCards(card.sessionId);
        const wasActive = activeCards.some((c) => c.id === cardId);
        if (wasActive) {
            await this.sessionCache.removeActiveCard(card.sessionId, cardId);
            const eventNumber = await this.sessionCache.incrementEventNumber(card.sessionId);
            this.eventEmitter.emit('card.closed', new session_events_1.CardClosedEvent(card.sessionId, cardId, null, eventNumber));
        }
        return { status: 'success' };
    }
    async closeCard(cardId) {
        const card = await this.prisma.profileCard.findUnique({ where: { id: cardId } });
        if (!card)
            throw new common_1.NotFoundException('Ficha no encontrada');
        const enriched = await this.enrichCard(card);
        await this.addCardToHistory(enriched);
        await this.sessionCache.removeActiveCard(card.sessionId, cardId);
        const eventNumber = await this.sessionCache.incrementEventNumber(card.sessionId);
        this.eventEmitter.emit('card.closed', new session_events_1.CardClosedEvent(card.sessionId, cardId, enriched, eventNumber));
        return { status: 'success' };
    }
    async closeAllCards(sessionId) {
        const session = await this.resolveActiveSession(sessionId);
        const activeCards = await this.sessionCache.getActiveCards(session.id);
        if (activeCards.length === 0) {
            throw new common_1.BadRequestException('No hay fichas activas para cerrar');
        }
        const topInterested = this.getTop3ByCategory(activeCards, 'interested');
        const topIntroduce = this.getTop3ByCategory(activeCards, 'introduce');
        for (const card of activeCards) {
            await this.closeCard(card.id);
        }
        const eventNumber = await this.sessionCache.incrementEventNumber(session.id);
        this.eventEmitter.emit('voting.closed', new session_events_1.VotingClosedEvent(session.id, { topInterested, topIntroduce }, eventNumber));
        this.logger.log(`Votación cerrada en sesión ${session.id}: ${activeCards.length} fichas procesadas`);
        return { status: 'success', closedCount: activeCards.length };
    }
    getTop3ByCategory(cards, category) {
        return cards
            .map((c) => ({
            id: c.id,
            name: c.name,
            photoUrl: c.photoUrl,
            tableNumber: c.tableNumber,
            percentage: c.totalVotes > 0 ? Math.round((c.counts[category] / c.totalVotes) * 100) : 0,
            votes: c.counts[category],
            totalVotes: c.totalVotes,
        }))
            .filter((c) => c.votes > 0)
            .sort((a, b) => b.percentage - a.percentage || b.votes - a.votes)
            .slice(0, 3);
    }
    async addCardToHistory(card) {
        const enriched = card.counts ? card : await this.enrichCard(card);
        await this.sessionCache.addCardToHistory(card.sessionId, enriched);
    }
    async voteCard(cardId, playerId, choice) {
        const card = await this.prisma.profileCard.findUnique({ where: { id: cardId } });
        if (!card)
            throw new common_1.NotFoundException('Ficha no encontrada');
        if (card.status !== 'APPROVED') {
            throw new common_1.BadRequestException('Esta ficha no está abierta a votación');
        }
        const activeCards = await this.sessionCache.getActiveCards(card.sessionId);
        const isActive = activeCards.some((c) => c.id === cardId);
        if (!isActive) {
            throw new common_1.BadRequestException('La votación de esta ficha ya fue cerrada');
        }
        await this.prisma.cardVote.upsert({
            where: { cardId_playerId: { cardId, playerId } },
            create: { cardId, playerId, choice },
            update: { choice },
        });
        const enriched = await this.enrichCard(card);
        await this.sessionCache.addActiveCard(card.sessionId, enriched);
        const eventNumber = await this.sessionCache.incrementEventNumber(card.sessionId);
        this.eventEmitter.emit('card.vote.updated', new session_events_1.CardVoteUpdatedEvent(card.sessionId, cardId, enriched.counts, enriched.totalVotes, eventNumber));
        return { status: 'success', counts: enriched.counts, totalVotes: enriched.totalVotes };
    }
    async setMode(sessionId, mode) {
        const session = await this.resolveActiveSession(sessionId);
        await this.prisma.gameSession.update({
            where: { id: session.id },
            data: { mode },
        });
        await this.sessionCache.setMode(session.id, mode);
        const eventNumber = await this.sessionCache.incrementEventNumber(session.id);
        this.eventEmitter.emit('session.mode.changed', new session_events_1.SessionModeChangedEvent(session.id, mode, eventNumber));
        return { status: 'success', mode };
    }
};
exports.CardsService = CardsService;
exports.CardsService = CardsService = CardsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2,
        redis_session_cache_service_1.RedisSessionCacheService])
], CardsService);
//# sourceMappingURL=cards.service.js.map