import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class RedeemRewardDto {
  @IsString()
  @IsNotEmpty({ message: 'El código de canje es requerido.' })
  @Length(4, 4, { message: 'El código debe tener exactamente 4 caracteres.' })
  @Matches(/^[A-Z0-9]+$/, { message: 'El código solo debe contener letras mayúsculas y números.' })
  claimCode: string;
}
