import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { VoteCardDto } from './dto/vote-card.dto';
import { SetModeDto } from './dto/set-mode.dto';

const UPLOADS_DIR = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads', 'cards');

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  /**
   * POST /cards/upload
   * Sube la foto de la ficha (jpg/png/webp, máx 5MB) y devuelve la URL pública
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
          return cb(new BadRequestException('Solo se permiten imágenes JPG, PNG o WebP.'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadPhoto(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen.');
    return { url: `/uploads/cards/${file.filename}` };
  }

  /**
   * POST /cards
   * El jugador carga la ficha de un amigo (queda PENDING hasta aprobación)
   */
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createCard(@Body() dto: CreateCardDto) {
    return this.cardsService.createCard(dto);
  }

  /**
   * GET /cards/pending/:sessionId
   * Fichas pendientes de aprobación (panel admin)
   */
  @Get('pending/:sessionId')
  getPending(@Param('sessionId') sessionId: string) {
    return this.cardsService.getPendingCards(sessionId);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.cardsService.approveCard(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.cardsService.rejectCard(id);
  }

  @Post(':id/close')
  close(@Param('id') id: string) {
    return this.cardsService.closeCard(id);
  }

  /**
   * POST /cards/close-all
   * Cierra TODAS las fichas activas de la sesión y emite resultados finales
   */
  @Post('close-all')
  closeAll(@Body() dto: { sessionId: string }) {
    return this.cardsService.closeAllCards(dto.sessionId);
  }

  /**
   * POST /cards/:id/vote
   * Voto del jugador: INTERESTED | INTRODUCE | PASS (re-votar cambia el voto)
   */
  @Post(':id/vote')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  vote(@Param('id') id: string, @Body() dto: VoteCardDto) {
    return this.cardsService.voteCard(id, dto.playerId, dto.choice);
  }

  /**
   * POST /cards/mode
   * Switch del admin: MODO PARTIDO (trivias) ↔ MODO FICHAJE (fichas)
   */
  @Post('mode')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  setMode(@Body() dto: SetModeDto) {
    return this.cardsService.setMode(dto.sessionId, dto.mode);
  }
}
