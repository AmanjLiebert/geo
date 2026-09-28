import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMapLayerDto {
  @IsString()
  @MaxLength(100)
  stableKey!: string;

  @IsString()
  @MaxLength(240)
  title!: string;

  @IsString()
  @MaxLength(2000)
  source!: string;

  @IsString()
  @MaxLength(2000)
  licence!: string;

  @IsString()
  @MaxLength(80)
  format!: string;

  @IsString()
  @MaxLength(100)
  coordinateReferenceSystem!: string;

  @IsString()
  @MaxLength(120)
  scaleOrResolution!: string;

  @IsIn(['public', 'approximate', 'restricted', 'embargoed'])
  visibility!: string;

  @IsOptional()
  @IsString()
  versionDate?: string;
}
