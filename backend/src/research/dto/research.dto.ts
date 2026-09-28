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

export class CreateResearchDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsInt()
  @Min(1500)
  @Max(2200)
  publicationYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  doi?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  rightsStatement!: string;
}

export class UpsertResearchTranslationDto {
  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  abstract?: string;
}

export class AddContributorDto {
  @IsString()
  @MaxLength(240)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  orcid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  organization?: string;

  @IsString()
  @MaxLength(80)
  contributionRole!: string;
}

export class AttachResearchMediaDto {
  @IsUUID()
  mediaAssetId!: string;

  @IsString()
  @MaxLength(40)
  purpose!: string;
}
