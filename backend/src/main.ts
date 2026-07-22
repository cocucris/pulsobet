import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS global para permitir cualquier origen en producción (Vercel, localhost, etc.)
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const rawPort = process.env.PORT || 3001;
  const port = typeof rawPort === 'string' ? parseInt(rawPort, 10) : rawPort;

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend de PulsoBet escuchando en http://0.0.0.0:${port}`);
}
bootstrap();
