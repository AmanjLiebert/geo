import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class PublicLocaleQueryDto {
  @IsOptional()
  @IsIn(['en'])
  locale?: 'en';
}

export class PublicCategoryListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['en'])
  locale?: 'en';
}

export class PublicRecordListQueryDto extends PublicCategoryListQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeString(value as unknown))
  @IsString()
  @MaxLength(120)
  @Matches(PUBLIC_SLUG_PATTERN)
  category?: string;
}

export function isPublicSlug(value: string): boolean {
  return value.length <= 120 && PUBLIC_SLUG_PATTERN.test(value);
}
