import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

function normalizeOptionalSlug(value: unknown): unknown {
  if (value === '') return null;
  return value;
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
