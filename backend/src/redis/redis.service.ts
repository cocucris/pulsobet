import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;
  private readonly logger = new Logger(RedisService.name);

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Conexión exitosa a la infraestructura de Redis/Dragonfly 🚀');
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('Error en la conexión de Redis:', err);
    });
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }

  /**
   * Incrementa de forma atómica el puntaje de un jugador en el Leaderboard del bar
   */
  async incrementPlayerScore(sessionId: string, playerId: string, points: number): Promise<number> {
    const key = `leaderboard:${sessionId}`;
    // ZINCRBY incrementa el score del elemento en el Sorted Set
    const newScore = await this.redisClient.zincrby(key, points, playerId);
    return parseFloat(newScore);
  }

  /**
   * Guarda o pisa el puntaje absoluto de un jugador
   */
  async setPlayerScore(sessionId: string, playerId: string, points: number): Promise<void> {
    const key = `leaderboard:${sessionId}`;
    await this.redisClient.zadd(key, points, playerId);
  }

  /**
   * Obtiene el Top 10 de jugadores con sus puntajes en orden descendente
   */
  async getTopPlayers(sessionId: string, limit: number = 10): Promise<Array<{ playerId: string; score: number }>> {
    const key = `leaderboard:${sessionId}`;
    // ZREVRANGE obtiene los elementos de mayor a menor con sus scores en O(log(N)+M)
    const results = await this.redisClient.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    
    const formatted: Array<{ playerId: string; score: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      formatted.push({
        playerId: results[i],
        score: parseFloat(results[i + 1]),
      });
    }
    return formatted;
  }

  /**
   * Limpia el leaderboard al finalizar la sesión del bar
   */
  async clearLeaderboard(sessionId: string): Promise<void> {
    await this.redisClient.del(`leaderboard:${sessionId}`);
  }
}
