import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      // Buscamos el token en los headers de conexión o en los query parameters
      const token = client.handshake.auth?.token || (client.handshake.query?.token as string);

      if (!token) {
        this.logger.error('Conexión de Socket rechazada: Token faltante.');
        throw new WsException('No autorizado. Token requerido.');
      }

      const payload = await this.jwtService.verifyAsync(token);

      // Adjuntamos los datos validados del usuario directamente al objeto socket
      (client as any).user = payload;
      return true;
    } catch (err) {
      const client: Socket = context.switchToWs().getClient<Socket>();
      this.logger.error('Conexión de Socket rechazada: Token inválido.');
      client.emit('unauthorized', { message: 'Token inválido. Volvé a registrarte.' });
      throw new WsException('No autorizado. Token inválido.');
    }
  }
}
