import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ResearchListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['draft', 'in_review', 'published', 'archived'])
  status?: string;
}
