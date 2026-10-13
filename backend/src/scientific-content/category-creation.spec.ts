import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ScientificStructureService } from './scientific-structure.service';

const input = {
  title: 'Field Sites',
  summary: 'Documented field locations',
  description: 'A collection of geological field observations.',
};

function harness(parent?: { id: string; parent_id: string | null }) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const query = vi.fn((sql: string, params: unknown[] = []): Promise<unknown[]> => {
    queries.push({ sql, params });
    if (sql.includes('SELECT id, parent_id FROM categories'))
      return Promise.resolve(parent ? [parent] : []);
    if (sql.includes('SELECT id FROM media_assets')) return Promise.resolve([{ id: 'image' }]);
    if (sql.includes('SELECT rt.id AS type_id'))
      return Promise.resolve([{ type_id: 'type', version_id: 'version' }]);
    return Promise.resolve([]);
  });
  const dataSource = {
    transaction: (work: (manager: { query: typeof query }) => Promise<void>) => work({ query }),
  } as unknown as DataSource;
  return { service: new ScientificStructureService(dataSource), queries };
}

describe('dashboard category creation', () => {
  it('creates an unpublished root with the general type and an audit event', async () => {
    const { service, queries } = harness();
    const result = await service.createCategory('teacher-id', input);
    expect(result.publicationStatus).toBe('draft');
    expect(result.parentId).toBeNull();
    expect(queries.some(({ sql }) => sql.includes('INSERT INTO category_record_types'))).toBe(true);
    expect(queries.some(({ sql }) => sql.includes('INSERT INTO content_audit_events'))).toBe(true);
    expect(queries.find(({ sql }) => sql.includes('INSERT INTO categories'))?.sql).toContain(
      "'draft'",
    );
  });

  it('accepts one subcategory but rejects a third level', async () => {
    const root = harness({ id: 'root', parent_id: null });
    expect(
      (await root.service.createCategory('teacher-id', { ...input, parentId: 'root' })).parentId,
    ).toBe('root');
    const child = harness({ id: 'child', parent_id: 'root' });
    await expect(
      child.service.createCategory('teacher-id', { ...input, parentId: 'child' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(child.queries.some(({ sql }) => sql.includes('INSERT INTO categories'))).toBe(false);
  });

  it('rejects blank content after trimming', async () => {
    const { service, queries } = harness();
    await expect(
      service.createCategory('teacher-id', { ...input, title: '  ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(queries).toHaveLength(0);
  });
});
