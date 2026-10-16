import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ScientificStructureService } from './scientific-structure.service';

function harness(recordCount = '2') {
  const queries: string[] = [];
  const query = vi.fn((sql: string, params?: unknown[]) => {
    void params;
    queries.push(sql);
    if (sql.includes('SELECT * FROM branch ORDER BY depth'))
      return [
        { id: 'child', parent_id: 'root', depth: 1, status: 'active' },
        { id: 'root', parent_id: null, depth: 0, status: 'active' },
      ];
    if (sql.includes('count(*)::text AS count')) return [{ count: recordCount }];
    return [];
  });
  const source = {
    transaction: (work: (manager: { query: typeof query }) => Promise<unknown>) => work({ query }),
  } as unknown as DataSource;
  return { service: new ScientificStructureService(source), queries, query };
}

describe('category subtree archive', () => {
  it('checks confirmed impact, archives children first, and preserves records', async () => {
    const { service, queries, query } = harness();
    await expect(
      service.setCategoryArchive('teacher', 'root', false, { categoryCount: 2, recordCount: 2 }),
    ).resolves.toEqual({ categoryCount: 2, recordCount: 2, status: 'archived' });
    expect(
      query.mock.calls
        .filter(([sql]) => sql.startsWith('UPDATE categories'))
        .map(([, params]) => params?.[0]),
    ).toEqual(['child', 'root']);
    expect(queries.some((sql) => sql.includes('DELETE FROM'))).toBe(false);
    expect(queries.some((sql) => sql.includes('UPDATE scientific_records'))).toBe(false);
  });

  it('rejects stale confirmation without changing categories', async () => {
    const { service, queries } = harness('3');
    await expect(
      service.setCategoryArchive('teacher', 'root', false, { categoryCount: 2, recordCount: 2 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(queries.some((sql) => sql.startsWith('UPDATE categories'))).toBe(false);
  });
});
