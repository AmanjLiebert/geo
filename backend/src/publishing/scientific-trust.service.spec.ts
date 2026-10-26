import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ScientificTrustService } from './scientific-trust.service';

const recordId = '11111111-1111-4111-8111-111111111111';
const referenceId = '22222222-2222-4222-8222-222222222222';

describe('ScientificTrustService record attachments', () => {
  it('lists related items with English display titles and a bound source ID', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: recordId }])
      .mockResolvedValueOnce([
        {
          id: referenceId,
          targetType: 'research',
          targetId: referenceId,
          targetTitle: 'Field study',
          relationshipType: 'cites',
          notes: null,
          createdAt: new Date(),
        },
      ]);
    const service = new ScientificTrustService({ query } as unknown as DataSource);
    const result = await service.listRelationships(recordId);
    expect(result.items[0]?.targetTitle).toBe('Field study');
    expect(query.mock.calls[1]?.[0]).toContain(
      'COALESCE(record_title.title, research_title.title)',
    );
    expect(query.mock.calls[1]?.[1]).toEqual([recordId]);
  });

  it.each(['restricted', 'embargoed'] as const)(
    'rejects public coordinates on a %s location before storage',
    async (visibility) => {
      const transaction = vi.fn();
      const service = new ScientificTrustService({ transaction } as unknown as DataSource);
      await expect(
        service.addLocation('teacher', recordId, {
          exactLatitude: 36,
          exactLongitude: 44,
          publicLatitude: 36,
          publicLongitude: 44,
          visibility,
          sensitivityReason: 'Protected field site',
          embargoUntil: visibility === 'embargoed' ? '2027-01-01' : undefined,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it('audits restricted location additions without storing coordinates in audit metadata', async () => {
    const query = vi.fn().mockResolvedValueOnce([{ status: 'draft' }]);
    const dataSource = {
      transaction: vi.fn(async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({ query } as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const service = new ScientificTrustService(dataSource);
    await service.addLocation('teacher', recordId, {
      exactLatitude: 36,
      exactLongitude: 44,
      visibility: 'restricted',
      sensitivityReason: 'Protected site',
    });
    const auditCall = query.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO content_audit_events'),
    ) as unknown as [string, unknown[]] | undefined;
    expect(auditCall?.[1]).toEqual([
      'teacher',
      'scientific-record.location-added',
      recordId,
      expect.stringContaining('restricted'),
    ]);
    const metadata = JSON.parse(String(auditCall?.[1]?.[3])) as unknown;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new Error('Audit metadata is not an object.');
    }
    expect(Object.keys(metadata)).toEqual(['locationId', 'visibility']);
  });

  it('inserts evidence for an editable draft while holding the record lock', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ status: 'draft' }])
      .mockResolvedValueOnce([{ id: referenceId }])
      .mockResolvedValueOnce([]);
    const manager = { query } as unknown as EntityManager;
    const dataSource = {
      transaction: vi.fn(async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback(manager),
      ),
    } as unknown as DataSource;
    const service = new ScientificTrustService(dataSource);

    const result = await service.addEvidence('teacher', recordId, {
      referenceId,
      evidenceKind: 'field_observation',
    });
    expect(result.recordId).toBe(recordId);
    expect(query.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(query.mock.calls[1]?.[0]).toContain('scientific_references');
    expect(query.mock.calls[2]?.[0]).toContain('INSERT INTO record_evidence');
    expect(query.mock.calls[2]?.[1]).toContain(referenceId);
    expect(query.mock.calls[3]?.[0]).toContain('UPDATE scientific_records');
    expect(query.mock.calls[4]?.[0]).toContain('INSERT INTO content_audit_events');
  });

  it.each(['published', 'archived'])(
    'rejects evidence, location, and relationship writes to %s records',
    async (status) => {
      const query = vi.fn().mockResolvedValue([{ status }]);
      const manager = { query } as unknown as EntityManager;
      const dataSource = {
        transaction: vi.fn(async (callback: (manager: EntityManager) => Promise<unknown>) =>
          callback(manager),
        ),
      } as unknown as DataSource;
      const service = new ScientificTrustService(dataSource);

      await expect(
        service.addEvidence('teacher', recordId, {
          referenceId,
          evidenceKind: 'field_observation',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.addLocation('teacher', recordId, {
          exactLatitude: 36,
          exactLongitude: 44,
          publicLatitude: 36,
          publicLongitude: 44,
          visibility: 'public',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.addRelationship('teacher', recordId, {
          targetType: 'research',
          targetId: referenceId,
          relationshipType: 'cites',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(query).toHaveBeenCalledTimes(3);
      expect(query.mock.calls.every(([sql]) => String(sql).includes('FOR UPDATE'))).toBe(true);
    },
  );

  it('returns a safe not-found error for a missing reference', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ status: 'draft' }])
      .mockResolvedValueOnce([]);
    const dataSource = {
      transaction: vi.fn(async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({ query } as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const service = new ScientificTrustService(dataSource);
    await expect(
      service.addEvidence('teacher', recordId, {
        referenceId,
        evidenceKind: 'field_observation',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('rejects field evidence not present in the record pinned template', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ status: 'draft', template_version_id: 'template-v1' }])
      .mockResolvedValueOnce([]);
    const dataSource = {
      transaction: vi.fn(async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({ query } as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const service = new ScientificTrustService(dataSource);
    await expect(
      service.addEvidence('teacher', recordId, {
        referenceId,
        evidenceKind: 'field_observation',
        fieldKey: 'not_a_template_field',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query.mock.calls[1]?.[1]).toEqual(['template-v1', 'not_a_template_field']);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('searches reference title and identifier with bound parameters and a minimal projection', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }]);
    const service = new ScientificTrustService({ query } as unknown as DataSource);
    expect(await service.listReferences(25, 5, ' fossil ')).toEqual({
      items: [],
      total: 0,
      limit: 25,
      offset: 5,
    });
    expect(query.mock.calls[0]?.[1]).toEqual([25, 5, 'fossil']);
    expect(query.mock.calls[1]?.[1]).toEqual(['fossil']);
    expect(query.mock.calls[0]?.[0]).not.toMatch(/SELECT\s+\*/i);
    expect(query.mock.calls[0]?.[0]).not.toContain('created_by_user_id');
  });

  it('returns only dashboard evidence fields, not record or reference internals', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: recordId }])
      .mockResolvedValueOnce([]);
    const service = new ScientificTrustService({ query } as unknown as DataSource);
    expect(await service.listEvidence(recordId)).toEqual({ items: [] });
    const [sql, params] = query.mock.calls[1] as [string, unknown[]];
    expect(sql).not.toMatch(/SELECT\s+\*/i);
    expect(sql).not.toContain('"createdByUserId"');
    expect(sql).toContain('AS "canVerify"');
    expect(params).toEqual([recordId, null]);
  });

  it('rejects evidence writes when category branch is archived, and allows them after restoration', async () => {
    let isCategoryArchived = true;
    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('FROM scientific_records')) {
        return Promise.resolve([
          {
            id: recordId,
            status: 'draft',
            category_id: 'cat-trust-test',
            record_type_id: 'rt-1',
            template_version_id: 'tv-1',
          },
        ]);
      }
      if (sql.includes('FROM categories c')) {
        if (isCategoryArchived) return Promise.resolve([]);
        return Promise.resolve([{ id: 'cat-trust-test' }]);
      }
      if (sql.includes('FROM scientific_references')) {
        return Promise.resolve([{ id: referenceId }]);
      }
      return Promise.resolve([]);
    });

    const manager = { query } as unknown as EntityManager;
    const dataSource = {
      transaction: vi.fn(async (cb: (m: EntityManager) => Promise<unknown>) => cb(manager)),
    } as unknown as DataSource;
    const service = new ScientificTrustService(dataSource);

    // Blocked while category branch is archived
    await expect(
      service.addEvidence('teacher', recordId, {
        referenceId,
        evidenceKind: 'field_observation',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    // Restore category branch
    isCategoryArchived = false;

    // Allowed after restoration
    const result = await service.addEvidence('teacher', recordId, {
      referenceId,
      evidenceKind: 'field_observation',
    });
    expect(result.recordId).toBe(recordId);
  });

  it('does not create a publication issue when the publisher owns the complete record', async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const query = vi.fn((sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (sql.includes('FROM scientific_records WHERE id')) {
        return Promise.resolve([
          {
            id: recordId,
            owner_user_id: 'teacher-1',
            category_id: 'category-1',
            record_type_id: 'type-1',
            template_version_id: 'template-1',
          },
        ]);
      }
      if (sql.includes('FROM categories c')) return Promise.resolve([{ exists: 1 }]);
      if (sql.includes('FROM record_translations')) return Promise.resolve([{ count: 1 }]);
      if (sql.includes('WITH policy AS')) {
        return Promise.resolve([{ minimum: 1, kinds: [], verified_count: 1 }]);
      }
      if (sql.includes('FROM record_media rm')) {
        return Promise.resolve([
          { primary_count: 1, unapproved_count: 0, invalid_primary_count: 0 },
        ]);
      }
      if (sql.includes('FROM record_locations')) return Promise.resolve([{ invalid_count: 0 }]);
      return Promise.resolve([]);
    });
    const service = new ScientificTrustService({ query } as unknown as DataSource);

    await expect(service.publicationIssues(recordId, 'teacher-1')).resolves.toEqual({
      valid: true,
      issues: [],
    });
    const translationQuery = queries.find((entry) =>
      entry.sql.includes('FROM record_translations'),
    );
    expect(translationQuery?.params).toEqual([recordId]);
    expect(translationQuery?.sql).not.toContain('translator_user_id IS DISTINCT FROM');
  });
});
