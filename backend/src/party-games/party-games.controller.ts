import { Controller, Get, Post, Delete, Body, Param, Logger } from '@nestjs/common';
import { PartyGamesService } from './party-games.service';
import { CreatePartyRoundDto } from './dto/create-round.dto';
import { ManageCategoryDto } from './dto/manage-categories.dto';

@Controller('party-games')
export class PartyGamesController {
  private readonly logger = new Logger(PartyGamesController.name);

  constructor(private readonly partyGamesService: PartyGamesService) {}

  // ─── GESTIÓN DE CATEGORÍAS TUTI FRUTI ────────────────────────────────────

  @Get('categories/:barId')
  async getCategories(@Param('barId') barId: string) {
    return this.partyGamesService.getCategories(barId);
  }

  @Post('categories/:barId')
  async addCategory(@Param('barId') barId: string, @Body() dto: ManageCategoryDto) {
    return this.partyGamesService.addCategory(barId, dto);
  }

  @Delete('categories/:barId/:categoryId')
  async deleteCategory(
    @Param('barId') barId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.partyGamesService.deleteCategory(barId, categoryId);
  }

  // ─── CONTROL ADMIN DE RONDAS ─────────────────────────────────────────────

  @Post('rounds')
  async createRound(@Body() dto: CreatePartyRoundDto) {
    return this.partyGamesService.createRound(dto);
  }

  @Post('rounds/:roundId/advance')
  async advancePhase(@Param('roundId') roundId: string) {
    await this.partyGamesService.advancePhase(roundId);
    return { status: 'ok' };
  }

  @Post('rounds/:roundId/end')
  async endRound(@Param('roundId') roundId: string) {
    await this.partyGamesService.endRound(roundId);
    return { status: 'ok' };
  }

  // ─── CONSULTA DE ESTADO (para reconexión / polling fallback) ─────────────

  @Get('rounds/active/:sessionId')
  async getActiveRound(@Param('sessionId') sessionId: string) {
    return this.partyGamesService.getActiveRoundForSession(sessionId);
  }
}
