import { IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateRecordDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  recordTypeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
