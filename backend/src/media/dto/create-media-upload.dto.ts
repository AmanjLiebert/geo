import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateMediaUploadDto {
  @IsString()
  @MaxLength(300)
  filename!: string;

  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm'])
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
  @IsUUID()
  mediaAssetId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  purpose!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  caption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  position?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateRecordAttachmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  purpose?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  caption?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string | null;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  rightsStatement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  credit?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  licence?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  position?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class ReorderRecordAttachmentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  mediaAssetIds!: string[];
}
