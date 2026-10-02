import { describe, expect, it, vi } from 'vitest';
import { DataSource } from 'typeorm';
import { RecordsService } from './records.service';
import { ScientificTrustService } from '../publishing/scientific-trust.service';

describe('RecordsService.list', () => {
  it('uses an explicit minimal projection in SQL and never selects r.*', async () => {
    let capturedListSql = '';
    const queryMock = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve([{ total: '1' }]);
      }
      capturedListSql = sql;
      return Promise.resolve([
        {
          id: 'rec-1',
          status: 'published',
          is_classified: true,
          updated_at: new Date('2026-02-01T10:00:00Z'),
          title: 'Bekhme Limestone',
        },
      ]);
    });

    const dataSource = { query: queryMock } as unknown as DataSource;
    const service = new RecordsService(dataSource, {} as ScientificTrustService);

    const result = await service.list(20, 0);

    // Verify SQL does not select r.* or SELECT *
    expect(capturedListSql).not.toMatch(/SELECT\s+r\.\*/i);
    expect(capturedListSql).not.toMatch(/SELECT\s+\*/i);

    // Verify SQL explicitly projects required columns
    expect(capturedListSql).toContain('r.id');
    expect(capturedListSql).toContain('r.status');
    expect(capturedListSql).toContain('is_classified');
    expect(capturedListSql).toContain('r.updated_at');
    expect(capturedListSql).toContain('t.title');

    expect(result.items).toHaveLength(1);
  });

  it('returns items containing exactly id, title, status, isClassified, updatedAt', async () => {
    const updatedAtDate = new Date('2026-03-15T08:30:00.000Z');
    const queryMock = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve([{ total: '2' }]);
      }
      return Promise.resolve([
        {
          id: 'rec-classified',
          status: 'published',
          is_classified: true,
          updated_at: updatedAtDate,
          title: 'Classified Formation',
        },
        {
          id: 'rec-unclassified',
          status: 'unclassified_draft',
          is_classified: false,
          updated_at: updatedAtDate,
          title: null,
        },
      ]);
    });

    const dataSource = { query: queryMock } as unknown as DataSource;
    const service = new RecordsService(dataSource, {} as ScientificTrustService);

    const result = await service.list(10, 0);
    expect(result.items).toHaveLength(2);

    const [firstItem, secondItem] = result.items;
    expect(firstItem).toBeDefined();
    expect(secondItem).toBeDefined();
    if (!firstItem || !secondItem) throw new Error('Expected items');

    expect(Object.keys(firstItem).sort()).toEqual(
      ['id', 'isClassified', 'status', 'title', 'updatedAt'].sort(),
    );
    expect(firstItem).toEqual({
      id: 'rec-classified',
      title: 'Classified Formation',
      status: 'published',
      isClassified: true,
      updatedAt: '2026-03-15T08:30:00.000Z',
    });

    expect(Object.keys(secondItem).sort()).toEqual(
      ['id', 'isClassified', 'status', 'title', 'updatedAt'].sort(),
    );
    expect(secondItem).toEqual({
      id: 'rec-unclassified',
      title: null,
      status: 'unclassified_draft',
      isClassified: false,
      updatedAt: '2026-03-15T08:30:00.000Z',
    });
  });

  it('ensures sensitive, internal, and unnecessary fields are absent from returned items', async () => {
    const queryMock = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve([{ total: '1' }]);
      }
      return Promise.resolve([
        {
          id: 'rec-secure',
          status: 'draft',
          is_classified: false,
          updated_at: new Date('2026-01-01T00:00:00Z'),
          title: 'Provisional Sample',
        },
      ]);
    });

    const dataSource = { query: queryMock } as unknown as DataSource;
    const service = new RecordsService(dataSource, {} as ScientificTrustService);

    const result = await service.list(20, 0);
    const [item] = result.items;
    expect(item).toBeDefined();
    if (!item) throw new Error('Expected item');

    // Explicitly verify sensitive / unnecessary fields are absent
    expect(item).not.toHaveProperty('attributes');
    expect(item).not.toHaveProperty('ownerUserId');
    expect(item).not.toHaveProperty('owner_user_id');
    expect(item).not.toHaveProperty('stableId');
    expect(item).not.toHaveProperty('stable_id');
    expect(item).not.toHaveProperty('categoryId');
    expect(item).not.toHaveProperty('category_id');
    expect(item).not.toHaveProperty('recordTypeId');
    expect(item).not.toHaveProperty('record_type_id');
    expect(item).not.toHaveProperty('templateVersionId');
    expect(item).not.toHaveProperty('template_version_id');
    expect(item).not.toHaveProperty('createdAt');
    expect(item).not.toHaveProperty('created_at');
    expect(item).not.toHaveProperty('slug');
  });

  it('filters by status using parameterized queries for both data and count', async () => {
    const capturedCalls: Array<{ sql: string; params: unknown[] }> = [];
    const queryMock = vi.fn().mockImplementation((sql: string, params: unknown[]) => {
      capturedCalls.push({ sql, params });
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve([{ total: '5' }]);
      }
      return Promise.resolve([
        {
          id: 'rec-param',
          status: 'in_review',
          is_classified: true,
          updated_at: new Date('2026-04-10T12:00:00Z'),
          title: 'Review Candidate',
        },
      ]);
    });

    const dataSource = { query: queryMock } as unknown as DataSource;
    const service = new RecordsService(dataSource, {} as ScientificTrustService);

    const result = await service.list(25, 10, 'in_review');

    expect(capturedCalls).toHaveLength(2);

    const [listCall, countCall] = capturedCalls;
    expect(listCall).toBeDefined();
    expect(countCall).toBeDefined();
    if (!listCall || !countCall) throw new Error('Expected captured calls');

    // Main records query
    expect(listCall.sql).toContain('WHERE r.status = $3');
    expect(listCall.sql).not.toContain("'in_review'");
    expect(listCall.params).toEqual([25, 10, 'in_review']);

    // Count query
    expect(countCall.sql).toContain('WHERE r.status = $1');
    expect(countCall.sql).not.toContain("'in_review'");
    expect(countCall.params).toEqual(['in_review']);

    expect(result.total).toBe(5);
    expect(result.limit).toBe(25);
    expect(result.offset).toBe(10);
  });

  it('omits status filter parameter when status is undefined', async () => {
    const capturedCalls: Array<{ sql: string; params: unknown[] }> = [];
    const queryMock = vi.fn().mockImplementation((sql: string, params: unknown[]) => {
      capturedCalls.push({ sql, params });
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve([{ total: '0' }]);
      }
      return Promise.resolve([]);
    });

    const dataSource = { query: queryMock } as unknown as DataSource;
    const service = new RecordsService(dataSource, {} as ScientificTrustService);

    await service.list(20, 0);

    expect(capturedCalls).toHaveLength(2);

    const [listCall, countCall] = capturedCalls;
    expect(listCall).toBeDefined();
    expect(countCall).toBeDefined();
    if (!listCall || !countCall) throw new Error('Expected captured calls');

    expect(listCall.sql).not.toContain('WHERE r.status');
    expect(listCall.params).toEqual([20, 0]);

    expect(countCall.sql).not.toContain('WHERE r.status');
    expect(countCall.params).toEqual([]);
  });

  it('returns valid empty state when database contains zero records', async () => {
    const queryMock = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve([{ total: '0' }]);
      }
      return Promise.resolve([]);
    });

    const dataSource = { query: queryMock } as unknown as DataSource;
    const service = new RecordsService(dataSource, {} as ScientificTrustService);

    const result = await service.list(50, 0);

    expect(result).toEqual({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });
  });

  it('clamps limit to 1..100 and clamps negative offset to 0', async () => {
    const queryMock = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve([{ total: '0' }]);
      }
      return Promise.resolve([]);
    });

    const dataSource = { query: queryMock } as unknown as DataSource;
    const service = new RecordsService(dataSource, {} as ScientificTrustService);

    const result = await service.list(500, -20);

    expect(result.limit).toBe(100);
    expect(result.offset).toBe(0);

    const firstCallArgs = queryMock.mock.calls[0];
    expect(firstCallArgs?.[1]).toEqual([100, 0]);
  });
});

describe('RecordsService.update state enforcement and pinned template versions', () => {
  it('rejects editing published records with ConflictException', async () => {
    const queryMock = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('SELECT * FROM scientific_records')) {
        return Promise.resolve([
          {
            id: 'rec-pub',
            status: 'published',
            category_id: 'cat-1',
            record_type_id: 'rt-1',
            template_version_id: 'tv-1',
            attributes: {},
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const dataSource = {
      transaction: vi.fn((cb: (manager: { query: typeof queryMock }) => Promise<unknown>) =>
        cb({ query: queryMock }),
      ),
      query: queryMock,
    } as unknown as DataSource;
    const service = new RecordsService(dataSource, {} as ScientificTrustService);

    await expect(service.update('actor-1', 'rec-pub', { slug: 'new-slug' })).rejects.toThrow(
      /Published records require the Phase 4 revision workflow/,
    );
  });

  it('rejects editing archived records with ConflictException', async () => {
    const queryMock = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('SELECT * FROM scientific_records')) {
        return Promise.resolve([
          {
            id: 'rec-arc',
            status: 'archived',
            category_id: 'cat-1',
            record_type_id: 'rt-1',
            template_version_id: 'tv-1',
            attributes: {},
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const dataSource = {
      transaction: vi.fn((cb: (manager: { query: typeof queryMock }) => Promise<unknown>) =>
        cb({ query: queryMock }),
      ),
      query: queryMock,
    } as unknown as DataSource;
    const service = new RecordsService(dataSource, {} as ScientificTrustService);

    await expect(service.update('actor-1', 'rec-arc', { slug: 'new-slug' })).rejects.toThrow(
      /Restore the record before editing it/,
    );
  });

  it('preserves pinned template version when editing existing classified record', async () => {
    let capturedUpdateSql = '';
    let capturedParams: unknown[] = [];

    const queryMock = vi.fn().mockImplementation((sql: string, params: unknown[]) => {
      if (sql.includes('SELECT * FROM scientific_records')) {
        return Promise.resolve([
          {
            id: 'rec-pinned',
            status: 'draft',
            category_id: 'cat-orig',
            record_type_id: 'rt-orig',
            template_version_id: 'tv-pinned-version-1',
            attributes: { old_field: 'existing' },
            slug: 'original-slug',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);
      }
      if (sql.includes('SELECT stable_key, data_type')) {
        // Loads fields from pinned template version
        expect(params?.[0]).toBe('tv-pinned-version-1');
        return Promise.resolve([
          {
            stable_key: 'old_field',
            data_type: 'text',
            required: false,
            validation: {},
            status: 'active',
          },
        ]);
      }
      if (sql.includes('UPDATE scientific_records')) {
        capturedUpdateSql = sql;
        capturedParams = params;
        return Promise.resolve([]);
      }
      if (sql.includes('record_translations')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    const dataSource = {
      transaction: vi.fn((cb: (manager: { query: typeof queryMock }) => Promise<unknown>) =>
        cb({ query: queryMock }),
      ),
      query: queryMock,
    } as unknown as DataSource;
    const service = new RecordsService(dataSource, {} as ScientificTrustService);

    await service.update('actor-1', 'rec-pinned', {
      attributes: { old_field: 'updated-val' },
    });

    expect(capturedUpdateSql).toContain('template_version_id = $6');
    // Parameter 6 is template_version_id, should stay pinned to tv-pinned-version-1
    expect(capturedParams[5]).toBe('tv-pinned-version-1');
  });

  it('classifies an unclassified draft to draft status when classification is provided', async () => {
    let capturedUpdateSql = '';
    let capturedParams: unknown[] = [];

    const queryMock = vi.fn().mockImplementation((sql: string, params: unknown[]) => {
      if (sql.includes('SELECT * FROM scientific_records')) {
        return Promise.resolve([
          {
            id: 'rec-unclass',
            status: 'unclassified_draft',
            category_id: null,
            record_type_id: null,
            template_version_id: null,
            attributes: {},
            slug: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);
      }
      if (sql.includes('category_record_types')) {
        return Promise.resolve([
          {
            category_id: 'cat-new',
            record_type_id: 'rt-new',
            template_version_id: 'tv-resolved-version',
          },
        ]);
      }
      if (sql.includes('SELECT stable_key, data_type')) {
        return Promise.resolve([
          {
            stable_key: 'rock_type',
            data_type: 'text',
            required: false,
            validation: {},
            status: 'active',
          },
        ]);
      }
      if (sql.includes('UPDATE scientific_records')) {
        capturedUpdateSql = sql;
        capturedParams = params;
        return Promise.resolve([]);
      }
      if (sql.includes('record_translations')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    const dataSource = {
      transaction: vi.fn((cb: (manager: { query: typeof queryMock }) => Promise<unknown>) =>
        cb({ query: queryMock }),
      ),
      query: queryMock,
    } as unknown as DataSource;
    const service = new RecordsService(dataSource, {} as ScientificTrustService);

    await service.update('actor-1', 'rec-unclass', {
      categoryId: 'cat-new',
      recordTypeId: 'rt-new',
      attributes: { rock_type: 'Limestone' },
    });

    expect(capturedUpdateSql).toContain('status = $3');
    // Parameter 3 should now be 'draft' (classified)
    expect(capturedParams[2]).toBe('draft');
    expect(capturedParams[3]).toBe('cat-new');
    expect(capturedParams[4]).toBe('rt-new');
    expect(capturedParams[5]).toBe('tv-resolved-version');
  });
});
