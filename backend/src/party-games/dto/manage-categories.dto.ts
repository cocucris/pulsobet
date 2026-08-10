import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class ManageCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la categoría es requerido.' })
  name: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
