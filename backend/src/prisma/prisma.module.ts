import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Lo hace disponible en todo el backend sin volver a importarlo
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
