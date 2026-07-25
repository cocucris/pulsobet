import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UseGuards, Logger, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SessionEngine } from '../session/session.engine';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LiveGateway.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    @Inject(forwardRef(() => SessionEngine))
    private sessionEngine: SessionEngine,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  /**
   * Único método de broadcast centralizado para la sala del bar
   */
  broadcastToSession(sessionId: string, event: string, payload: any): void {
    // Todos los clientes (admin, tv, celulares) de una sesión pertenecen a bar:{sessionId}
    this.server.to(`bar:${sessionId}`).emit(event, payload);
    // Compatibilidad adicional para sub-salas específicas si existen
    this.server.to(`bar:${sessionId}:tv`).emit(event, payload);
  }

  /**
   * Heartbeat PING / PONG
   */
  @SubscribeMessage('PING')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('PONG', { serverTime: new Date().toISOString() });
  }

  /**
   * JOIN_SESSION unificado (Soporta Snapshot completo de hidratación)
   */
  @SubscribeMessage('JOIN_SESSION')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; type: 'player' | 'tv' | 'admin'; nickname?: string; playerId?: string },
  ) {
    const roomName = `bar:${data.sessionId}`;
    client.join(roomName);
    if (data.type === 'tv') {
      client.join(`${roomName}:tv`);
    }

    this.logger.log(`Cliente [${data.type}] se unió a la sala: ${roomName}`);

    // Construir y emitir el snapshot completo al cliente que entra/reconecta
    try {
      const snapshot = await this.sessionEngine.buildSnapshot(data.sessionId, data.playerId);
      client.emit('SNAPSHOT', snapshot);
    } catch (err) {
      this.logger.warn(`Error al construir snapshot para ${data.sessionId}:`, err);
    }

    if (data.type === 'player' && data.nickname) {
      this.broadcastToSession(data.sessionId, 'player_joined', { nickname: data.nickname });
    }

    return { status: 'success', message: `Unido a la sala ${roomName}` };
  }

  /**
   * Compatibilidad hacia atrás: join_bar_session
   */
  @SubscribeMessage('join_bar_session')
  async handleJoinBar(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; nickname: string },
  ) {
    return this.handleJoinSession(client, {
      sessionId: data.sessionId,
      type: 'player',
      nickname: data.nickname,
    });
  }

  /**
   * Compatibilidad hacia atrás: join_tv_screen
   */
  @SubscribeMessage('join_tv_screen')
  async handleJoinTv(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    return this.handleJoinSession(client, {
      sessionId: data.sessionId,
      type: 'tv',
    });
  }

  /**
   * Recepción de predicción protegida mediante JWT
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('submit_prediction')
  async handlePrediction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { questionId: string; chosenOptionId: number },
  ) {
    const user = (client as any).user;
    if (user?.sub && user?.sessionId && data.questionId && data.chosenOptionId !== undefined) {
      await this.sessionEngine.submitVote(user.sessionId, user.sub, data.questionId, data.chosenOptionId);
    }
    return { status: 'received', playerId: user?.sub };
  }

  sendLeaderboardUpdate(sessionId: string, topPlayers: any[]) {
    this.broadcastToSession(sessionId, 'leaderboard_update', topPlayers);
  }

  sendMatchUpdate(sessionId: string, matchData: any) {
    this.broadcastToSession(sessionId, 'match_score_update', matchData);
  }

  async broadcastNewQuestion(sessionId: string, question: any) {
    this.broadcastToSession(sessionId, 'new_question_active', question);
  }

  async broadcastQuestionResolved(sessionId: string) {
    this.broadcastToSession(sessionId, 'question_resolved', {});
  }
}
