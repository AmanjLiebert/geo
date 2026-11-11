import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { localePattern } from './upsert-record-translation.dto';

export class LocaleQueryDto {
  @IsOptional()
  @IsString()
  @Matches(localePattern)
  locale = 'en';
}

export class ActiveTemplateQueryDto extends LocaleQueryDto {
  @IsUUID()
  categoryId!: string;

  @IsUUID()
  recordTypeId!: string;
}
