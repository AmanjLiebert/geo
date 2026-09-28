import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class ReferenceAuthorDto {
  @IsString()
  @MaxLength(240)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  orcid?: string;
}

export class CreateReferenceDto {
  @IsIn(['journal', 'book', 'map', 'institution', 'catalogue', 'dataset', 'website', 'research'])
  sourceType!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReferenceAuthorDto)
  authors!: ReferenceAuthorDto[];

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  publication?: string;

  @IsOptional()
  @IsInt()
  @Min(1500)
  @Max(2200)
  publicationYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  identifier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  pagesOrFigure?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rightsStatement?: string;

  @IsOptional()
  @IsUUID()
  researchPublicationId?: string;
}

export class AddEvidenceDto {
  @IsString()
  referenceId!: string;

  @IsString()
  @MaxLength(60)
  evidenceKind!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  claimKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fieldKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
