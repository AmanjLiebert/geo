import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLocationDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  label?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  exactLatitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  exactLongitude!: number;

  @IsIn(['public', 'approximate', 'restricted', 'embargoed'])
  visibility!: 'public' | 'approximate' | 'restricted' | 'embargoed';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  publicLatitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  publicLongitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(1_000_000)
  publicPrecisionMetres?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  regionLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  sensitivityReason?: string;

  @IsOptional()
  @IsDateString()
  embargoUntil?: string;
}
