import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class UpdateMatchScoreDto {
  @IsString()
  matchId: string;

  @IsNumber()
  scoreHome: number;

  @IsNumber()
  scoreAway: number;

  @IsString()
  @IsOptional()
  homeTeam?: string;

  @IsString()
  @IsOptional()
  awayTeam?: string;

  @IsNumber()
  @IsOptional()
  currentMinute?: number;

  @IsString()
  @IsOptional()
  @IsIn(['LIVE', 'FINISHED', 'SCHEDULED'])
  status?: string;
}
