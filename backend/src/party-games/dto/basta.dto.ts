import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class BastaDto {
  @IsString()
  @IsNotEmpty({ message: 'El roundId es requerido.' })
  roundId: string;

  @IsObject({ message: 'Las respuestas deben ser un objeto con categoría: texto.' })
  answers: Record<string, string>; // { "País": "Paraguay", "Animal": "Pato" }

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsString()
  token?: string;
}
