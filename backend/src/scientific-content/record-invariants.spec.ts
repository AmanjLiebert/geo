import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import {
  assertCategoryBranchActive,
  assertRecordEditable,
} from './record-invariants';

describe('record-invariants', () => {
  describe('assertCategoryBranchActive', () => {
    it('allows unclassified records without category_id', async () => {
      const query = vi.fn();
      const manager = { query } as unknown as EntityManager;
      await expect(assertCategoryBranchActive(manager, null)).resolves.toBeUndefined();
      await expect(assertCategoryBranchActive(manager, undefined)).resolves.toBeUndefined();
      expect(query).not.toHaveBeenCalled();
    });

    it('rejects when category is archived', async () => {
      const query = vi.fn().mockResolvedValue([]);
      const manager = { query } as unknown as EntityManager;
      await expect(assertCategoryBranchActive(manager, 'cat-archived')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('allows when category and parent are active', async () => {
      const query = vi.fn().mockResolvedValue([{ id: 'cat-active' }]);
      const manager = { query } as unknown as EntityManager;
      await expect(assertCategoryBranchActive(manager, 'cat-active')).resolves.toBeUndefined();
    });

    it('allows when category is restored from archive to active', async () => {
      let isArchived = true;
      const query = vi.fn().mockImplementation(() => {
        if (isArchived) return Promise.resolve([]);
        return Promise.resolve([{ id: 'cat-restored' }]);
      });
      const manager = { query } as unknown as EntityManager;

      // When archived, fails closed
      await expect(assertCategoryBranchActive(manager, 'cat-restored')).rejects.toBeInstanceOf(
        ConflictException,
      );

      // Restore category
      isArchived = false;

      // When restored, succeeds
      await expect(assertCategoryBranchActive(manager, 'cat-restored')).resolves.toBeUndefined();
    });
  });

  describe('assertRecordEditable', () => {
    it('throws NotFoundException when record does not exist', async () => {
      const query = vi.fn().mockResolvedValue([]);
      const manager = { query } as unknown as EntityManager;
      await expect(assertRecordEditable(manager, 'rec-missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it.each(['published', 'archived'])(
      'rejects when record status is %s',
      async (status) => {
        const query = vi.fn().mockResolvedValue([{ id: 'rec-1', status, category_id: null }]);
        const manager = { query } as unknown as EntityManager;
        await expect(assertRecordEditable(manager, 'rec-1')).rejects.toBeInstanceOf(
          ConflictException,
        );
      },
    );

    it('allows editable unclassified draft with lock', async () => {
      const query = vi.fn().mockResolvedValue([
        {
          id: 'rec-unclassified',
          status: 'unclassified_draft',
          category_id: null,
          record_type_id: null,
          template_version_id: null,
        },
      ]);
      const manager = { query } as unknown as EntityManager;
      const result = await assertRecordEditable(manager, 'rec-unclassified', { lock: true });
      expect(result.id).toBe('rec-unclassified');
      expect(result.status).toBe('unclassified_draft');
      expect(result.categoryId).toBeNull();
      expect(query.mock.calls[0]?.[0]).toContain('FOR UPDATE');
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('rejects classified draft when its category is archived', async () => {
      const query = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('FROM scientific_records')) {
          return Promise.resolve([
            {
              id: 'rec-archived-cat',
              status: 'draft',
              category_id: 'cat-archived',
              record_type_id: 'rt-1',
              template_version_id: 'tv-1',
            },
          ]);
        }
        if (sql.includes('FROM categories c')) {
          return Promise.resolve([]); // Category or parent is archived
        }
        return Promise.resolve([]);
      });
      const manager = { query } as unknown as EntityManager;

      await expect(
        assertRecordEditable(manager, 'rec-archived-cat', { lock: true }),
      ).rejects.toThrow(/The category for this record is archived or inactive/);
    });

    it('allows mutations again once the archived category is restored', async () => {
      let isCategoryArchived = true;
      const query = vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('FROM scientific_records')) {
          return Promise.resolve([
            {
              id: 'rec-restored',
              status: 'draft',
              category_id: 'cat-branch',
              record_type_id: 'rt-1',
              template_version_id: 'tv-1',
            },
          ]);
        }
        if (sql.includes('FROM categories c')) {
          if (isCategoryArchived) return Promise.resolve([]);
          return Promise.resolve([{ id: 'cat-branch' }]);
        }
        return Promise.resolve([]);
      });
      const manager = { query } as unknown as EntityManager;

      // Blocked while archived
      await expect(
        assertRecordEditable(manager, 'rec-restored', { lock: true }),
      ).rejects.toBeInstanceOf(ConflictException);

      // Restore category
      isCategoryArchived = false;

      // Allowed after restoration
      const context = await assertRecordEditable(manager, 'rec-restored', { lock: true });
      expect(context.id).toBe('rec-restored');
      expect(context.categoryId).toBe('cat-branch');
    });
  });
});
