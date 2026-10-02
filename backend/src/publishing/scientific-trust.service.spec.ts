import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ScientificTrustService } from './scientific-trust.service';

const recordId = '11111111-1111-4111-8111-111111111111';
const referenceId = '22222222-2222-4222-8222-222222222222';

describe('ScientificTrustService record attachments', () => {
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
    expect(sql).not.toContain('created_by_user_id');
    expect(params).toEqual([recordId]);
  });
});
