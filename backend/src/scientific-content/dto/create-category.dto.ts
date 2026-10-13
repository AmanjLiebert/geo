import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  summary!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  description!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsUUID()
  imageMediaAssetId?: string;
}
