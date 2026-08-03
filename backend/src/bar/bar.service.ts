import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisSessionCacheService } from '../session/redis-session-cache.service';
import { RewardReservedEvent, RewardDeliveredEvent } from '../session/session.events';
import { AnalyticsQueryDto, DatePreset } from './dto/analytics-query.dto';

@Injectable()
export class BarService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private sessionCache: RedisSessionCacheService,
  ) {}

  /**
   * 1. El cliente solicita el canje de un premio (directo o vía ruleta)
   */
  async claimRewardInstant(playerId: string, rewardId: string) {
    const { claim, sessionId } = await this.prisma.$transaction(async (tx) => {
      // Validar jugador y sesión activa
      const player = await tx.player.findUnique({
        where: { id: playerId },
        include: { session: true },
      });
      if (!player || !player.session.isActive) {
        throw new BadRequestException('El jugador o la sesión no están activos.');
      }

      // Validar el premio y stock
      const reward = await tx.reward.findUnique({ where: { id: rewardId } });
      if (!reward || reward.barId !== player.session.barId) {
        throw new NotFoundException('El premio solicitado no existe en este local.');
      }
      if (reward.stock <= 0) {
        throw new BadRequestException('Lo sentimos, este premio se encuentra agotado esta noche.');
      }

      // Validar si tiene los puntos necesarios (si no es ruleta instantánea)
      if (!reward.isInstant && player.totalPoints < reward.pointsCost) {
        throw new BadRequestException('No acumulaste suficientes puntos para este premio.');
      }

      // Generar código único de 4 dígitos (Ej: A7X9)
      let claimCode = '';
      let isUnique = false;
      while (!isUnique) {
        claimCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        const exists = await tx.rewardClaim.findUnique({ where: { claimCode } });
        if (!exists) isUnique = true;
      }

      // Descontar puntos (si aplica) y stock del premio
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

      // Crear el registro del reclamo
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

    // Notificar en vivo (jugador, TV y admin ven el canje pendiente al instante)
    const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
    this.eventEmitter.emit(
      'reward.reserved',
      new RewardReservedEvent(
        sessionId,
        claim.claimCode,
        claim.reward.title,
        claim.player?.nickname || 'Jugador',
        eventNumber,
      ),
    );

    return claim;
  }

  /**
   * 2. El mozo valida y procesa el código en la barra
   */
  async redeemRewardCode(barId: string, claimCode: string) {
    const { claim, sessionId } = await this.prisma.$transaction(async (tx) => {
      const found = await tx.rewardClaim.findUnique({
        where: { claimCode },
        include: {
          reward: true,
          player: { include: { session: true } }
        },
      });

      if (!found) {
        throw new NotFoundException('Código de canje no encontrado o inválido.');
      }

      if (found.isRedeemed) {
        throw new BadRequestException('Este código ya fue utilizado y entregado en barra.');
      }

      // Seguridad: Asegurar que el código pertenezca al bar del mozo que consulta (con fallback para entorno dev)
      if (found.reward.barId !== barId && barId !== 'local-demo' && barId !== 'local-kilkenny-test') {
        throw new BadRequestException('Este código pertenece a otra sucursal de PulsoBet.');
      }

      // Marcar como entregado
      const updated = await tx.rewardClaim.update({
        where: { claimCode },
        data: { isRedeemed: true },
        include: { reward: true, player: { include: { session: true } } },
      });

      return { claim: updated, sessionId: updated.player.sessionId };
    });

    // Notificar en vivo: el celular del jugador marca el voucher como ENTREGADO sin F5
    const eventNumber = await this.sessionCache.incrementEventNumber(sessionId);
    this.eventEmitter.emit(
      'reward.delivered',
      new RewardDeliveredEvent(
        sessionId,
        claim.claimCode,
        claim.reward.title,
        claim.player?.nickname || 'Jugador',
        eventNumber,
      ),
    );

    return claim;
  }

  /**
   * Obtiene la lista de premios disponibles para la sesión actual
   */
  async getAvailableRewards(sessionId: string) {
    let session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      session = await this.prisma.gameSession.findFirst({
        where: { isActive: true },
      });
    }

    if (!session) return [];

    return this.prisma.reward.findMany({
      where: { barId: session.barId, stock: { gt: 0 } },
      orderBy: { pointsCost: 'asc' },
    });
  }

  /**
   * Obtiene la información del jugador por nickname y sessionId.
   * Sin fallback cross-sesión: tras un cierre de noche, el jugador de la sesión
   * archivada NO debe heredar puntos ni canjes en la sesión nueva.
   */
  async getPlayerByNickname(sessionId: string, nickname: string) {
    const player = await this.prisma.player.findFirst({
      where: { sessionId, nickname: { equals: nickname, mode: 'insensitive' } },
      include: {
        claims: {
          include: { reward: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!player) {
      throw new NotFoundException('Jugador no encontrado.');
    }

    return player;
  }

  /**
   * Obtiene la información del jugador, sus puntos acumulados y sus códigos de canje.
   * Si la sesión del jugador fue archivada (cierre de noche), devuelve 404 para que
   * el celular limpie su estado y vuelva al registro con 0 puntos.
   */
  async getPlayerProfile(playerId: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: {
        session: { select: { isActive: true } },
        claims: {
          include: { reward: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!player || !player.session.isActive) {
      throw new NotFoundException('Jugador no encontrado.');
    }

    return player;
  }

  /**
   * Helper para calcular el rango de fechas en función del preset
   */
  private getDateRange(dto: AnalyticsQueryDto): { start: Date; end: Date } {
    const end = dto.endDate ? new Date(dto.endDate) : new Date();
    let start: Date;

    if (dto.preset === DatePreset.CUSTOM) {
      if (!dto.startDate) throw new BadRequestException('startDate es requerida para el rango CUSTOM.');
      start = new Date(dto.startDate);
    } else {
      start = new Date(end);
      if (dto.preset === DatePreset.WEEK) {
        start.setDate(end.getDate() - 7);
      } else if (dto.preset === DatePreset.MONTH) {
        start.setMonth(end.getMonth() - 1);
      } else if (dto.preset === DatePreset.YEAR) {
        start.setFullYear(end.getFullYear() - 1);
      }
    }

    return { start, end };
  }

  /**
   * Obtiene métricas agrupadas de consumo y canjes para el Dashboard
   */
  async getBarAnalytics(barId: string, dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateRange(dto);

    // 1. Total de canjes realizados y entregados en el periodo
    const totalClaims = await this.prisma.rewardClaim.count({
      where: {
        reward: { barId },
        createdAt: { gte: start, lte: end },
        isRedeemed: true,
      },
    });

    // 2. Desglose por premio más popular (Top Rewards)
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

    // Enriquecer el Top de premios con sus títulos
    const topRewardsEnriched = await Promise.all(
      claimsByReward.map(async (item) => {
        const reward = await this.prisma.reward.findUnique({ where: { id: item.rewardId } });
        return {
          rewardTitle: reward?.title || 'Desconocido',
          totalRedeemed: item._count.id,
        };
      }),
    );

    // 3. Participación de jugadores en ese periodo
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

  /**
   * Genera una planilla contable estructurada por producto y log de auditoría en formato CSV (compatible nativo con Excel UTF-8)
   */
  async exportClaimsReport(barId: string, dto: AnalyticsQueryDto): Promise<string> {
    const { start, end } = this.getDateRange(dto);

    // Información general del local
    const bar = await this.prisma.bar.findUnique({ where: { id: barId } });
    const barName = bar?.name || 'Local PulsoBet';

    // Obtener todas las transacciones de canjes en el período
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

    // Obtener catálogo de premios del local para consolidación contable
    const rewards = await this.prisma.reward.findMany({
      where: { barId },
      orderBy: { title: 'asc' },
    });

    // Mapeo contable por producto
    const productSummaryMap: { [rewardId: string]: { title: string; pointsCost: number; totalClaims: number; redeemed: number; pending: number; totalPointsSpent: number } } = {};

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
      if (c.isRedeemed) grandTotalRedeemed++;
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
      } else {
        productSummaryMap[c.rewardId].pending++;
      }
      productSummaryMap[c.rewardId].totalPointsSpent += c.reward.pointsCost;
    }

    // ENSAMBLE DEL ARCHIVO CSV CON UTF-8 BOM PARA EXCEL NATIVO
    const BOM = '\uFEFF';
    const lines: string[] = [];

    lines.push(`REPORTE CONTABLE Y AUDITORIA DE CANJES DE PREMIOS - PULSOBET`);
    lines.push(`Local: "${barName}" (ID: ${barId})`);
    lines.push(`Periodo: "${dto.preset}" (${start.toLocaleDateString()} al ${end.toLocaleDateString()})`);
    lines.push(`Fecha de Emision: "${new Date().toLocaleString()}"`);
    lines.push(``);

    // SECCIÓN 1: PLANILLA CONTABLE AGRUPADA POR PRODUCTO
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

    // SECCIÓN 2: AUDITORÍA DETALLADA DE TRANSACCIONES
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
}
