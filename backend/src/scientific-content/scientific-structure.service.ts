import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { CreateStructureRequestDto } from './dto/create-structure-request.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { EditCategoryDto } from './dto/edit-category.dto';
import {
  FieldDataType,
  FieldDefinition,
  ValidationIssue,
  CategoryReadinessResult,
} from './scientific-content.types';
import { applyFieldMapping, validateAttributes } from './template-validation';

interface CategoryRow {
  id: string;
  parent_id: string | null;
  stable_key: string;
  slug: string;
  records_allowed: boolean;
  position: number;
  name: string | null;
  description: string | null;
  summary: string | null;
  publication_status: string;
  status: string;
  image_media_asset_id: string | null;
  draft_title: string | null;
  draft_summary: string | null;
  draft_description: string | null;
  draft_image_media_asset_id: string | null;
  draft_position: number | null;
  parent_status?: string | null;
  parent_publication_status?: string | null;
  image_processing_status?: string | null;
  image_rights_statement?: string | null;
  draft_image_processing_status?: string | null;
  draft_image_rights_statement?: string | null;
  was_unpublished?: boolean;
}

export function evaluateCategoryReadiness(row: {
  status: string;
  parentId: string | null;
  parentStatus?: string | null;
  parentPublicationStatus?: string | null;
  title: string | null;
  summary: string | null;
  description: string | null;
  imageMediaAssetId: string | null;
  imageProcessingStatus?: string | null;
  imageRightsStatement?: string | null;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (row.status !== 'active') {
    issues.push({
      field: 'category',
      code: 'category_not_active',
      message: 'Archived categories cannot be published.',
    });
  }

  if (row.parentId) {
    if (row.parentStatus !== 'active') {
      issues.push({
        field: 'parent',
        code: 'parent_not_active',
        message: 'Parent category is archived.',
      });
    }
    if (row.parentPublicationStatus !== 'published') {
      issues.push({
        field: 'parent',
        code: 'parent_not_published',
        message: 'Parent category must be published before this subcategory can publish.',
      });
    }
  }

  const title = row.title?.trim() ?? '';
  if (title.length < 2 || title.length > 160) {
    issues.push({
      field: 'title',
      code: 'title_invalid',
      message: 'Enter a title between 2 and 160 characters.',
    });
  }

  const summary = row.summary?.trim() ?? '';
  if (summary.length < 2 || summary.length > 500) {
    issues.push({
      field: 'summary',
      code: 'summary_invalid',
      message: 'Enter a summary between 2 and 500 characters.',
    });
  }

  const description = row.description?.trim() ?? '';
  if (description.length < 2 || description.length > 4000) {
    issues.push({
      field: 'description',
      code: 'description_invalid',
      message: 'Enter a description between 2 and 4000 characters.',
    });
  }

  if (!row.imageMediaAssetId) {
    issues.push({
      field: 'image',
      code: 'image_required',
      message: 'Add an approved image for the category.',
    });
  } else if (row.imageProcessingStatus !== 'approved') {
    issues.push({
      field: 'image',
      code: 'image_not_approved',
      message: 'The category image must be approved before publication.',
    });
  } else if (!row.imageRightsStatement || row.imageRightsStatement.trim().length === 0) {
    issues.push({
      field: 'image',
      code: 'image_rights_required',
      message: 'The category image must have a valid rights statement.',
    });
  }

  return issues;
}

interface RecordTypeRow {
  id: string;
  stable_key: string;
  position: number;
  name: string | null;
  description: string | null;
  active_template_version_id: string;
}

interface TemplateRow {
  version_id: string;
  template_id: string;
  stable_key: string;
  name: string;
  version: number;
}

interface FieldRow {
  id: string;
  stable_key: string;
  data_type: FieldDataType;
  required: boolean;
  validation: Record<string, unknown>;
  unit: string | null;
  searchable: boolean;
  filterable: boolean;
  position: number;
  status: 'active' | 'deprecated';
  label: string | null;
  help_text: string | null;
}

interface VersionRow {
  id: string;
  template_id: string;
  version: number;
  status: string;
}

interface PreviewRecordRow {
  id: string;
  attributes: Record<string, unknown>;
}

interface StructureRequestRow {
  id: string;
  requested_by_user_id: string | null;
  parent_category_id: string | null;
  proposed_category_name: string | null;
  proposed_record_type_name: string | null;
  reason: string;
  status: string;
  resolution_note: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ScientificStructureService {
  constructor(private readonly dataSource: DataSource) {}

  async listCategories(locale: string, includeArchived = false) {
    const rows = (await this.dataSource.query(
      `
        SELECT c.id, c.parent_id, c.stable_key, c.slug, c.records_allowed, c.position, c.status,
               c.publication_status, c.image_media_asset_id, ct.name, ct.summary, ct.description,
               dr.title AS draft_title, dr.summary AS draft_summary,
               dr.description AS draft_description,
               dr.image_media_asset_id AS draft_image_media_asset_id,
               dr.position AS draft_position,
               p.status AS parent_status,
               p.publication_status AS parent_publication_status,
               m.processing_status AS image_processing_status,
               m.rights_statement AS image_rights_statement,
               dm.processing_status AS draft_image_processing_status,
               dm.rights_statement AS draft_image_rights_statement,
               EXISTS (
                 SELECT 1 FROM content_audit_events cae
                 WHERE cae.target_type = 'category' AND cae.target_id = c.id::text AND cae.action = 'category.unpublished'
               ) AS was_unpublished
        FROM categories c
        LEFT JOIN categories p ON p.id = c.parent_id
        LEFT JOIN category_draft_revisions dr ON dr.category_id = c.id
        LEFT JOIN category_translations ct
          ON ct.category_id = c.id AND ct.locale = $1
        LEFT JOIN media_assets m ON m.id = c.image_media_asset_id
        LEFT JOIN media_assets dm ON dm.id = dr.image_media_asset_id
        WHERE (c.status = 'active' OR $2::boolean)
          AND ($2::boolean OR p.id IS NULL OR p.status = 'active')
        ORDER BY c.parent_id NULLS FIRST, c.position, c.stable_key
      `,
      [locale, includeArchived],
    )) as unknown as CategoryRow[];

    return {
      items: rows.map((row) => {
        const hasDraft = row.draft_title !== null;
        const title = hasDraft ? row.draft_title : row.name;
        const summary = hasDraft ? row.draft_summary : row.summary;
        const description = hasDraft ? row.draft_description : row.description;
        const imageMediaAssetId = hasDraft
          ? row.draft_image_media_asset_id
          : row.image_media_asset_id;
        const imageProcessingStatus = hasDraft
          ? row.draft_image_processing_status
          : row.image_processing_status;
        const imageRightsStatement = hasDraft
          ? row.draft_image_rights_statement
          : row.image_rights_statement;

        const readinessIssues = evaluateCategoryReadiness({
          status: row.status,
          parentId: row.parent_id,
          parentStatus: row.parent_status,
          parentPublicationStatus: row.parent_publication_status,
          title,
          summary,
          description,
          imageMediaAssetId,
          imageProcessingStatus,
          imageRightsStatement,
        });

        let displayState: 'draft' | 'published' | 'unpublished' | 'archived';
        if (row.status === 'archived') {
          displayState = 'archived';
        } else if (row.publication_status === 'published') {
          if (
            row.parent_id &&
            (row.parent_status !== 'active' || row.parent_publication_status !== 'published')
          ) {
            displayState = 'unpublished';
          } else {
            displayState = 'published';
          }
        } else {
          displayState = row.was_unpublished ? 'unpublished' : 'draft';
        }

        return {
          id: row.id,
          parentId: row.parent_id,
          stableKey: row.stable_key,
          slug: row.slug,
          recordsAllowed: row.records_allowed,
          position: row.position,
          name: row.name ?? row.stable_key,
          description: row.description,
          summary: row.summary,
          publicationStatus: row.publication_status,
          status: row.status,
          imageMediaAssetId: row.image_media_asset_id,
          locale,
          translationAvailable: row.name !== null,
          readiness: {
            publishable: readinessIssues.length === 0,
            issues: readinessIssues,
          },
          displayState,
          hasUnpublishedChanges: hasDraft,
          draftRevision:
            row.draft_title === null
              ? null
              : {
                  title: row.draft_title,
                  summary: row.draft_summary,
                  description: row.draft_description,
                  imageMediaAssetId: row.draft_image_media_asset_id,
                  position: row.draft_position,
                },
        };
      }),
    };
  }

  async createCategory(actorUserId: string, input: CreateCategoryDto) {
    const title = input.title.trim();
    const summary = input.summary.trim();
    const description = input.description.trim();
    if (title.length < 2 || summary.length < 2 || description.length < 2) {
      throw new BadRequestException('Complete the category title, summary, and description.');
    }
    const id = randomUUID();
    // The suffix makes an editable title independent of the permanent route identity.
    const slugBase =
      title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 90) || 'category';
    const slug = `${slugBase}-${id.slice(0, 8)}`;
    await this.dataSource.transaction(async (manager) => {
      if (input.parentId) {
        const parent = await manager.query<Array<{ id: string; parent_id: string | null }>>(
          `SELECT id, parent_id FROM categories WHERE id = $1 AND status = 'active' FOR UPDATE`,
          [input.parentId],
        );
        if (!parent[0]) throw new NotFoundException('Parent category was not found.');
        if (parent[0].parent_id)
          throw new BadRequestException('Only two category levels are available.');
      }
      if (input.imageMediaAssetId) {
        const images = await manager.query<Array<{ id: string }>>(
          `SELECT id FROM media_assets WHERE id = $1 AND owner_user_id = $2 AND media_kind = 'image' AND processing_status NOT IN ('rejected', 'archived', 'failed') FOR UPDATE`,
          [input.imageMediaAssetId, actorUserId],
        );
        if (!images[0]) throw new BadRequestException('Choose an image uploaded by your account.');
      }
      const types = await manager.query<Array<{ type_id: string; version_id: string }>>(
        `SELECT rt.id AS type_id, tv.id AS version_id FROM record_types rt JOIN record_templates t ON t.record_type_id = rt.id JOIN template_versions tv ON tv.template_id = t.id AND tv.status = 'active' WHERE rt.stable_key = 'general_geological_record' AND rt.status = 'active'`,
      );
      if (!types[0]) throw new ConflictException('The general record form is unavailable.');
      await manager.query(
        `INSERT INTO categories (id, parent_id, stable_key, slug, records_allowed, publication_status, image_media_asset_id, position) VALUES ($1,$2,$3,$4,true,'draft',$5,(SELECT COALESCE(MAX(position),-1)+1 FROM categories WHERE parent_id IS NOT DISTINCT FROM $2::uuid))`,
        [
          id,
          input.parentId ?? null,
          `managed_${id.replaceAll('-', '')}`,
          slug,
          input.imageMediaAssetId ?? null,
        ],
      );
      await manager.query(
        `INSERT INTO category_translations (category_id, locale, name, summary, description) VALUES ($1,'en',$2,$3,$4)`,
        [id, title, summary, description],
      );
      await manager.query(
        `INSERT INTO category_record_types (category_id, record_type_id, active_template_version_id) VALUES ($1,$2,$3)`,
        [id, types[0].type_id, types[0].version_id],
      );
      await manager.query(
        `INSERT INTO content_audit_events (actor_user_id, action, target_type, target_id, metadata) VALUES ($1,'category.created','category',$2,$3::jsonb)`,
        [actorUserId, id, JSON.stringify({ parentId: input.parentId ?? null })],
      );
    });
    return {
      id,
      parentId: input.parentId ?? null,
      slug,
      title,
      summary,
      description,
      publicationStatus: 'draft',
      imageMediaAssetId: input.imageMediaAssetId ?? null,
    };
  }

  async editCategory(actorUserId: string, categoryId: string, input: EditCategoryDto) {
    const title = input.title.trim();
    const summary = input.summary.trim();
    const description = input.description.trim();
    if (title.length < 2 || summary.length < 2 || description.length < 2) {
      throw new BadRequestException('Complete the category title, summary, and description.');
    }
    return this.dataSource.transaction(async (manager) => {
      const categories = await manager.query<
        Array<{ id: string; image_media_asset_id: string | null }>
      >(
        `SELECT id, image_media_asset_id FROM categories WHERE id = $1 AND status = 'active' FOR UPDATE`,
        [categoryId],
      );
      if (!categories[0]) throw new NotFoundException('Category was not found.');
      const drafts = await manager.query<Array<{ image_media_asset_id: string | null }>>(
        `SELECT image_media_asset_id FROM category_draft_revisions WHERE category_id = $1`,
        [categoryId],
      );
      if (
        input.imageMediaAssetId &&
        input.imageMediaAssetId !== categories[0].image_media_asset_id &&
        input.imageMediaAssetId !== drafts[0]?.image_media_asset_id
      ) {
        const images = await manager.query<Array<{ id: string }>>(
          `SELECT id FROM media_assets WHERE id = $1 AND owner_user_id = $2 AND media_kind = 'image' AND processing_status NOT IN ('rejected', 'archived', 'failed') FOR UPDATE`,
          [input.imageMediaAssetId, actorUserId],
        );
        if (!images[0]) throw new BadRequestException('Choose an image uploaded by your account.');
      }
      await manager.query(
        `INSERT INTO category_draft_revisions (category_id, title, summary, description, image_media_asset_id, position, edited_by_user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (category_id) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary,
           description = EXCLUDED.description, image_media_asset_id = EXCLUDED.image_media_asset_id,
           position = EXCLUDED.position, edited_by_user_id = EXCLUDED.edited_by_user_id, updated_at = now()`,
        [
          categoryId,
          title,
          summary,
          description,
          input.imageMediaAssetId ?? null,
          input.position,
          actorUserId,
        ],
      );
      await manager.query(
        `INSERT INTO category_draft_revision_history (id, category_id, title, summary, description, image_media_asset_id, position, edited_by_user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          randomUUID(),
          categoryId,
          title,
          summary,
          description,
          input.imageMediaAssetId ?? null,
          input.position,
          actorUserId,
        ],
      );
      await manager.query(
        `INSERT INTO content_audit_events (actor_user_id, action, target_type, target_id, metadata) VALUES ($1,'category.draft_edited','category',$2,'{}'::jsonb)`,
        [actorUserId, categoryId],
      );
      return { id: categoryId, publicationStatus: 'draft', revisionSaved: true };
    });
  }

  async previewCategoryArchive(categoryId: string) {
    const rows = await this.dataSource.query<
      Array<{ id: string; status: string; category_count: string; record_count: string }>
    >(
      `WITH RECURSIVE branch AS (
         SELECT id, status FROM categories WHERE id = $1
         UNION ALL SELECT c.id, c.status FROM categories c JOIN branch b ON c.parent_id = b.id
       ) SELECT (SELECT count(*) FROM branch WHERE status = (SELECT status FROM categories WHERE id = $1))::text AS category_count,
                (SELECT count(*) FROM scientific_records WHERE category_id IN (SELECT id FROM branch))::text AS record_count,
                (SELECT status::text FROM categories WHERE id = $1) AS status`,
      [categoryId],
    );
    if (!rows[0]?.status) throw new NotFoundException('Category was not found.');
    return {
      categoryCount: Number(rows[0].category_count),
      recordCount: Number(rows[0].record_count),
      status: rows[0].status,
    };
  }

  async setCategoryArchive(
    actorUserId: string,
    categoryId: string,
    restore: boolean,
    confirmed: { categoryCount: number; recordCount: number },
  ) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query('LOCK TABLE categories IN SHARE ROW EXCLUSIVE MODE');
      const branch = await manager.query<
        Array<{ id: string; depth: number; status: string; parent_id: string | null }>
      >(
        `WITH RECURSIVE branch AS (
           SELECT id, parent_id, status::text, 0 AS depth FROM categories WHERE id = $1
           UNION ALL SELECT c.id, c.parent_id, c.status::text, b.depth + 1 FROM categories c JOIN branch b ON c.parent_id = b.id
         ) SELECT * FROM branch ORDER BY depth ${restore ? 'ASC' : 'DESC'}, id`,
        [categoryId],
      );
      if (!branch[0]) throw new NotFoundException('Category was not found.');
      const root = branch.find((item) => item.id === categoryId)!;
      if (root.status !== (restore ? 'archived' : 'active'))
        throw new ConflictException('Category state has changed. Refresh and try again.');
      if (restore && root.parent_id) {
        const parent = await manager.query<Array<{ status: string }>>(
          'SELECT status FROM categories WHERE id = $1',
          [root.parent_id],
        );
        if (parent[0]?.status !== 'active')
          throw new ConflictException('Restore the parent category first.');
      }
      const affected = branch.filter((item) => item.status === (restore ? 'archived' : 'active'));
      const recordRows = await manager.query<Array<{ count: string }>>(
        `SELECT count(*)::text AS count FROM scientific_records WHERE category_id = ANY($1::uuid[])`,
        [branch.map((item) => item.id)],
      );
      const recordCount = Number(recordRows[0]?.count ?? 0);
      if (confirmed.categoryCount !== affected.length || confirmed.recordCount !== recordCount) {
        throw new ConflictException('Category contents changed. Review the impact and try again.');
      }
      for (const item of affected) {
        await manager.query('UPDATE categories SET status = $2, updated_at = now() WHERE id = $1', [
          item.id,
          restore ? 'active' : 'archived',
        ]);
      }
      await manager.query(
        `INSERT INTO content_audit_events (actor_user_id, action, target_type, target_id, metadata)
         VALUES ($1,$2,'category',$3,$4::jsonb)`,
        [
          actorUserId,
          restore ? 'category.restored' : 'category.archived',
          categoryId,
          JSON.stringify({ categoryCount: affected.length, recordCount }),
        ],
      );
      return {
        categoryCount: affected.length,
        recordCount,
        status: restore ? 'active' : 'archived',
      };
    });
  }

  async getCategoryReadiness(categoryId: string): Promise<CategoryReadinessResult> {
    const rows = (await this.dataSource.query(
      `
        SELECT c.id, c.parent_id, c.status, c.publication_status, c.image_media_asset_id,
               p.status AS parent_status, p.publication_status AS parent_publication_status,
               ct.name, ct.summary, ct.description,
               dr.title AS draft_title, dr.summary AS draft_summary,
               dr.description AS draft_description,
               dr.image_media_asset_id AS draft_image_media_asset_id,
               m.processing_status AS image_processing_status,
               m.rights_statement AS image_rights_statement,
               dm.processing_status AS draft_image_processing_status,
               dm.rights_statement AS draft_image_rights_statement
        FROM categories c
        LEFT JOIN categories p ON p.id = c.parent_id
        LEFT JOIN category_draft_revisions dr ON dr.category_id = c.id
        LEFT JOIN category_translations ct
          ON ct.category_id = c.id AND ct.locale = 'en'
        LEFT JOIN media_assets m ON m.id = c.image_media_asset_id
        LEFT JOIN media_assets dm ON dm.id = dr.image_media_asset_id
        WHERE c.id = $1
      `,
      [categoryId],
    )) as unknown as CategoryRow[];

    const row = rows[0];
    if (!row) throw new NotFoundException('Category was not found.');

    const hasDraft = row.draft_title !== null;
    const title = hasDraft ? row.draft_title : row.name;
    const summary = hasDraft ? row.draft_summary : row.summary;
    const description = hasDraft ? row.draft_description : row.description;
    const imageMediaAssetId = hasDraft ? row.draft_image_media_asset_id : row.image_media_asset_id;
    const imageProcessingStatus = hasDraft
      ? row.draft_image_processing_status
      : row.image_processing_status;
    const imageRightsStatement = hasDraft
      ? row.draft_image_rights_statement
      : row.image_rights_statement;

    const issues = evaluateCategoryReadiness({
      status: row.status,
      parentId: row.parent_id,
      parentStatus: row.parent_status,
      parentPublicationStatus: row.parent_publication_status,
      title,
      summary,
      description,
      imageMediaAssetId,
      imageProcessingStatus,
      imageRightsStatement,
    });

    return {
      categoryId,
      publishable: issues.length === 0,
      issues,
    };
  }

  async publishCategory(actorUserId: string, categoryId: string) {
    return this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `
          SELECT c.id, c.parent_id, c.status, c.publication_status, c.image_media_asset_id, c.position,
                 ct.name, ct.summary, ct.description,
                 dr.title AS draft_title, dr.summary AS draft_summary,
                 dr.description AS draft_description,
                 dr.image_media_asset_id AS draft_image_media_asset_id,
                 dr.position AS draft_position
          FROM categories c
          LEFT JOIN category_draft_revisions dr ON dr.category_id = c.id
          LEFT JOIN category_translations ct
            ON ct.category_id = c.id AND ct.locale = 'en'
          WHERE c.id = $1
          FOR UPDATE OF c
        `,
        [categoryId],
      )) as unknown as CategoryRow[];

      const row = rows[0];
      if (!row) throw new NotFoundException('Category was not found.');

      if (row.status !== 'active') {
        throw new ConflictException('Archived categories cannot be published.');
      }

      const hasDraft = row.draft_title !== null;
      const title = (hasDraft ? row.draft_title : row.name)?.trim() ?? '';
      const summary = (hasDraft ? row.draft_summary : row.summary)?.trim() ?? '';
      const description = (hasDraft ? row.draft_description : row.description)?.trim() ?? '';
      const imageAssetId = hasDraft ? row.draft_image_media_asset_id : row.image_media_asset_id;
      const position = hasDraft && row.draft_position !== null ? row.draft_position : row.position;

      if (row.publication_status === 'published' && !hasDraft) {
        throw new ConflictException('Category is already published with no pending changes.');
      }

      let parentStatus: string | null = null;
      let parentPublicationStatus: string | null = null;
      if (row.parent_id) {
        const parentRows = await manager.query<
          Array<{ status: string; publication_status: string }>
        >(
          `SELECT status, publication_status
           FROM categories
           WHERE id = $1
           FOR SHARE`,
          [row.parent_id],
        );
        const parent = parentRows[0];
        if (!parent || parent.status !== 'active') {
          throw new ConflictException('Parent category is archived or unavailable.');
        }
        if (parent.publication_status !== 'published') {
          throw new ConflictException(
            'Parent category must be published before this subcategory can publish.',
          );
        }
        parentStatus = parent.status;
        parentPublicationStatus = parent.publication_status;
      }

      let imageProcessingStatus: string | null = null;
      let imageRightsStatement: string | null = null;
      if (imageAssetId) {
        const mediaRows = await manager.query<
          Array<{ processing_status: string; rights_statement: string | null }>
        >(
          `SELECT processing_status, rights_statement
           FROM media_assets
           WHERE id = $1
           FOR SHARE`,
          [imageAssetId],
        );
        imageProcessingStatus = mediaRows[0]?.processing_status ?? null;
        imageRightsStatement = mediaRows[0]?.rights_statement ?? null;
      }

      const issues = evaluateCategoryReadiness({
        status: row.status,
        parentId: row.parent_id,
        parentStatus,
        parentPublicationStatus,
        title,
        summary,
        description,
        imageMediaAssetId: imageAssetId,
        imageProcessingStatus,
        imageRightsStatement,
      });

      if (issues.length > 0) {
        throw new BadRequestException({
          message: 'Category is not ready for publication.',
          issues,
        });
      }

      await manager.query(
        `UPDATE categories
         SET publication_status = 'published',
             image_media_asset_id = $2,
             position = $3,
             updated_at = now()
         WHERE id = $1`,
        [categoryId, imageAssetId, position],
      );

      await manager.query(
        `INSERT INTO category_translations (category_id, locale, name, summary, description, updated_at)
         VALUES ($1, 'en', $2, $3, $4, now())
         ON CONFLICT (category_id, locale) DO UPDATE
         SET name = EXCLUDED.name, summary = EXCLUDED.summary, description = EXCLUDED.description, updated_at = now()`,
        [categoryId, title, summary, description],
      );

      if (hasDraft) {
        await manager.query(`DELETE FROM category_draft_revisions WHERE category_id = $1`, [
          categoryId,
        ]);
      }

      await manager.query(
        `INSERT INTO content_audit_events (actor_user_id, action, target_type, target_id, metadata)
         VALUES ($1, $2, 'category', $3, $4::jsonb)`,
        [
          actorUserId,
          'category.published',
          categoryId,
          JSON.stringify({ promotedDraft: hasDraft, imageMediaAssetId: imageAssetId }),
        ],
      );

      return {
        id: categoryId,
        publicationStatus: 'published',
        promotedDraft: hasDraft,
      };
    });
  }

  async unpublishCategory(actorUserId: string, categoryId: string) {
    return this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `SELECT id, status, publication_status FROM categories WHERE id = $1 FOR UPDATE`,
        [categoryId],
      )) as unknown as Array<{ id: string; status: string; publication_status: string }>;

      const row = rows[0];
      if (!row) throw new NotFoundException('Category was not found.');

      if (row.status !== 'active') {
        throw new ConflictException('Archived categories cannot be unpublished.');
      }

      if (row.publication_status !== 'published') {
        throw new ConflictException('Category is not currently published.');
      }

      await manager.query(
        `UPDATE categories SET publication_status = 'draft', updated_at = now() WHERE id = $1`,
        [categoryId],
      );

      await manager.query(
        `INSERT INTO content_audit_events (actor_user_id, action, target_type, target_id, metadata)
         VALUES ($1, $2, 'category', $3, '{}'::jsonb)`,
        [actorUserId, 'category.unpublished', categoryId],
      );

      return {
        id: categoryId,
        publicationStatus: 'draft',
      };
    });
  }

  async listRecordTypes(categoryId: string, locale: string) {
    const rows = (await this.dataSource.query(
      `
        SELECT rt.id, rt.stable_key, crt.position, rtt.name, rtt.description,
               crt.active_template_version_id
        FROM category_record_types crt
        JOIN categories c ON c.id = crt.category_id AND c.status = 'active'
        LEFT JOIN categories p ON p.id = c.parent_id
        JOIN record_types rt ON rt.id = crt.record_type_id AND rt.status = 'active'
        JOIN template_versions tv
          ON tv.id = crt.active_template_version_id AND tv.status = 'active'
        JOIN record_templates t
          ON t.id = tv.template_id AND t.record_type_id = rt.id AND t.status = 'active'
        LEFT JOIN record_type_translations rtt
          ON rtt.record_type_id = rt.id AND rtt.locale = $2
        WHERE crt.category_id = $1 AND crt.status = 'active'
          AND (p.id IS NULL OR p.status = 'active')
        ORDER BY crt.position, rt.stable_key
      `,
      [categoryId, locale],
    )) as unknown as RecordTypeRow[];

    return {
      items: rows.map((row) => ({
        id: row.id,
        stableKey: row.stable_key,
        position: row.position,
        name: row.name ?? row.stable_key,
        description: row.description,
        activeTemplateVersionId: row.active_template_version_id,
        locale,
        translationAvailable: row.name !== null,
      })),
    };
  }

  async getActiveTemplate(categoryId: string, recordTypeId: string, locale: string) {
    const templateRows = (await this.dataSource.query(
      `
        SELECT tv.id AS version_id, tv.template_id, t.stable_key, t.name, tv.version
        FROM category_record_types crt
        JOIN categories c
          ON c.id = crt.category_id AND c.status = 'active' AND c.records_allowed = true
        LEFT JOIN categories p ON p.id = c.parent_id
        JOIN record_types rt ON rt.id = crt.record_type_id AND rt.status = 'active'
        JOIN template_versions tv
          ON tv.id = crt.active_template_version_id AND tv.status = 'active'
        JOIN record_templates t
          ON t.id = tv.template_id AND t.record_type_id = rt.id AND t.status = 'active'
        WHERE crt.category_id = $1 AND crt.record_type_id = $2 AND crt.status = 'active'
          AND (p.id IS NULL OR p.status = 'active')
      `,
      [categoryId, recordTypeId],
    )) as unknown as TemplateRow[];
    const template = templateRows[0];
    if (!template) {
      throw new NotFoundException(
        'No active scientific template is configured for this selection.',
      );
    }

    const fields = await this.loadFields(template.version_id, locale);
    return {
      id: template.template_id,
      stableKey: template.stable_key,
      name: template.name,
      version: { id: template.version_id, number: template.version, status: 'active' },
      fields: fields.map((field) => this.presentField(field, locale)),
    };
  }

  async getTemplateVersion(versionId: string, locale: string) {
    const templateRows = (await this.dataSource.query(
      `
        SELECT tv.id AS version_id, tv.template_id, t.stable_key, t.name, tv.version, tv.status
        FROM template_versions tv
        JOIN record_templates t ON t.id = tv.template_id
        WHERE tv.id = $1
      `,
      [versionId],
    )) as unknown as Array<{
      version_id: string;
      template_id: string;
      stable_key: string;
      name: string;
      version: number;
      status: string;
    }>;
    const template = templateRows[0];
    if (!template) {
      throw new NotFoundException('Scientific template version was not found.');
    }

    const fields = await this.loadFields(template.version_id, locale);
    return {
      id: template.template_id,
      stableKey: template.stable_key,
      name: template.name,
      version: { id: template.version_id, number: template.version, status: template.status },
      fields: fields.map((field) => this.presentField(field, locale)),
    };
  }

  async previewMigration(
    fromVersionId: string,
    toVersionId: string,
    mapping: Record<string, string | null>,
  ) {
    this.assertMapping(mapping);
    const versions = (await this.dataSource.query(
      `SELECT id, template_id, version, status FROM template_versions WHERE id = ANY($1::uuid[])`,
      [[fromVersionId, toVersionId]],
    )) as unknown as VersionRow[];
    const from = versions.find((item) => item.id === fromVersionId);
    const to = versions.find((item) => item.id === toVersionId);
    if (!from || !to) throw new NotFoundException('One or both template versions were not found.');
    if (from.template_id !== to.template_id) {
      throw new BadRequestException('A migration preview must stay within one record template.');
    }
    if (from.id === to.id) {
      throw new BadRequestException('Choose two different template versions.');
    }

    const targetFields = (await this.loadFields(to.id, 'en')).map((field) =>
      this.toDefinition(field),
    );
    const records = (await this.dataSource.query(
      `SELECT id, attributes FROM scientific_records WHERE template_version_id = $1 ORDER BY id`,
      [from.id],
    )) as unknown as PreviewRecordRow[];

    const results = records.map((record) => {
      const mapped = applyFieldMapping(record.attributes, targetFields, mapping);
      return { recordId: record.id, issues: validateAttributes(targetFields, mapped, true) };
    });
    const invalid = results.filter((result) => result.issues.length > 0);

    return {
      fromVersion: from.version,
      toVersion: to.version,
      totalRecords: results.length,
      validRecords: results.length - invalid.length,
      invalidRecords: invalid.length,
      issues: invalid.slice(0, 100),
      truncated: invalid.length > 100,
      recordsChanged: false,
    };
  }

  async listStructureRequests(limit = 50, offset = 0) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    const rows = await this.dataSource.query<StructureRequestRow[]>(
      `
        SELECT * FROM scientific_structure_requests
        ORDER BY created_at DESC, id
        LIMIT $1 OFFSET $2
      `,
      [safeLimit, safeOffset],
    );
    const countRows = await this.dataSource.query<Array<{ total: string }>>(
      `SELECT COUNT(*)::text AS total FROM scientific_structure_requests`,
    );
    return {
      items: rows.map((row) => this.presentStructureRequest(row)),
      total: Number(countRows[0]?.total ?? 0),
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  async createStructureRequest(actorUserId: string, input: CreateStructureRequestDto) {
    const proposedCategoryName = input.proposedCategoryName?.trim() || null;
    const proposedRecordTypeName = input.proposedRecordTypeName?.trim() || null;
    if (!proposedCategoryName && !proposedRecordTypeName) {
      throw new BadRequestException(
        'Propose a category, a record type, or both so the request can be reviewed.',
      );
    }
    if (input.parentCategoryId) {
      const parents = await this.dataSource.query<Array<{ id: string }>>(
        `SELECT id FROM categories WHERE id = $1 AND status = 'active'`,
        [input.parentCategoryId],
      );
      if (!parents[0]) throw new NotFoundException('Parent category not found.');
    }

    const id = randomUUID();
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `
          INSERT INTO scientific_structure_requests (
            id, requested_by_user_id, parent_category_id, proposed_category_name,
            proposed_record_type_name, reason
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          id,
          actorUserId,
          input.parentCategoryId ?? null,
          proposedCategoryName,
          proposedRecordTypeName,
          input.reason.trim(),
        ],
      );
      await manager.query(
        `
          INSERT INTO content_audit_events
            (actor_user_id, action, target_type, target_id, metadata)
          VALUES ($1, 'scientific-structure.requested', 'structure-request', $2, $3::jsonb)
        `,
        [
          actorUserId,
          id,
          JSON.stringify({
            parentCategoryId: input.parentCategoryId ?? null,
            proposesCategory: proposedCategoryName !== null,
            proposesRecordType: proposedRecordTypeName !== null,
          }),
        ],
      );
    });
    const rows = await this.dataSource.query<StructureRequestRow[]>(
      `SELECT * FROM scientific_structure_requests WHERE id = $1`,
      [id],
    );
    const created = rows[0];
    if (!created) throw new NotFoundException('Structure request was not found after creation.');
    return this.presentStructureRequest(created);
  }

  async loadDefinitions(templateVersionId: string): Promise<FieldDefinition[]> {
    return (await this.loadFields(templateVersionId, 'en')).map((field) =>
      this.toDefinition(field),
    );
  }

  private async loadFields(templateVersionId: string, locale: string): Promise<FieldRow[]> {
    return this.dataSource.query<FieldRow[]>(
      `
        SELECT f.id, f.stable_key, f.data_type, f.required, f.validation, f.unit,
               f.searchable, f.filterable, f.position, f.status, ft.label, ft.help_text
        FROM field_definitions f
        LEFT JOIN field_definition_translations ft
          ON ft.field_definition_id = f.id AND ft.locale = $2
        WHERE f.template_version_id = $1
        ORDER BY f.position, f.stable_key
      `,
      [templateVersionId, locale],
    );
  }

  private presentField(field: FieldRow, locale: string) {
    return {
      id: field.id,
      stableKey: field.stable_key,
      dataType: field.data_type,
      required: field.required,
      validation: field.validation,
      unit: field.unit,
      searchable: field.searchable,
      filterable: field.filterable,
      position: field.position,
      status: field.status,
      label: field.label ?? field.stable_key,
      helpText: field.help_text,
      locale,
      translationAvailable: field.label !== null,
    };
  }

  private toDefinition(field: FieldRow): FieldDefinition {
    return {
      stableKey: field.stable_key,
      dataType: field.data_type,
      required: field.required,
      validation: field.validation,
      status: field.status,
    };
  }

  private assertMapping(mapping: Record<string, string | null>): void {
    const stableKey = /^[a-z][a-z0-9_]{0,99}$/;
    const targets = new Set<string>();
    for (const [source, target] of Object.entries(mapping)) {
      if (!stableKey.test(source) || (target !== null && !stableKey.test(target))) {
        throw new BadRequestException('Template field mappings must use stable field keys.');
      }
      if (target !== null && targets.has(target)) {
        throw new BadRequestException('Two source fields cannot map to the same target field.');
      }
      if (target !== null) targets.add(target);
    }
  }

  private presentStructureRequest(row: StructureRequestRow) {
    return {
      id: row.id,
      requestedByUserId: row.requested_by_user_id,
      parentCategoryId: row.parent_category_id,
      proposedCategoryName: row.proposed_category_name,
      proposedRecordTypeName: row.proposed_record_type_name,
      reason: row.reason,
      status: row.status,
      resolutionNote: row.resolution_note,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
