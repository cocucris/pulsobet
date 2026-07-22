import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class RegisterPlayerDto {
  @IsString()
  @IsNotEmpty({ message: 'El ID de la sesión es requerido' })
  sessionId: string;

  @IsString()
  @IsNotEmpty({ message: 'El apodo es requerido' })
  @Length(1, 20, { message: 'El apodo debe tener entre 1 y 20 caracteres' })
  nickname: string;

  @IsString()
  @IsOptional()
  tableNumber?: string;
}
