import { IsNotEmpty, IsDateString, IsOptional, IsEnum } from 'class-validator';

export enum DatePreset {
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
  CUSTOM = 'CUSTOM',
}

export class AnalyticsQueryDto {
  @IsEnum(DatePreset)
  @IsNotEmpty()
  preset: DatePreset;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
