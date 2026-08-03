import { IsString, IsIn } from 'class-validator';

export class SetModeDto {
  @IsString()
  sessionId: string;

  @IsString()
  @IsIn(['MATCH', 'CARDS'])
  mode: 'MATCH' | 'CARDS';
}
