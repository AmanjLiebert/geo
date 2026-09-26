import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateStructureRequestDto {
  @IsOptional()
  @IsUUID()
  parentCategoryId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  proposedCategoryName?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  proposedRecordTypeName?: string | null;

  @IsString()
  @MinLength(10)
  @MaxLength(4_000)
  reason!: string;
}
