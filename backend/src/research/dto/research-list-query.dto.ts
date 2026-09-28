import { IsIn, IsOptional } from 'class-validator';

export class ResearchListQueryDto {
  @IsOptional()
  limit?: string;

  @IsOptional()
  offset?: string;

  @IsOptional()
  @IsIn(['draft', 'in_review', 'published', 'archived'])
  status?: string;
}
