import { IsNotEmpty, IsString, IsArray, IsInt, Min, ArrayMinSize, IsOptional, IsBoolean } from 'class-validator';

export class CreateManualQuestionDto {
  @IsString()
  @IsNotEmpty({ message: 'El ID del bar es requerido.' })
  barId: string;

  @IsString()
  @IsNotEmpty({ message: 'El texto de la trivia es requerido.' })
  questionText: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'Deben existir al menos 2 opciones de respuesta.' })
  options: Array<{ id: number; text: string }>;

  @IsInt()
  @Min(5)
  expiresInSeconds: number;

  @IsOptional()
  @IsInt()
  @Min(10, { message: 'Los puntos de la trivia deben ser al menos 10.' })
  pointsReward?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isFlash?: boolean;
}
