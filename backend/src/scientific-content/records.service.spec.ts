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
    expect(capturedListSql).toContain('category_t.name AS category_name');
    expect(capturedListSql).toContain('primary_image_media_asset_id');

    expect(result.items).toHaveLength(1);
  });

  it('returns only the compact dashboard record projection', async () => {
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
          category_name: 'Stratigraphic sections',
          primary_image_media_asset_id: 'media-1',
        },
        {
          id: 'rec-unclassified',
          status: 'unclassified_draft',
          is_classified: false,
          updated_at: updatedAtDate,
          title: null,
          category_name: null,
          primary_image_media_asset_id: null,
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
      [
        'categoryName',
        'id',
        'isClassified',
        'primaryImageMediaAssetId',
        'status',
        'title',
        'updatedAt',
      ].sort(),
    );
    expect(firstItem).toEqual({
      id: 'rec-classified',
      title: 'Classified Formation',
      status: 'published',
      isClassified: true,
      categoryName: 'Stratigraphic sections',
      primaryImageMediaAssetId: 'media-1',
      updatedAt: '2026-03-15T08:30:00.000Z',
    });

    expect(Object.keys(secondItem).sort()).toEqual(
      [
        'categoryName',
        'id',
        'isClassified',
        'primaryImageMediaAssetId',
        'status',
        'title',
        'updatedAt',
      ].sort(),
    );
    expect(secondItem).toEqual({
      id: 'rec-unclassified',
      title: null,
      status: 'unclassified_draft',
      isClassified: false,
      categoryName: null,
      primaryImageMediaAssetId: null,
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

  it('searches titles and category names with escaped parameterized input', async () => {
    const capturedCalls: Array<{ sql: string; params: unknown[] }> = [];
    const queryMock = vi.fn().mockImplementation((sql: string, params: unknown[]) => {
      capturedCalls.push({ sql, params });
      if (sql.includes('COUNT(*)')) return Promise.resolve([{ total: '0' }]);
      return Promise.resolve([]);
    });
    const dataSource = { query: queryMock } as unknown as DataSource;
    const service = new RecordsService(dataSource, {} as ScientificTrustService);

    await service.list(20, 0, 'draft', '50%_limestone');

    const [listCall, countCall] = capturedCalls;
    expect(listCall?.sql).toContain("COALESCE(t.title, '') ILIKE $4");
    expect(listCall?.sql).toContain("COALESCE(category_t.name, '') ILIKE $4");
    expect(listCall?.sql).not.toContain('50%_limestone');
    expect(listCall?.params).toEqual([20, 0, 'draft', '%50\\%\\_limestone%']);
    expect(countCall?.sql).toContain("COALESCE(t.title, '') ILIKE $2");
    expect(countCall?.params).toEqual(['draft', '%50\\%\\_limestone%']);
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
  it('returns a safe conflict when a draft identifier is already used', async () => {
    const dataSource = {
      transaction: vi.fn().mockRejectedValue({
        code: '23505',
        constraint: 'scientific_records_slug_key',
      }),
    } as unknown as DataSource;
    const service = new RecordsService(dataSource, {} as ScientificTrustService);

    await expect(service.create('actor-1', { slug: 'existing-record' })).rejects.toThrow(
      'That identifier is already in use. Choose another or leave it blank.',
    );
    await expect(
      service.update('actor-1', 'record-1', { slug: 'existing-record' }),
    ).rejects.toThrow('That identifier is already in use. Choose another or leave it blank.');
  });

  it('does not mislabel unrelated database failures as identifier conflicts', async () => {
    const databaseError = { code: '23505', constraint: 'another_unique_key' };
    const dataSource = {
      transaction: vi.fn().mockRejectedValue(databaseError),
    } as unknown as DataSource;
    const service = new RecordsService(dataSource, {} as ScientificTrustService);

    await expect(service.create('actor-1', {})).rejects.toBe(databaseError);
  });

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
      if (sql.includes('FROM categories c')) {
        return Promise.resolve([{ id: 'cat-orig' }]);
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

  it('clears an optional slug to null in database when slug: null is passed', async () => {
    let capturedParams: unknown[] = [];

    const queryMock = vi.fn().mockImplementation((sql: string, params: unknown[]) => {
      if (sql.includes('SELECT * FROM scientific_records')) {
        return Promise.resolve([
          {
            id: 'rec-slug-clear',
            status: 'draft',
            category_id: 'cat-1',
            record_type_id: 'rt-1',
            template_version_id: 'tv-1',
            slug: 'existing-slug-value',
            attributes: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);
      }
      if (sql.includes('FROM categories c')) {
        return Promise.resolve([{ id: 'cat-1' }]);
      }
      if (sql.includes('SELECT stable_key, data_type')) {
        return Promise.resolve([]);
      }
      if (sql.includes('UPDATE scientific_records')) {
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

    await service.update('actor-1', 'rec-slug-clear', {
      slug: null,
      attributes: {},
    });

    // Parameter 2 is slug, should be explicitly null
    expect(capturedParams[1]).toBeNull();
  });

  it('preserves existing slug when slug is omitted in update payload', async () => {
    let capturedParams: unknown[] = [];

    const queryMock = vi.fn().mockImplementation((sql: string, params: unknown[]) => {
      if (sql.includes('SELECT * FROM scientific_records')) {
        return Promise.resolve([
          {
            id: 'rec-slug-preserve',
            status: 'draft',
            category_id: 'cat-1',
            record_type_id: 'rt-1',
            template_version_id: 'tv-1',
            slug: 'existing-slug-preserved',
            attributes: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);
      }
      if (sql.includes('FROM categories c')) {
        return Promise.resolve([{ id: 'cat-1' }]);
      }
      if (sql.includes('SELECT stable_key, data_type')) {
        return Promise.resolve([]);
      }
      if (sql.includes('UPDATE scientific_records')) {
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

    await service.update('actor-1', 'rec-slug-preserve', {
      attributes: {},
    });

    // Parameter 2 is slug, should stay existing-slug-preserved
    expect(capturedParams[1]).toBe('existing-slug-preserved');
  });

  it('rejects reclassifying an already classified draft with BadRequestException', async () => {
    const queryMock = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('SELECT * FROM scientific_records')) {
        return Promise.resolve([
          {
            id: 'rec-already-classified',
            status: 'draft',
            category_id: 'cat-original',
            record_type_id: 'rt-original',
            template_version_id: 'tv-original',
            attributes: {},
            created_at: new Date(),
            updated_at: new Date(),
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

    await expect(
      service.update('actor-1', 'rec-already-classified', {
        categoryId: 'cat-new-forbidden',
        recordTypeId: 'rt-new-forbidden',
      }),
    ).rejects.toThrow(/Reclassifying an already classified record is not permitted/);
  });

  it('creates and reopens a General geological draft under a newly managed category', async () => {
    let insertedRecordParams: unknown[] = [];
    const recordId = 'rec-general-draft-1';

    const queryMock = vi.fn().mockImplementation((sql: string, params: unknown[]) => {
      if (sql.includes('SELECT crt.category_id, crt.record_type_id')) {
        return Promise.resolve([
          {
            category_id: 'cat-managed-1',
            record_type_id: 'rt-general',
            template_version_id: 'tv-general-v1',
          },
        ]);
      }
      if (sql.includes('SELECT stable_key, data_type FROM field_definitions')) {
        return Promise.resolve([]); // General geological record has no custom fields
      }
      if (sql.includes('INSERT INTO scientific_records')) {
        insertedRecordParams = params;
        return Promise.resolve([]);
      }
      if (sql.includes('SELECT * FROM scientific_records WHERE id = $1')) {
        return Promise.resolve([
          {
            id: (params[0] as string) || recordId,
            stable_id: 'stable-uuid',
            slug: 'general-observation-1',
            status: 'draft',
            category_id: 'cat-managed-1',
            record_type_id: 'rt-general',
            template_version_id: 'tv-general-v1',
            attributes: {},
            owner_user_id: 'teacher-1',
            created_at: new Date('2026-10-16T12:00:00Z'),
            updated_at: new Date('2026-10-16T12:00:00Z'),
          },
        ]);
      }
      if (sql.includes('SELECT * FROM record_translations WHERE record_id = $1')) {
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

    const created = await service.create('teacher-1', {
      categoryId: 'cat-managed-1',
      recordTypeId: 'rt-general',
      slug: 'general-observation-1',
      attributes: {},
    });

    expect(created.id).toBeDefined();
    expect(insertedRecordParams[0]).toBe(created.id);
    expect(created.status).toBe('draft');
    expect(created.categoryId).toBe('cat-managed-1');
    expect(created.recordTypeId).toBe('rt-general');
    expect(created.templateVersionId).toBe('tv-general-v1');
    expect(created.attributes).toEqual({});

    // Verify reopening draft loads identical classification and template version
    const reopened = await service.get(created.id);
    expect(reopened.id).toBe(created.id);
    expect(reopened.status).toBe('draft');
    expect(reopened.categoryId).toBe('cat-managed-1');
    expect(reopened.recordTypeId).toBe('rt-general');
    expect(reopened.templateVersionId).toBe('tv-general-v1');
  });

  it('rejects creating a record under an archived category or category with archived parent', async () => {
    const queryMock = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('SELECT crt.category_id, crt.record_type_id')) {
        return Promise.resolve([]); // Category status = active filter returns empty
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

    await expect(
      service.create('teacher-1', {
        categoryId: 'cat-archived',
        recordTypeId: 'rt-general',
        attributes: {},
      }),
    ).rejects.toThrow(/The selected category and record type do not have an active template/);
  });

  it('rejects updating a classified draft when its category is archived', async () => {
    const queryMock = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('SELECT * FROM scientific_records')) {
        return Promise.resolve([
          {
            id: 'rec-under-archived-cat',
            status: 'draft',
            category_id: 'cat-archived-id',
            record_type_id: 'rt-1',
            template_version_id: 'tv-1',
            attributes: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);
      }
      if (sql.includes('FROM categories c')) {
        return Promise.resolve([]); // Category is archived, not active
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

    await expect(
      service.update('actor-1', 'rec-under-archived-cat', {
        slug: 'new-slug',
        attributes: {},
      }),
    ).rejects.toThrow(/The category for this record is archived or inactive/);
  });

  it('rejects upserting translation when record category or parent is archived', async () => {
    const queryMock = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('SELECT * FROM scientific_records')) {
        return Promise.resolve([
          {
            id: 'rec-under-archived-cat',
            status: 'draft',
            category_id: 'cat-archived-id',
            record_type_id: 'rt-1',
            template_version_id: 'tv-1',
            attributes: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);
      }
      if (sql.includes('FROM categories c')) {
        return Promise.resolve([]); // Category or parent is archived
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

    await expect(
      service.upsertTranslation('actor-1', 'rec-under-archived-cat', 'en', {
        title: 'New Translation Title',
      }),
    ).rejects.toThrow(/The category for this record is archived or inactive/);
  });

  it('allows draft updates and translations once the category branch is restored', async () => {
    let isCategoryArchived = true;
    const queryMock = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('SELECT * FROM scientific_records')) {
        return Promise.resolve([
          {
            id: 'rec-restore-check',
            status: 'draft',
            category_id: 'cat-restored-id',
            record_type_id: 'rt-1',
            template_version_id: 'tv-1',
            attributes: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);
      }
      if (sql.includes('FROM categories c')) {
        if (isCategoryArchived) return Promise.resolve([]);
        return Promise.resolve([{ id: 'cat-restored-id' }]);
      }
      if (sql.includes('SELECT stable_key, data_type FROM field_definitions')) {
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

    // Blocked while archived
    await expect(
      service.upsertTranslation('actor-1', 'rec-restore-check', 'en', {
        title: 'Draft Title',
      }),
    ).rejects.toThrow(/The category for this record is archived or inactive/);

    // Restore category branch
    isCategoryArchived = false;

    // Allowed after restoration
    await expect(
      service.upsertTranslation('actor-1', 'rec-restore-check', 'en', {
        title: 'Draft Title',
      }),
    ).resolves.toBeDefined();
  });
});
