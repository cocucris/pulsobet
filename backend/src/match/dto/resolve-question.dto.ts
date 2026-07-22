import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class ResolveQuestionDto {
  @IsString()
  @IsNotEmpty({ message: 'El ID de la pregunta es requerido.' })
  questionId: string;

  @IsInt()
  @IsNotEmpty({ message: 'El ID de la opción ganadora es requerido.' })
  correctOptionId: number;
}
