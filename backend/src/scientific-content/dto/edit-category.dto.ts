import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class EditCategoryDto {
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
  imageMediaAssetId?: string | null;

  @IsInt()
  @Min(0)
  @Max(100000)
  position!: number;
}
