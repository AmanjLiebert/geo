import { IsInt, Min } from 'class-validator';

export class CategoryArchiveDto {
  @IsInt()
  @Min(1)
  categoryCount!: number;

  @IsInt()
  @Min(0)
  recordCount!: number;
}
