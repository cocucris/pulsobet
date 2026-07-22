import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: (requestOrigin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
        : ['http://localhost:3000', 'http://localhost:3001'];

      if (!requestOrigin || allowedOrigins.includes('*') || allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
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
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  /**
   * Helper para obtener y sincronizar la tabla de posiciones desde la base de datos persistente
   */
  private async getLeaderboardForSession(sessionId: string) {
    let targetSessionId = sessionId;

    let session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      session = await this.prisma.gameSession.findFirst({
        where: { isActive: true },
      });
      if (session) targetSessionId = session.id;
    }

    const topPlayers = await this.prisma.player.findMany({
      where: { sessionId: targetSessionId },
      orderBy: { totalPoints: 'desc' },
      take: 10,
    });

    for (const p of topPlayers) {
      await this.redisService.setPlayerScore(targetSessionId, p.id, p.totalPoints);
    }

    return topPlayers.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      tableNumber: p.tableNumber,
      totalPoints: p.totalPoints,
      streakCount: p.streakCount,
    }));
  }

  /**
   * Helper para obtener las preguntas activas vigentes (sin resolver y no expiradas) con tendencias de votación
   */
  private async getActiveQuestionsForSession() {
    const questions = await this.prisma.liveQuestion.findMany({
      where: {
        correctOptionId: null,
      },
      orderBy: { expiresAt: 'desc' },
    });

    const enriched = await Promise.all(
      questions.map(async (q) => {
        const voteCounts = await this.prisma.prediction.groupBy({
          by: ['chosenOptionId'],
          where: { questionId: q.id },
          _count: { id: true },
        });

        const totalVotes = voteCounts.reduce((sum, item) => sum + item._count.id, 0);
        const optionsArray = Array.isArray(q.options) ? (q.options as any[]) : [];

        const optionsWithStats = optionsArray.map((opt) => {
          const match = voteCounts.find((v) => Number(v.chosenOptionId) === Number(opt.id));
          const count = match ? match._count.id : 0;
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          return {
            ...opt,
            count,
            percentage,
          };
        });

        return {
          id: q.id,
          questionText: q.questionText,
          options: optionsWithStats,
          pointsReward: q.pointsReward,
          imageUrl: q.imageUrl,
          isFlash: q.isFlash,
          isClosed: q.isClosed,
          expiresAt: q.expiresAt,
          totalVotes,
        };
      })
    );

    return enriched;
  }

  /**
   * Un jugador se une a la sesión de un bar específico
   */
  @SubscribeMessage('join_bar_session')
  async handleJoinBar(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; nickname: string },
  ) {
    const roomName = `bar:${data.sessionId}`;
    client.join(roomName);
    
    this.logger.log(`Jugador [${data.nickname}] se unió a la sala: ${roomName}`);
    
    // Notifica al bar que entró alguien
    this.server.to(roomName).emit('player_joined', { nickname: data.nickname });

    // Emitir inmediatamente el Leaderboard real persistido
    const leaderboard = await this.getLeaderboardForSession(data.sessionId);
    client.emit('leaderboard_update', leaderboard);

    // Emitir la lista de trivias activas vigentes
    const activeQuestions = await this.getActiveQuestionsForSession();
    client.emit('active_questions_list', activeQuestions);
    if (activeQuestions.length > 0) {
      client.emit('new_question_active', activeQuestions[0]);
    }
    
    return { status: 'success', message: `Unido a la sala ${roomName}` };
  }

  /**
   * Una pantalla de TV se vincula a la sesión del bar
   */
  @SubscribeMessage('join_tv_screen')
  async handleJoinTv(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const roomName = `bar:${data.sessionId}:tv`;
    client.join(roomName);
    
    this.logger.log(`Pantalla de TV vinculada a la sala: ${roomName}`);

    // Emitir inmediatamente el Leaderboard real persistido al reconectar la TV o al hacer F5
    const leaderboard = await this.getLeaderboardForSession(data.sessionId);
    client.emit('leaderboard_update', leaderboard);

    // Emitir la lista de trivias activas vigentes al hacer F5
    const activeQuestions = await this.getActiveQuestionsForSession();
    client.emit('active_questions_list', activeQuestions);
    if (activeQuestions.length > 0) {
      client.emit('new_question_active', activeQuestions[0]);
    }

    return { status: 'success', message: `TV vinculada a la sala ${roomName}` };
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
    // Recuperamos los datos validados del payload del JWT de forma segura
    const user = (client as any).user; 
    
    this.logger.log(`Predicción segura recibida del Jugador ${user?.sub} en la sesión ${user?.sessionId}`);
    
    if (user?.sub && data.questionId && data.chosenOptionId !== undefined) {
      try {
        const optionIdNum = Number(data.chosenOptionId);

        const existing = await this.prisma.prediction.findFirst({
          where: { playerId: user.sub, questionId: data.questionId },
        });

        if (existing) {
          await this.prisma.prediction.update({
            where: { id: existing.id },
            data: { chosenOptionId: optionIdNum },
          });
          this.logger.log(`Predicción actualizada en DB para Jugador ${user.sub}`);
        } else {
          await this.prisma.prediction.create({
            data: {
              playerId: user.sub,
              questionId: data.questionId,
              chosenOptionId: optionIdNum,
              status: 'PENDING',
            },
          });
          this.logger.log(`Predicción guardada en DB para Jugador ${user.sub}`);
        }

        const activeQuestions = await this.getActiveQuestionsForSession();
        if (user?.sessionId) {
          this.server.to(`bar:${user.sessionId}`).emit('active_questions_list', activeQuestions);
          this.server.to(`bar:${user.sessionId}:tv`).emit('active_questions_list', activeQuestions);
        }
        this.server.emit('active_questions_list', activeQuestions);
      } catch (err) {
        this.logger.error('Error al guardar la predicción en DB:', err);
      }
    }
    
    return { status: 'received', playerId: user?.sub };
  }

  /**
   * Método público para emitir actualizaciones de puntajes (Leaderboard)
   */
  sendLeaderboardUpdate(sessionId: string, topPlayers: any[]) {
    // Emitimos tanto a la sala general como a la específica de la TV
    this.server.to(`bar:${sessionId}`).emit('leaderboard_update', topPlayers);
    this.server.to(`bar:${sessionId}:tv`).emit('leaderboard_update', topPlayers);
  }

  /**
   * Método público para lanzar una nueva pregunta en vivo a los celulares y a las TVs
   */
  async broadcastNewQuestion(sessionId: string, question: any) {
    this.server.to(`bar:${sessionId}`).emit('new_question_active', question);
    this.server.to(`bar:${sessionId}:tv`).emit('new_question_active', question);
    
    const activeQuestions = await this.getActiveQuestionsForSession();
    this.server.to(`bar:${sessionId}`).emit('active_questions_list', activeQuestions);
    this.server.to(`bar:${sessionId}:tv`).emit('active_questions_list', activeQuestions);
  }

  /**
   * Método público para notificar la resolución/cierre de una pregunta activa
   */
  async broadcastQuestionResolved(sessionId: string) {
    const activeQuestions = await this.getActiveQuestionsForSession();
    this.server.to(`bar:${sessionId}`).emit('active_questions_list', activeQuestions);
    this.server.to(`bar:${sessionId}:tv`).emit('active_questions_list', activeQuestions);

    if (activeQuestions.length === 0) {
      this.server.to(`bar:${sessionId}`).emit('question_resolved');
      this.server.to(`bar:${sessionId}:tv`).emit('question_resolved');
    } else {
      this.server.to(`bar:${sessionId}`).emit('new_question_active', activeQuestions[0]);
      this.server.to(`bar:${sessionId}:tv`).emit('new_question_active', activeQuestions[0]);
    }
  }
}
