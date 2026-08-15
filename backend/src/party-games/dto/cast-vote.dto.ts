import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CastPartyVoteDto {
  @IsString()
  @IsNotEmpty({ message: 'El roundId es requerido.' })
  roundId: string;

  @IsString()
  @IsNotEmpty({ message: 'El targetId (submissionId o playerId) es requerido.' })
  targetId: string;

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsString()
  token?: string;
}
