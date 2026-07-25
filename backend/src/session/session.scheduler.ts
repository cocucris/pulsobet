import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionScheduler implements OnModuleInit {
  private readonly logger = new Logger(SessionScheduler.name);
  private activeTimers = new Map<string, NodeJS.Timeout>();

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Inicializando SessionScheduler y recuperando trivias activas...');
    try {
      const activeQuestions = await this.prisma.liveQuestion.findMany({
        where: {
          correctOptionId: null,
          isClosed: false,
        },
        include: {
          match: true,
        },
      });

      for (const question of activeQuestions) {
        const remainingMs = new Date(question.expiresAt).getTime() - Date.now();
        if (remainingMs > 0) {
          this.logger.log(`Reactivando timer para trivia ${question.id} (tiempo restante: ${Math.round(remainingMs / 1000)}s)`);
          // Note: SessionEngine will register callback when initialized
        }
      }
    } catch (err) {
      this.logger.error('Error al recuperar trivias activas en scheduler:', err);
    }
  }

  scheduleAutoClose(questionId: string, delayMs: number, onCloseCallback: () => Promise<void>) {
    this.cancelTimer(questionId);

    const timer = setTimeout(async () => {
      this.logger.log(`Timer expirado para trivia ${questionId}. Ejecutando auto-close...`);
      try {
        await onCloseCallback();
      } catch (err) {
        this.logger.error(`Error durante auto-close de trivia ${questionId}:`, err);
      } finally {
        this.activeTimers.delete(questionId);
      }
    }, delayMs);

    this.activeTimers.set(questionId, timer);
  }

  cancelTimer(questionId: string) {
    const existing = this.activeTimers.get(questionId);
    if (existing) {
      clearTimeout(existing);
      this.activeTimers.delete(questionId);
    }
  }
}
