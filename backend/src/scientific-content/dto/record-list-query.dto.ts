import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CATEGORY_SLUG_MAX_LENGTH = 120;

function normalizeSearchQuery(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class RecordListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['unclassified_draft', 'draft', 'in_review', 'published', 'archived'])
  status?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeSearchQuery(value as unknown))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  query?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeSearchQuery(value as unknown))
  @IsString()
  @MaxLength(CATEGORY_SLUG_MAX_LENGTH)
  @Matches(CATEGORY_SLUG_PATTERN)
  category?: string;
}
