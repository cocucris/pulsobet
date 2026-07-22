import { Controller, Post, Body, HttpCode, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginStaffDto } from './dto/login-staff.dto';
import { RegisterPlayerDto } from './dto/register-player.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/staff/login
   * Endpoint para el inicio de sesión del personal del bar
   */
  @Post('staff/login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async loginStaff(@Body() loginStaffDto: LoginStaffDto) {
    return this.authService.loginStaff(loginStaffDto.email, loginStaffDto.password);
  }

  /**
   * POST /auth/player/register
   * Endpoint express para clientes que escanean el código QR en la mesa
   */
  @Post('player/register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async registerPlayer(@Body() registerPlayerDto: RegisterPlayerDto) {
    return this.authService.registerAnonymousPlayer(
      registerPlayerDto.sessionId,
      registerPlayerDto.nickname,
      registerPlayerDto.tableNumber,
    );
  }
}
