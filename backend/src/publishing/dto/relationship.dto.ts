import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateRelationshipDto {
  @IsIn(['record', 'research'])
  targetType!: 'record' | 'research';

  @IsUUID()
  targetId!: string;

  @IsString()
  @MaxLength(80)
  relationshipType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
