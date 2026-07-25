import { Controller, Post, Get, Patch, Param, Body, HttpCode, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { MatchService } from './match.service';
import { CreateManualQuestionDto } from './dto/create-manual-question.dto';
import { SportsApiWebhookDto } from './dto/sports-api-webhook.dto';
import { ResolveQuestionDto } from './dto/resolve-question.dto';
import { UpdateMatchScoreDto } from './dto/update-match-score.dto';
import { UpdateQuestionTextDto } from './dto/update-question-text.dto';

@Controller('match')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  /**
   * GET /match/leaderboard/:sessionId
   * Obtiene la tabla de posiciones actual persistida en PostgreSQL y sincronizada con Redis
   */
  @Get('leaderboard/:sessionId')
  async getLeaderboard(@Param('sessionId') sessionId: string) {
    return this.matchService.getCurrentLeaderboard(sessionId);
  }

  /**
   * GET /match/live/:sessionId
   * Devuelve el partido EN VIVO actual con marcador
   */
  @Get('live/:sessionId')
  async getLiveMatch(@Param('sessionId') sessionId: string) {
    return this.matchService.getLiveMatch(sessionId);
  }

  /**
   * GET /match/questions/active/:sessionId
   * Obtiene la trivia activa vigente (no expirada y sin resolver)
   */
  @Get('questions/active/:sessionId')
  async getActiveQuestion(@Param('sessionId') sessionId: string) {
    return this.matchService.getActiveQuestions(sessionId);
  }

  /**
   * POST /match/questions/manual
   * Inyecta una pregunta manualmente desde la consola del staff y la propaga por WebSockets
   */
  @Post('questions/manual')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async launchManualQuestion(@Body() createManualQuestionDto: CreateManualQuestionDto) {
    return this.matchService.createManualQuestion(createManualQuestionDto);
  }

  /**
   * POST /match/questions/resolve
   * Resuelve una pregunta declarando la opción ganadora, acreditando puntos y actualizando el Leaderboard
   */
  @Post('questions/resolve')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async resolveQuestion(@Body() dto: ResolveQuestionDto) {
    return this.matchService.resolveQuestionExpress(dto.questionId, dto.correctOptionId);
  }

  /**
   * POST /match/webhooks/sports-provider
   * Endpoint público/protegido donde la API externa notifica eventos en vivo
   */
  @Post('webhooks/sports-provider')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async receiveSportsEvent(@Body() sportsApiWebhookDto: SportsApiWebhookDto) {
    return this.matchService.handleSportsWebhook(sportsApiWebhookDto);
  }

  /**
   * PATCH /match/score
   * Actualiza el marcador manualmente y hace broadcast por WebSocket
   */
  @Patch('score')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateScore(@Body() dto: UpdateMatchScoreDto) {
    return this.matchService.updateMatchScore(dto);
  }

  /**
   * PATCH /match/questions/:id
   * Edita el texto de una trivia activa y sus opciones, y hace broadcast a todos los clientes
   */
  @Patch('questions/:id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateQuestionText(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionTextDto,
  ) {
    return this.matchService.updateLiveQuestion(id, dto);
  }
}
