import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS global para permitir cualquier origen en producción (Vercel, localhost, etc.)
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Fotos de fichas técnicas (Modo Fichaje): servir /uploads estático
  const uploadsDir = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads', 'cards');
  mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(join(uploadsDir, '..')));

  const rawPort = process.env.PORT || 3001;
  const port = typeof rawPort === 'string' ? parseInt(rawPort, 10) : rawPort;

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend de PulsoBet escuchando en http://0.0.0.0:${port}`);
}
bootstrap();
