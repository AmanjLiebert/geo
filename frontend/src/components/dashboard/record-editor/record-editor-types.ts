import type {
  ActiveScientificTemplate,
  CategoryRecordType,
  FieldDataType,
  ScientificRecordDetail,
  StructureCategory,
  TemplateField,
} from "@/lib/dashboard-api";

export type RecordEditorMode = "create" | "edit";

export type CategoryTreeNode = {
  category: StructureCategory;
  children: StructureCategory[];
  allowsDirectRecords: boolean;
  hasChildren: boolean;
};

export type StructureSelection = {
  /** Top-level root category selected by user */
  parentCategoryId: string | null;
  /** Effective category where records will attach (either root if direct, or subcategory) */
  categoryId: string | null;
  /** Direct attachment chosen when root allows both direct and child */
  isDirectAttachment: boolean;
  /** Selected record type ID */
  recordTypeId: string | null;
};

export type FieldValidationIssue = {
  field: string;
  message: string;
};

export type FormAttributeValues = Record<string, unknown>;

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type {
  ActiveScientificTemplate,
  CategoryRecordType,
  FieldDataType,
  ScientificRecordDetail,
  StructureCategory,
  TemplateField,
};
