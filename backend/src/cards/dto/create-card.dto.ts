import { IsString, IsOptional, IsInt, IsArray, Min, Max, MaxLength, IsIn } from 'class-validator';

export class CreateCardDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  tableNumber?: string;

  @IsString()
  @MaxLength(30)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(99)
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  position?: string;

  @IsOptional()
  @IsString()
  @IsIn(['DERECHA', 'IZQUIERDA', 'AMBAS'])
  strongFoot?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  fitness?: number;

  @IsArray()
  skills: { key: string; label: string; icon: string; stars: number }[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  objective?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
