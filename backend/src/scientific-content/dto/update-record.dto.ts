import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

function normalizeOptionalSlug(value: unknown): string | null | undefined {
  if (value === '') return null;
  if (typeof value === 'string') return value;
  if (value === null) return null;
  return undefined;
}

export class UpdateRecordDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  recordTypeId?: string | null;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalSlug(value))
  @IsString()
  @MaxLength(160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string | null;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
