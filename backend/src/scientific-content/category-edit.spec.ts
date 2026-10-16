import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ScientificStructureService } from './scientific-structure.service';

const draft = {
  title: 'Updated fossils',
  summary: 'Updated subject summary',
  description: 'Updated description of the subject.',
  imageMediaAssetId: null,
  position: 3,
};

function harness(found = true) {
  const queries: string[] = [];
  const query = vi.fn((sql: string): Promise<unknown[]> => {
    queries.push(sql);
    if (sql.includes('SELECT id, image_media_asset_id FROM categories'))
      return Promise.resolve(found ? [{ id: 'category', image_media_asset_id: null }] : []);
    return Promise.resolve([]);
  });
  const source = {
    transaction: (work: (manager: { query: typeof query }) => Promise<unknown>) => work({ query }),
  } as unknown as DataSource;
  return { service: new ScientificStructureService(source), queries };
}

describe('category draft editing', () => {
  it('writes a private revision and audit event without changing public category rows', async () => {
    const { service, queries } = harness();
    const result = await service.editCategory('teacher', 'category', draft);
    expect(result).toEqual({ id: 'category', publicationStatus: 'draft', revisionSaved: true });
    expect(queries.some((sql) => sql.includes('INSERT INTO category_draft_revisions'))).toBe(true);
    expect(queries.some((sql) => sql.includes('INSERT INTO category_draft_revision_history'))).toBe(
      true,
    );
    expect(queries.some((sql) => sql.includes('category.draft_edited'))).toBe(true);
    expect(queries.some((sql) => sql.includes('UPDATE categories'))).toBe(false);
    expect(queries.some((sql) => sql.includes('UPDATE category_translations'))).toBe(false);
  });

  it('rejects a missing category without creating a revision', async () => {
    const { service, queries } = harness(false);
    await expect(service.editCategory('teacher', 'missing', draft)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(queries.some((sql) => sql.includes('INSERT INTO category_draft_revisions'))).toBe(false);
  });
});
