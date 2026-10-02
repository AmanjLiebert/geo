import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const MAX_EDITORIAL_LIMIT = 100;
export const MAX_EDITORIAL_OFFSET = 100_000;

function parseQueryInteger(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : Number.NaN;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^-?\d+$/.test(trimmed)) {
      const parsed = Number(trimmed);
      return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
    }
    return Number.NaN;
  }
  return Number.NaN;
}

export class EditorialListQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseQueryInteger(value))
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must not be less than 1' })
  @Max(MAX_EDITORIAL_LIMIT, { message: `limit must not be greater than ${MAX_EDITORIAL_LIMIT}` })
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => parseQueryInteger(value))
  @IsInt({ message: 'offset must be an integer' })
  @Min(0, { message: 'offset must not be less than 0' })
  @Max(MAX_EDITORIAL_OFFSET, {
    message: `offset must not be greater than ${MAX_EDITORIAL_OFFSET}`,
  })
  offset?: number;

  @IsOptional()
  @IsIn(['draft', 'in_review', 'published', 'archived'])
  status?: string;
}
