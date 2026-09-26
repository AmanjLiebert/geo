import { IsObject, IsUUID } from 'class-validator';

export class TemplateMigrationPreviewDto {
  @IsUUID()
  fromVersionId!: string;

  @IsUUID()
  toVersionId!: string;

  @IsObject()
  mapping!: Record<string, string | null>;
}
