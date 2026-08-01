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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_session_cache_service_1 = require("../session/redis-session-cache.service");
const session_events_1 = require("../session/session.events");
const analytics_query_dto_1 = require("./dto/analytics-query.dto");
let BarService = class BarService {
    prisma;
    eventEmitter;
    sessionCache;
    constructor(prisma, eventEmitter, sessionCache) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.sessionCache = sessionCache;
    }
    async claimRewardInstant(playerId, rewardId) {
        const { claim, sessionId } = await this.prisma.$transaction(async (tx) => {
            const player = await tx.player.findUnique({
                where: { id: playerId },
                include: { session: true },
            });
            if (!player || !player.session.isActive) {
                throw new common_1.BadRequestException('El jugador o la sesión no están activos.');
            }
            const reward = await tx.reward.findUnique({ where: { id: rewardId } });
            if (!reward || reward.barId !== player.session.barId) {
                throw new common_1.NotFoundException('El premio solicitado no existe en este local.');
            }
            if (reward.stock <= 0) {
                throw new common_1.BadRequestException('Lo sentimos, este premio se encuentra agotado esta noche.');
            }
            if (!reward.isInstant && player.totalPoints < reward.pointsCost) {
                throw new common_1.BadRequestException('No acumulaste suficientes puntos para este premio.');
            }
            let claimCode = '';
            let isUnique = false;
            while (!isUnique) {
                claimCode = Math.random().toString(36).substring(2, 6).toUpperCase();
                const exists = await tx.rewardClaim.findUnique({ where: { claimCode } });
                if (!exists)
                    isUnique = true;
            }
            if (!reward.isInstant) {
                await tx.player.update({
                    where: { id: playerId },
                    data: { totalPoints: { decrement: reward.pointsCost } },
                });
            }
            await tx.reward.update({
                where: { id: rewardId },
                data: { stock: { decrement: 1 } },
            });
            const newClaim = await tx.rewardClaim.create({
                data: {
                    playerId,
                    rewardId,
                    claimCode,
                },
                include: { reward: true, player: true },
            });
            return { claim: newClaim, sessionId: player.sessionId };
        });
        const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
        this.eventEmitter.emit('reward.reserved', new session_events_1.RewardReservedEvent(sessionId, claim.claimCode, claim.reward.title, claim.player?.nickname || 'Jugador', eventNumber));
        return claim;
    }
    async redeemRewardCode(barId, claimCode) {
        const { claim, sessionId } = await this.prisma.$transaction(async (tx) => {
            const found = await tx.rewardClaim.findUnique({
                where: { claimCode },
                include: {
                    reward: true,
                    player: { include: { session: true } }
                },
            });
            if (!found) {
                throw new common_1.NotFoundException('Código de canje no encontrado o inválido.');
            }
            if (found.isRedeemed) {
                throw new common_1.BadRequestException('Este código ya fue utilizado y entregado en barra.');
            }
            if (found.reward.barId !== barId && barId !== 'local-demo' && barId !== 'local-kilkenny-test') {
                throw new common_1.BadRequestException('Este código pertenece a otra sucursal de PulsoBet.');
            }
            const updated = await tx.rewardClaim.update({
                where: { claimCode },
                data: { isRedeemed: true },
                include: { reward: true, player: { include: { session: true } } },
            });
            return { claim: updated, sessionId: updated.player.sessionId };
        });
        const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
        this.eventEmitter.emit('reward.delivered', new session_events_1.RewardDeliveredEvent(sessionId, claim.claimCode, claim.reward.title, claim.player?.nickname || 'Jugador', eventNumber));
        return claim;
    }
    async getAvailableRewards(sessionId) {
        let session = await this.prisma.gameSession.findUnique({
            where: { id: sessionId },
        });
        if (!session) {
            session = await this.prisma.gameSession.findFirst({
                where: { isActive: true },
            });
        }
        if (!session)
            return [];
        return this.prisma.reward.findMany({
            where: { barId: session.barId, stock: { gt: 0 } },
            orderBy: { pointsCost: 'asc' },
        });
    }
    async getPlayerByNickname(sessionId, nickname) {
        let player = await this.prisma.player.findFirst({
            where: { sessionId, nickname: { equals: nickname, mode: 'insensitive' } },
            include: {
                claims: {
                    include: { reward: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!player) {
            player = await this.prisma.player.findFirst({
                where: { nickname: { equals: nickname, mode: 'insensitive' } },
                include: {
                    claims: {
                        include: { reward: true },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });
        }
        if (!player) {
            throw new common_1.NotFoundException('Jugador no encontrado.');
        }
        return player;
    }
    async getPlayerProfile(playerId) {
        const player = await this.prisma.player.findUnique({
            where: { id: playerId },
            include: {
                claims: {
                    include: { reward: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!player) {
            throw new common_1.NotFoundException('Jugador no encontrado.');
        }
        return player;
    }
    getDateRange(dto) {
        const end = dto.endDate ? new Date(dto.endDate) : new Date();
        let start;
        if (dto.preset === analytics_query_dto_1.DatePreset.CUSTOM) {
            if (!dto.startDate)
                throw new common_1.BadRequestException('startDate es requerida para el rango CUSTOM.');
            start = new Date(dto.startDate);
        }
        else {
            start = new Date(end);
            if (dto.preset === analytics_query_dto_1.DatePreset.WEEK) {
                start.setDate(end.getDate() - 7);
            }
            else if (dto.preset === analytics_query_dto_1.DatePreset.MONTH) {
                start.setMonth(end.getMonth() - 1);
            }
            else if (dto.preset === analytics_query_dto_1.DatePreset.YEAR) {
                start.setFullYear(end.getFullYear() - 1);
            }
        }
        return { start, end };
    }
    async getBarAnalytics(barId, dto) {
        const { start, end } = this.getDateRange(dto);
        const totalClaims = await this.prisma.rewardClaim.count({
            where: {
                reward: { barId },
                createdAt: { gte: start, lte: end },
                isRedeemed: true,
            },
        });
        const claimsByReward = await this.prisma.rewardClaim.groupBy({
            by: ['rewardId'],
            where: {
                reward: { barId },
                createdAt: { gte: start, lte: end },
                isRedeemed: true,
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5,
        });
        const topRewardsEnriched = await Promise.all(claimsByReward.map(async (item) => {
            const reward = await this.prisma.reward.findUnique({ where: { id: item.rewardId } });
            return {
                rewardTitle: reward?.title || 'Desconocido',
                totalRedeemed: item._count.id,
            };
        }));
        const totalActivePlayers = await this.prisma.player.count({
            where: {
                session: { barId },
                predictions: { some: { createdAt: { gte: start, lte: end } } },
            },
        });
        return {
            period: { start, end, preset: dto.preset },
            metrics: {
                totalClaimsRedeemed: totalClaims,
                totalActivePlayers,
                topRewards: topRewardsEnriched,
            },
        };
    }
    async exportClaimsReport(barId, dto) {
        const { start, end } = this.getDateRange(dto);
        const bar = await this.prisma.bar.findUnique({ where: { id: barId } });
        const barName = bar?.name || 'Local PulsoBet';
        const claims = await this.prisma.rewardClaim.findMany({
            where: {
                reward: { barId },
                createdAt: { gte: start, lte: end },
            },
            include: {
                reward: true,
                player: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        const rewards = await this.prisma.reward.findMany({
            where: { barId },
            orderBy: { title: 'asc' },
        });
        const productSummaryMap = {};
        for (const r of rewards) {
            productSummaryMap[r.id] = {
                title: r.title,
                pointsCost: r.pointsCost,
                totalClaims: 0,
                redeemed: 0,
                pending: 0,
                totalPointsSpent: 0,
            };
        }
        let grandTotalClaims = 0;
        let grandTotalRedeemed = 0;
        let grandTotalPointsSpent = 0;
        for (const c of claims) {
            grandTotalClaims++;
            if (c.isRedeemed)
                grandTotalRedeemed++;
            grandTotalPointsSpent += c.reward.pointsCost;
            if (!productSummaryMap[c.rewardId]) {
                productSummaryMap[c.rewardId] = {
                    title: c.reward.title,
                    pointsCost: c.reward.pointsCost,
                    totalClaims: 0,
                    redeemed: 0,
                    pending: 0,
                    totalPointsSpent: 0,
                };
            }
            productSummaryMap[c.rewardId].totalClaims++;
            if (c.isRedeemed) {
                productSummaryMap[c.rewardId].redeemed++;
            }
            else {
                productSummaryMap[c.rewardId].pending++;
            }
            productSummaryMap[c.rewardId].totalPointsSpent += c.reward.pointsCost;
        }
        const BOM = '\uFEFF';
        const lines = [];
        lines.push(`REPORTE CONTABLE Y AUDITORIA DE CANJES DE PREMIOS - PULSOBET`);
        lines.push(`Local: "${barName}" (ID: ${barId})`);
        lines.push(`Periodo: "${dto.preset}" (${start.toLocaleDateString()} al ${end.toLocaleDateString()})`);
        lines.push(`Fecha de Emision: "${new Date().toLocaleString()}"`);
        lines.push(``);
        lines.push(`--- RESUMEN CONTABLE POR PRODUCTO / PREMIO ---`);
        lines.push(`Producto / Premio,Costo Puntos,Total Solicitados,Entregados en Barra,Pendientes,Puntos Totales Consumidos,% Participacion`);
        const summaryRows = Object.values(productSummaryMap);
        for (const item of summaryRows) {
            const share = grandTotalClaims > 0 ? ((item.totalClaims / grandTotalClaims) * 100).toFixed(1) + '%' : '0%';
            lines.push(`"${item.title}",${item.pointsCost},${item.totalClaims},${item.redeemed},${item.pending},${item.totalPointsSpent},"${share}"`);
        }
        lines.push(`"TOTAL GENERAL",-,${grandTotalClaims},${grandTotalRedeemed},${grandTotalClaims - grandTotalRedeemed},${grandTotalPointsSpent},"100%"`);
        lines.push(``);
        lines.push(``);
        lines.push(`--- LOG DETALLADO DE TRANSACCIONES ---`);
        lines.push(`Codigo Canje,Producto / Premio,Puntos Costo,Cliente / Jugador,Mesa,Estado,Fecha y Hora`);
        for (const c of claims) {
            const dateFormatted = new Date(c.createdAt).toLocaleString('es-PY', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
            const estado = c.isRedeemed ? 'ENTREGADO EN BARRA' : 'PENDIENTE EN BARRA';
            lines.push(`"${c.claimCode}","${c.reward.title}",${c.reward.pointsCost},"${c.player.nickname}","${c.player.tableNumber || 'N/A'}","${estado}","${dateFormatted}"`);
        }
        return BOM + lines.join('\n');
    }
};
exports.BarService = BarService;
exports.BarService = BarService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2,
        redis_session_cache_service_1.RedisSessionCacheService])
], BarService);
//# sourceMappingURL=bar.service.js.map