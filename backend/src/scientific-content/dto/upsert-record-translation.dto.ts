import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ContentTranslationStatus } from '../scientific-content.types';

const localePattern = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

export class UpsertRecordTranslationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @Matches(localePattern)
  sourceLocale?: string | null;

  @IsOptional()
  @IsEnum(ContentTranslationStatus)
  status?: ContentTranslationStatus;
}

export { localePattern };
