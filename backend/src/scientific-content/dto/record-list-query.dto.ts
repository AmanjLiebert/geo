import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

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
}
