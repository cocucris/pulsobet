import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const data = context.switchToWs().getData();

    // 1. Si ya fue verificado previamente en este socket
    if ((client as any).user?.sub) {
      return true;
    }

    // 2. Extraer token de múltiples fuentes (auth, query, headers, payload)
    const token =
      client.handshake?.auth?.token ||
      (client.handshake?.query?.token as string) ||
      (client.handshake?.headers?.authorization?.replace(/^Bearer\s+/i, '') as string) ||
      data?.token;

    if (!token) {
      // Si el evento trae playerId explícito, permitir pasar para que el gateway maneje la validación
      if (data?.playerId) {
        return true;
      }
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      (client as any).user = payload;
      return true;
    } catch (err) {
      this.logger.warn(`Token inválido o expirado en WS: ${err.message}`);
      return true;
    }
  }
}
