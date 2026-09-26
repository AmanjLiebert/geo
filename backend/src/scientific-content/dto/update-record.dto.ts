import { IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class UpdateRecordDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  recordTypeId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string | null;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
