import { Controller, Post, Get, Body, Query, Param, Res, Request, HttpCode, HttpStatus, ValidationPipe, UsePipes } from '@nestjs/common';
import type { Response } from 'express';
import { BarService } from './bar.service';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Controller('bar')
export class BarController {
  constructor(private readonly barService: BarService) {}

  /**
   * GET /bar/rewards/list/:sessionId
   * Lista los premios del bar para la sesión
   */
  @Get('rewards/list/:sessionId')
  async getRewardsForSession(@Param('sessionId') sessionId: string) {
    return this.barService.getAvailableRewards(sessionId);
  }

  /**
   * GET /bar/player/:playerId
   * Obtiene la información del jugador por ID
   */
  @Get('player/:playerId')
  async getPlayerProfile(@Param('playerId') playerId: string) {
    return this.barService.getPlayerProfile(playerId);
  }

  /**
   * GET /bar/player/by-nickname/:sessionId/:nickname
   * Obtiene la información del jugador por Apodo
   */
  @Get('player/by-nickname/:sessionId/:nickname')
  async getPlayerByNickname(
    @Param('sessionId') sessionId: string,
    @Param('nickname') nickname: string,
  ) {
    return this.barService.getPlayerByNickname(sessionId, nickname);
  }

  /**
   * POST /bar/rewards/claim
   * Llamado por el CLIENTE desde la PWA móvil para canjear puntos
   */
  @Post('rewards/claim')
  @HttpCode(HttpStatus.CREATED)
  async clientClaimReward(@Body() body: { playerId?: string; rewardId: string }, @Request() req: any) {
    const targetPlayerId = body.playerId || req.user?.sub;
    return this.barService.claimRewardInstant(targetPlayerId, body.rewardId);
  }

  /**
   * POST /bar/rewards/redeem
   * Llamado por el MOZO / STAFF desde el panel de barra para entregar el producto
   */
  @Post('rewards/redeem')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async staffRedeemReward(@Body() redeemRewardDto: RedeemRewardDto, @Request() req: any) {
    const barId = req.user?.barId || 'local-kilkenny-test';
    return this.barService.redeemRewardCode(barId, redeemRewardDto.claimCode);
  }

  @Get('analytics')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getAnalytics(@Query() query: AnalyticsQueryDto) {
    const barId = 'local-kilkenny-test'; // Extraído del JWT del Staff en prod
    return this.barService.getBarAnalytics(barId, query);
  }

  @Get('analytics/export-csv')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async exportCsv(@Query() query: AnalyticsQueryDto, @Res() res: Response) {
    const barId = 'local-kilkenny-test';
    const csvContent = await this.barService.exportClaimsReport(barId, query);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_contable_${barId}_${query.preset}.csv`);
    return res.send(csvContent);
  }
}
