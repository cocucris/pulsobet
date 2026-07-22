import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WsJwtGuard } from './ws-jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true, // Hace que JwtService esté disponible en todo el monorepo backend
      secret: process.env.JWT_SECRET || 'un_secreto_ultra_seguro_para_pulsobet_2026',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, WsJwtGuard],
  exports: [AuthService, WsJwtGuard],
})
export class AuthModule {}
