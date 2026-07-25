import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OptionTextDto {
  @IsNumber()
  id: number;

  @IsString()
  text: string;
}

export class UpdateQuestionTextDto {
  @IsString()
  @IsOptional()
  questionText?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OptionTextDto)
  options?: OptionTextDto[];
}
