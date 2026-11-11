import { IsArray, IsEmail, IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateNewsDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  tags!: string[];

  @IsArray()
  @IsUrl({ require_protocol: true, protocols: ['https'] }, { each: true })
  sourceLinks!: string[];

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class UpsertNewsTranslationDto {
  @IsString()
  @MaxLength(300)
  headline!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @IsString()
  @MaxLength(100_000)
  body!: string;
}

export class CreateManagedPageDto {
  @IsIn(['about', 'mission', 'ownership', 'contact', 'privacy', 'terms'])
  pageType!: string;

  @IsOptional()
  @IsString()
  effectiveAt?: string;
}

export class UpsertPageTranslationDto {
  @IsString()
  @MaxLength(300)
  title!: string;

  @IsString()
  @MaxLength(100_000)
  body!: string;
}

export class UpsertOrganizationDto {
  @IsString()
  @MaxLength(300)
  legalName!: string;

  @IsString()
  @MaxLength(300)
  displayName!: string;

  @IsString()
  @MaxLength(5000)
  ownershipStatement!: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @IsArray()
  @IsUrl({ require_protocol: true, protocols: ['https'] }, { each: true })
  publicLinks!: string[];
}
