import { IsNotEmpty, IsString, IsInt, IsOptional, IsObject } from 'class-validator';

export class SportsApiWebhookDto {
  @IsInt()
  @IsNotEmpty()
  fixtureId: number; // Mapea con nuestro apiFootballId en la tabla Match

  @IsString()
  @IsNotEmpty()
  event: 'GOAL' | 'CARD' | 'PERIOD_END' | 'MATCH_END';

  @IsObject()
  @IsNotEmpty()
  details: {
    team: 'HOME' | 'AWAY';
    player?: string;
    minute: number;
    extraDetail?: string; // Ej: "Red" o "Yellow" para tarjetas
  };
}
