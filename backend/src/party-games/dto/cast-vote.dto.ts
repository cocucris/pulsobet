import { IsString, IsNotEmpty } from 'class-validator';

export class CastPartyVoteDto {
  @IsString()
  @IsNotEmpty({ message: 'El roundId es requerido.' })
  roundId: string;

  @IsString()
  @IsNotEmpty({ message: 'El targetId (submissionId o playerId) es requerido.' })
  targetId: string;
}
