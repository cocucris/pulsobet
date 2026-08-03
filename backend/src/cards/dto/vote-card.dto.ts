import { IsString, IsIn } from 'class-validator';

export class VoteCardDto {
  @IsString()
  playerId: string;

  @IsString()
  @IsIn(['INTERESTED', 'INTRODUCE', 'PASS'])
  choice: 'INTERESTED' | 'INTRODUCE' | 'PASS';
}
