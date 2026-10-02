import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const MAX_LIST_LIMIT = 100;
export const MAX_LIST_OFFSET = 100_000;

function parseQueryInteger(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return Number.isSafeInteger(value) ? value : Number.NaN;
  if (typeof value !== 'string' || !/^-?\d+$/.test(value.trim())) return Number.NaN;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
}

export class PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseQueryInteger(value))
  @IsInt()
  @Min(1)
  @Max(MAX_LIST_LIMIT)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => parseQueryInteger(value))
  @IsInt()
  @Min(0)
  @Max(MAX_LIST_OFFSET)
  offset?: number;
}
