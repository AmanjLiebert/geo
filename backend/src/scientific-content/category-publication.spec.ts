import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import {
  evaluateCategoryReadiness,
  ScientificStructureService,
} from './scientific-structure.service';

describe('category readiness evaluation', () => {
  const completeActiveRoot = {
    status: 'active',
    parentId: null,
    title: 'Stratigraphy',
    summary: 'Layered rock sequences',
    description: 'Sedimentary and volcanic rock formations across the region.',
    imageMediaAssetId: 'image-uuid-1',
    imageProcessingStatus: 'approved',
    imageRightsStatement: 'CC BY 4.0 Geo-Kurdistan Team',
  };

  it('approves a complete active root category', () => {
    const issues = evaluateCategoryReadiness(completeActiveRoot);
    expect(issues).toEqual([]);
  });

  it('approves a complete active subcategory under an active published parent', () => {
    const issues = evaluateCategoryReadiness({
      ...completeActiveRoot,
      parentId: 'parent-uuid',
      parentStatus: 'active',
      parentPublicationStatus: 'published',
    });
    expect(issues).toEqual([]);
  });

  it('rejects an archived category', () => {
    const issues = evaluateCategoryReadiness({
      ...completeActiveRoot,
      status: 'archived',
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'category', code: 'category_not_active' }),
    );
  });

  it('rejects a subcategory whose parent is archived or unpublished', () => {
    const archivedParentIssues = evaluateCategoryReadiness({
      ...completeActiveRoot,
      parentId: 'parent-uuid',
      parentStatus: 'archived',
      parentPublicationStatus: 'published',
    });
    expect(archivedParentIssues).toContainEqual(
      expect.objectContaining({ field: 'parent', code: 'parent_not_active' }),
    );

    const unpublishedParentIssues = evaluateCategoryReadiness({
      ...completeActiveRoot,
      parentId: 'parent-uuid',
      parentStatus: 'active',
      parentPublicationStatus: 'draft',
    });
    expect(unpublishedParentIssues).toContainEqual(
      expect.objectContaining({ field: 'parent', code: 'parent_not_published' }),
    );
  });

  it('rejects incomplete text limits', () => {
    const shortIssues = evaluateCategoryReadiness({
      ...completeActiveRoot,
      title: 'A',
      summary: 'B',
      description: 'C',
    });
    expect(shortIssues.map((i) => i.field)).toEqual(['title', 'summary', 'description']);

    const emptyIssues = evaluateCategoryReadiness({
      ...completeActiveRoot,
      title: '   ',
      summary: '',
      description: null,
    });
    expect(emptyIssues.map((i) => i.field)).toEqual(['title', 'summary', 'description']);
  });

  it('rejects missing, unapproved, or non-cleared media', () => {
    const missingImageIssues = evaluateCategoryReadiness({
      ...completeActiveRoot,
      imageMediaAssetId: null,
    });
    expect(missingImageIssues).toContainEqual(
      expect.objectContaining({ field: 'image', code: 'image_required' }),
    );

    const unapprovedImageIssues = evaluateCategoryReadiness({
      ...completeActiveRoot,
      imageProcessingStatus: 'quarantined',
    });
    expect(unapprovedImageIssues).toContainEqual(
      expect.objectContaining({ field: 'image', code: 'image_not_approved' }),
    );

    const noRightsIssues = evaluateCategoryReadiness({
      ...completeActiveRoot,
      imageRightsStatement: '   ',
    });
    expect(noRightsIssues).toContainEqual(
      expect.objectContaining({ field: 'image', code: 'image_rights_required' }),
    );
  });
});

describe('category publication service', () => {
  function harness(options?: {
    categoryRow?: Record<string, unknown>;
    mediaFound?: boolean;
  }) {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const defaultRow = {
      id: 'cat-1',
      parent_id: null,
      status: 'active',
      publication_status: 'draft',
      image_media_asset_id: 'img-1',
      position: 1,
      parent_status: null,
      parent_publication_status: null,
      name: 'Stratigraphy',
      summary: 'Rock sequences',
      description: 'Layered formations',
      draft_title: 'Updated Stratigraphy',
      draft_summary: 'Updated summary',
      draft_description: 'Updated detailed description',
      draft_image_media_asset_id: 'img-draft-1',
      draft_position: 2,
      image_processing_status: 'approved',
      image_rights_statement: 'Public domain',
      draft_image_processing_status: 'approved',
      draft_image_rights_statement: 'Public domain',
    };

    const row = options?.categoryRow !== undefined ? options.categoryRow : defaultRow;

    const query = vi.fn((sql: string, params: unknown[] = []): Promise<unknown[]> => {
      queries.push({ sql, params });
      if (sql.includes('FROM categories c') && sql.includes('WHERE c.id = $1')) {
        return Promise.resolve(row ? [row] : []);
      }
      if (sql.includes('SELECT id, status, publication_status FROM categories')) {
        return Promise.resolve(row ? [row] : []);
      }
      if (sql.includes('SELECT id FROM media_assets')) {
        return Promise.resolve(options?.mediaFound !== false ? [{ id: 'img-1' }] : []);
      }
      return Promise.resolve([]);
    });

    const dataSource = {
      query: (sql: string, params: unknown[]) => query(sql, params),
      transaction: (work: (manager: { query: typeof query }) => Promise<unknown>) =>
        work({ query }),
    } as unknown as DataSource;

    return { service: new ScientificStructureService(dataSource), queries, query };
  }

  it('promotes pending draft revision transactionally, updates translation, deletes revision, and audits', async () => {
    const { service, queries } = harness();
    const result = await service.publishCategory('teacher-1', 'cat-1');
    expect(result).toEqual({
      id: 'cat-1',
      publicationStatus: 'published',
      promotedDraft: true,
    });

    expect(queries.some((q) => q.sql.includes('FOR UPDATE OF c'))).toBe(true);
    const updateCategory = queries.find((q) => q.sql.includes('UPDATE categories'));
    expect(updateCategory).toBeDefined();
    expect(updateCategory?.params).toEqual(['cat-1', 'img-draft-1', 2]);

    const upsertTranslation = queries.find((q) => q.sql.includes('INSERT INTO category_translations'));
    expect(upsertTranslation).toBeDefined();
    expect(upsertTranslation?.params).toEqual([
      'cat-1',
      'Updated Stratigraphy',
      'Updated summary',
      'Updated detailed description',
    ]);

    const deleteDraft = queries.find((q) => q.sql.includes('DELETE FROM category_draft_revisions'));
    expect(deleteDraft?.params).toEqual(['cat-1']);

    const auditEvent = queries.find((q) => q.sql.includes('INSERT INTO content_audit_events'));
    expect(auditEvent?.params[1]).toBe('category.published');
  });

  it('rejects publishing an incomplete category and aborts without promotion', async () => {
    const { service, queries } = harness({
      categoryRow: {
        id: 'cat-1',
        parent_id: null,
        status: 'active',
        publication_status: 'draft',
        image_media_asset_id: null,
        position: 1,
        name: 'Incomplete',
        summary: '',
        description: null,
        draft_title: null,
        draft_summary: null,
        draft_description: null,
        draft_image_media_asset_id: null,
        draft_position: null,
      },
    });

    await expect(service.publishCategory('teacher-1', 'cat-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(queries.some((q) => q.sql.includes('UPDATE categories'))).toBe(false);
    expect(queries.some((q) => q.sql.includes('DELETE FROM category_draft_revisions'))).toBe(false);
  });

  it('rejects publishing when parent is unpublished or archived', async () => {
    const { service } = harness({
      categoryRow: {
        id: 'sub-1',
        parent_id: 'parent-1',
        parent_status: 'active',
        parent_publication_status: 'draft',
        status: 'active',
        publication_status: 'draft',
        name: 'Subcategory',
        summary: 'Subcategory summary',
        description: 'Subcategory description',
        image_media_asset_id: 'img-1',
        position: 1,
        draft_title: null,
        image_processing_status: 'approved',
        image_rights_statement: 'CC BY',
      },
    });

    await expect(service.publishCategory('teacher-1', 'sub-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects publishing an archived category with 409 Conflict', async () => {
    const { service } = harness({
      categoryRow: {
        id: 'cat-1',
        parent_id: null,
        status: 'archived',
        publication_status: 'draft',
        name: 'Archived',
        summary: 'Archived summary',
        description: 'Archived description',
        image_media_asset_id: 'img-1',
        position: 1,
        draft_title: null,
        image_processing_status: 'approved',
        image_rights_statement: 'CC BY',
      },
    });

    await expect(service.publishCategory('teacher-1', 'cat-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects duplicate publish when category is already published with no draft changes', async () => {
    const { service } = harness({
      categoryRow: {
        id: 'cat-1',
        parent_id: null,
        status: 'active',
        publication_status: 'published',
        name: 'Already published',
        summary: 'Published summary',
        description: 'Published description',
        image_media_asset_id: 'img-1',
        position: 1,
        draft_title: null,
        image_processing_status: 'approved',
        image_rights_statement: 'CC BY',
      },
    });

    await expect(service.publishCategory('teacher-1', 'cat-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('unpublishes a published category, writes audit event, and preserves all other data', async () => {
    const { service, queries } = harness({
      categoryRow: {
        id: 'cat-1',
        status: 'active',
        publication_status: 'published',
      },
    });

    const result = await service.unpublishCategory('teacher-1', 'cat-1');
    expect(result).toEqual({ id: 'cat-1', publicationStatus: 'draft' });

    const update = queries.find((q) => q.sql.includes('UPDATE categories SET publication_status ='));
    expect(update).toBeDefined();
    expect(update?.params).toEqual(['cat-1']);

    const audit = queries.find(
      (q) => q.sql.includes('INSERT INTO content_audit_events') && q.params.includes('category.unpublished'),
    );
    expect(audit).toBeDefined();

    expect(queries.some((q) => q.sql.includes('DELETE FROM'))).toBe(false);
  });

  it('rejects unpublishing an archived category or an already-unpublished category with 409', async () => {
    const archived = harness({
      categoryRow: { id: 'cat-1', status: 'archived', publication_status: 'published' },
    });
    await expect(archived.service.unpublishCategory('teacher-1', 'cat-1')).rejects.toThrow(
      ConflictException,
    );

    const alreadyDraft = harness({
      categoryRow: { id: 'cat-1', status: 'active', publication_status: 'draft' },
    });
    await expect(alreadyDraft.service.unpublishCategory('teacher-1', 'cat-1')).rejects.toThrow(
      ConflictException,
    );
  });
});
