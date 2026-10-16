import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

export interface EditableRecordContext {
  id: string;
  status: string;
  categoryId: string | null;
  recordTypeId: string | null;
  templateVersionId: string | null;
  template_version_id: string | null;
}

export async function assertCategoryBranchActive(
  executor: DataSource | EntityManager,
  categoryId: string | null | undefined,
): Promise<void> {
  if (!categoryId) return;
  const activeCategories = (await executor.query(
    `SELECT c.id FROM categories c
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE c.id = $1 AND c.status = 'active'
       AND (p.id IS NULL OR p.status = 'active')`,
    [categoryId],
  )) as unknown as Array<{ id: string }>;
  if (!activeCategories[0]) {
    throw new ConflictException('The category for this record is archived or inactive.');
  }
}

export async function assertRecordEditable(
  executor: DataSource | EntityManager,
  recordId: string,
  options: { lock?: boolean } = {},
): Promise<EditableRecordContext> {
  const lockClause = options.lock ? ' FOR UPDATE' : '';
  const rows = (await executor.query(
    `SELECT id, status, category_id, record_type_id, template_version_id
     FROM scientific_records WHERE id = $1${lockClause}`,
    [recordId],
  )) as unknown as Array<{
    id: string;
    status: string;
    category_id: string | null;
    record_type_id: string | null;
    template_version_id: string | null;
  }>;

  if (!rows[0]) {
    throw new NotFoundException('Scientific record not found.');
  }

  const record = rows[0];

  if (record.status === 'archived') {
    throw new ConflictException('Restore the record before editing it.');
  }
  if (record.status === 'published') {
    throw new ConflictException('This record cannot be edited in its current state.');
  }

  await assertCategoryBranchActive(executor, record.category_id);

  return {
    id: record.id,
    status: record.status,
    categoryId: record.category_id,
    recordTypeId: record.record_type_id,
    templateVersionId: record.template_version_id,
    template_version_id: record.template_version_id,
  };
}
