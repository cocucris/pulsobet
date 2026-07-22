import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global() // Hacemos que la conexión a caché esté disponible en todo el backend
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
