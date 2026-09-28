import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateMediaUploadDto {
  @IsString()
  @MaxLength(300)
  filename!: string;

  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(104_857_600)
  byteSize!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  rightsStatement!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  licence?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  credit?: string;
}

export class AttachMediaDto {
  @IsString()
  mediaAssetId!: string;

  @IsString()
  @MaxLength(40)
  purpose!: string;
}
