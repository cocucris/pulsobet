import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class SubmitPartyInputDto {
  @IsString()
  @IsNotEmpty({ message: 'El roundId es requerido.' })
  roundId: string;

  @IsObject({ message: 'El contenido debe ser un objeto.' })
  content: Record<string, any>; // { text: string } para BLUFFING | { answers: Record<string,string> } para TUTI_FRUTI

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsString()
  token?: string;
}
