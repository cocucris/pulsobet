import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Autenticación tradicional para el staff del bar
   */
  async loginStaff(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) throw new UnauthorizedException('Credenciales inválidas');

    const payload = { sub: user.id, email: user.email, role: user.role, barId: user.barId };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  /**
   * Onboarding rápido y transparente para el cliente que escanea el QR
   */
  async registerAnonymousPlayer(sessionId: string, nickname: string, tableNumber?: string) {
    // 1. Validar que la sesión del bar exista y esté activa
    const session = await this.prisma.gameSession.findFirst({
      where: { id: sessionId, isActive: true },
    });
    if (!session) throw new BadRequestException('La sesión de juego no está activa o no existe.');

    // 2. Crear o recuperar el perfil del jugador en esta sesión nocturna
    let player = await this.prisma.player.findUnique({
      where: {
        sessionId_nickname: { sessionId, nickname },
      },
    });

    if (!player) {
      player = await this.prisma.player.create({
        data: {
          sessionId,
          nickname,
          tableNumber,
        },
      });
    }

    // 3. Emitir un JWT efímero con alcance limitado a la sesión del juego
    const payload = { 
      sub: player.id, 
      nickname: player.nickname, 
      sessionId: player.sessionId, 
      barId: session.barId,
      type: 'player' 
    };

    return {
      player_token: await this.jwtService.signAsync(payload, { expiresIn: '8h' }), // Expira al terminar el turno
      player: {
        id: player.id,
        nickname: player.nickname,
        totalPoints: player.totalPoints,
      }
    };
  }
}
