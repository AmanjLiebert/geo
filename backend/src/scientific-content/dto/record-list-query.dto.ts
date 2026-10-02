import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class RecordListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['unclassified_draft', 'draft', 'in_review', 'published', 'archived'])
  status?: string;
}
