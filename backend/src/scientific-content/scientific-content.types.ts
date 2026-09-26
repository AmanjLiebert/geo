export enum ScientificRecordStatus {
  UNCLASSIFIED_DRAFT = 'unclassified_draft',
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ContentTranslationStatus {
  DRAFT = 'draft',
  REVIEWED = 'reviewed',
}

export enum FieldDataType {
  TEXT = 'text',
  LONG_TEXT = 'long_text',
  INTEGER = 'integer',
  DECIMAL = 'decimal',
  BOOLEAN = 'boolean',
  DATE = 'date',
  CHOICE = 'choice',
  MULTI_CHOICE = 'multi_choice',
}

export interface FieldDefinition {
  stableKey: string;
  dataType: FieldDataType;
  required: boolean;
  validation: Record<string, unknown>;
  status: 'active' | 'deprecated';
}

export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}
