import { IsIn, IsOptional } from 'class-validator';

export class RecordListQueryDto {
  @IsOptional()
  limit?: string;

  @IsOptional()
  offset?: string;

  @IsOptional()
  @IsIn(['unclassified_draft', 'draft', 'in_review', 'published', 'archived'])
  status?: string;
}
