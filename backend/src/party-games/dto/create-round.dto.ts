import { IsString, IsNotEmpty, IsEnum, IsArray, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreatePartyRoundDto {
  @IsString()
  @IsNotEmpty({ message: 'El sessionId es requerido.' })
  sessionId: string;

  @IsEnum(['BLUFFING', 'TUTI_FRUTI', 'SOCIAL_JUDGMENT'], {
    message: 'El tipo de juego debe ser BLUFFING, TUTI_FRUTI o SOCIAL_JUDGMENT.',
  })
  gameType: 'BLUFFING' | 'TUTI_FRUTI' | 'SOCIAL_JUDGMENT';

  @IsString()
  @IsNotEmpty({ message: 'El prompt (premisa/letra/consigna) es requerido.' })
  prompt: string;

  @IsArray()
  @IsString({ each: true, message: 'Cada categoría debe ser un texto.' })
  @IsOptional()
  categories?: string[]; // Solo para TUTI_FRUTI, máx 4

  @IsString()
  @IsOptional()
  realAnswer?: string; // Para BLUFFING: la respuesta correcta / verdadera

  @IsNumber()
  @Min(15, { message: 'El tiempo límite mínimo es 15 segundos.' })
  @Max(300, { message: 'El tiempo límite máximo es 300 segundos.' })
  @IsOptional()
  timeLimit?: number;
}
