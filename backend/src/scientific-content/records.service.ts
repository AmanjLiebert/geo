import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { UpsertRecordTranslationDto } from './dto/upsert-record-translation.dto';
import {
  ContentTranslationStatus,
  FieldDataType,
  FieldDefinition,
  ScientificRecordStatus,
} from './scientific-content.types';
import { validateAttributes } from './template-validation';
import { ScientificTrustService } from '../publishing/scientific-trust.service';

interface RecordRow {
  id: string;
  stable_id: string;
  slug: string | null;
  status: ScientificRecordStatus;
  category_id: string | null;
  record_type_id: string | null;
  template_version_id: string | null;
  attributes: Record<string, unknown>;
  owner_user_id: string;
  created_at: Date;
  updated_at: Date;
}

interface RecordListRow {
  id: string;
  status: ScientificRecordStatus;
  is_classified: boolean;
  updated_at: Date;
  title: string | null;
}

interface TranslationRow {
  locale: string;
  title: string;
  summary: string | null;
  description: string | null;
  source_locale: string | null;
  status: string;
  translator_user_id: string | null;
  reviewer_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ClassificationRow {
  category_id: string;
  record_type_id: string;
  template_version_id: string;
}

interface FieldRow {
  stable_key: string;
  data_type: FieldDataType;
  required: boolean;
  validation: Record<string, unknown>;
  status: 'active' | 'deprecated';
}

interface CountRow {
  total: string;
}

interface RevisionRow {
  id: string;
  revision: number;
  snapshot: Record<string, unknown>;
  reason: string;
  actor_user_id: string | null;
  created_at: Date;
}

interface SavedRecordRow {
  id: string;
  stable_id: string;
  slug: string | null;
  title: string | null;
  saved_at: Date;
  updated_at: Date;
}

@Injectable()
export class RecordsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly trust: ScientificTrustService,
  ) {}

  async list(limit = 50, offset = 0, status?: string) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    const values: unknown[] = [safeLimit, safeOffset];
    const statusClause = status ? `WHERE r.status = $3` : '';
    if (status) values.push(status);

    const rows = (await this.dataSource.query(
      `
        SELECT
          r.id,
          r.status,
          (r.category_id IS NOT NULL AND r.record_type_id IS NOT NULL) AS is_classified,
          r.updated_at,
          t.title
        FROM scientific_records r
        LEFT JOIN LATERAL (
          SELECT title FROM record_translations
          WHERE record_id = r.id
          ORDER BY CASE WHEN locale = 'en' THEN 0 ELSE 1 END, locale
          LIMIT 1
        ) t ON true
        ${statusClause}
        ORDER BY r.updated_at DESC, r.id
        LIMIT $1 OFFSET $2
      `,
      values,
    )) as unknown as RecordListRow[];
    const countRows = (await this.dataSource.query(
      `SELECT COUNT(*)::text AS total FROM scientific_records r ${status ? 'WHERE r.status = $1' : ''}`,
      status ? [status] : [],
    )) as unknown as CountRow[];

    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        isClassified: Boolean(row.is_classified),
        updatedAt: new Date(row.updated_at).toISOString(),
      })),
      total: Number(countRows[0]?.total ?? 0),
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  async get(recordId: string) {
    const record = await this.findRecord(this.dataSource, recordId, false);
    const translations = await this.loadTranslations(this.dataSource, recordId);
    return {
      ...this.presentRecord(record),
      translations: translations.map(this.presentTranslation),
    };
  }

  async create(actorUserId: string, input: CreateRecordDto) {
    const id = randomUUID();
    const stableId = randomUUID();
    const attributes = input.attributes ?? {};

    try {
      await this.dataSource.transaction(async (manager) => {
        const classification = await this.resolveClassification(
          manager,
          input.categoryId,
          input.recordTypeId,
        );
        if (classification) {
          const fields = await this.loadFields(manager, classification.template_version_id);
          this.assertValidAttributes(fields, attributes, false);
        } else if (Object.keys(attributes).length > 0) {
          throw new BadRequestException(
            'An unclassified draft cannot contain template attributes.',
          );
        }

        await manager.query(
          `
          INSERT INTO scientific_records (
            id, stable_id, slug, status, category_id, record_type_id,
            template_version_id, attributes, owner_user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        `,
          [
            id,
            stableId,
            input.slug ?? null,
            classification
              ? ScientificRecordStatus.DRAFT
              : ScientificRecordStatus.UNCLASSIFIED_DRAFT,
            classification?.category_id ?? null,
            classification?.record_type_id ?? null,
            classification?.template_version_id ?? null,
            JSON.stringify(attributes),
            actorUserId,
          ],
        );
        await this.writeRevision(manager, id, actorUserId, 'record.created');
        await this.writeAudit(manager, actorUserId, 'scientific-record.created', id, {
          classified: classification !== null,
        });
      });
    } catch (error) {
      if (isScientificRecordSlugConflict(error)) {
        throw new ConflictException(
          'That identifier is already in use. Choose another or leave it blank.',
        );
      }
      throw error;
    }

    return this.get(id);
  }

  async update(actorUserId: string, recordId: string, input: UpdateRecordDto) {
    try {
      await this.dataSource.transaction(async (manager) => {
        const current = await this.findRecord(manager, recordId, true);
        this.assertEditable(current);

        const classificationChanged =
          input.categoryId !== undefined || input.recordTypeId !== undefined;
        let classification: ClassificationRow | null;
        if (classificationChanged) {
          if (current.status !== ScientificRecordStatus.UNCLASSIFIED_DRAFT) {
            throw new BadRequestException(
              'Reclassifying an already classified record is not permitted.',
            );
          }
          classification = await this.resolveClassification(
            manager,
            input.categoryId,
            input.recordTypeId,
          );
        } else if (current.template_version_id) {
          const activeCategories = await manager.query<Array<{ id: string }>>(
            `SELECT c.id FROM categories c
             LEFT JOIN categories p ON p.id = c.parent_id
             WHERE c.id = $1 AND c.status = 'active'
               AND (p.id IS NULL OR p.status = 'active')`,
            [current.category_id],
          );
          if (!activeCategories[0]) {
            throw new ConflictException(
              'The category for this record is archived or inactive.',
            );
          }
          classification = {
            category_id: current.category_id as string,
            record_type_id: current.record_type_id as string,
            template_version_id: current.template_version_id,
          };
        } else {
          classification = null;
        }

        const attributes = input.attributes ?? current.attributes;
        if (classification) {
          const fields = await this.loadFields(manager, classification.template_version_id);
          this.assertValidAttributes(fields, attributes, false);
        } else if (Object.keys(attributes).length > 0) {
          throw new BadRequestException(
            'An unclassified draft cannot contain template attributes.',
          );
        }

        await manager.query(
          `
          UPDATE scientific_records
          SET slug = $2,
              status = $3,
              category_id = $4,
              record_type_id = $5,
              template_version_id = $6,
              attributes = $7::jsonb,
              updated_at = now()
          WHERE id = $1
        `,
          [
            recordId,
            input.slug === undefined ? current.slug : input.slug,
            classification
              ? ScientificRecordStatus.DRAFT
              : ScientificRecordStatus.UNCLASSIFIED_DRAFT,
            classification?.category_id ?? null,
            classification?.record_type_id ?? null,
            classification?.template_version_id ?? null,
            JSON.stringify(attributes),
          ],
        );
        await this.writeRevision(manager, recordId, actorUserId, 'record.updated');
        await this.writeAudit(manager, actorUserId, 'scientific-record.updated', recordId, {});
      });
    } catch (error) {
      if (isScientificRecordSlugConflict(error)) {
        throw new ConflictException(
          'That identifier is already in use. Choose another or leave it blank.',
        );
      }
      throw error;
    }

    return this.get(recordId);
  }

  async upsertTranslation(
    actorUserId: string,
    recordId: string,
    locale: string,
    input: UpsertRecordTranslationDto,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const record = await this.findRecord(manager, recordId, true);
      this.assertEditable(record);
      const status = ContentTranslationStatus.DRAFT;
      await manager.query(
        `
          INSERT INTO record_translations (
            record_id, locale, title, summary, description, source_locale, status,
            translator_user_id, reviewer_user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (record_id, locale) DO UPDATE SET
            title = EXCLUDED.title,
            summary = EXCLUDED.summary,
            description = EXCLUDED.description,
            source_locale = EXCLUDED.source_locale,
            status = EXCLUDED.status,
            translator_user_id = EXCLUDED.translator_user_id,
            reviewer_user_id = EXCLUDED.reviewer_user_id,
            updated_at = now()
        `,
        [
          recordId,
          locale,
          input.title.trim(),
          input.summary?.trim() || null,
          input.description?.trim() || null,
          input.sourceLocale ?? null,
          status,
          actorUserId,
          null,
        ],
      );
      await manager.query(`UPDATE scientific_records SET updated_at = now() WHERE id = $1`, [
        recordId,
      ]);
      await this.writeRevision(manager, recordId, actorUserId, `translation.${locale}.updated`);
      await this.writeAudit(
        manager,
        actorUserId,
        'scientific-record.translation-upserted',
        recordId,
        {
          locale,
          status,
        },
      );
    });

    return this.get(recordId);
  }

  async reviewTranslation(reviewerUserId: string, recordId: string, locale: string) {
    await this.dataSource.transaction(async (manager) => {
      const record = await this.findRecord(manager, recordId, true);
      this.assertEditable(record);
      const rows = (await manager.query(
        `SELECT translator_user_id FROM record_translations
         WHERE record_id = $1 AND locale = $2 FOR UPDATE`,
        [recordId, locale],
      )) as unknown as Array<{ translator_user_id: string | null }>;
      if (!rows[0]) throw new NotFoundException('Record translation not found.');
      if (rows[0].translator_user_id === reviewerUserId) {
        throw new BadRequestException('A translator cannot review their own translation.');
      }
      await manager.query(
        `UPDATE record_translations SET status = 'reviewed', reviewer_user_id = $3,
          updated_at = now() WHERE record_id = $1 AND locale = $2`,
        [recordId, locale, reviewerUserId],
      );
      await this.writeRevision(manager, recordId, reviewerUserId, `translation.${locale}.reviewed`);
      await this.writeAudit(
        manager,
        reviewerUserId,
        'scientific-record.translation-reviewed',
        recordId,
        { locale },
      );
    });
    return this.get(recordId);
  }

  async validate(recordId: string) {
    const record = await this.findRecord(this.dataSource, recordId, false);
    const issues: Array<{ field: string; code: string; message: string }> = [];
    if (!record.template_version_id) {
      issues.push({
        field: 'classification',
        code: 'required',
        message: 'Choose a category and record type before validation can pass.',
      });
    } else {
      const fields = await this.loadFields(this.dataSource, record.template_version_id);
      issues.push(...validateAttributes(fields, record.attributes, true));
    }
    const translations = await this.loadTranslations(this.dataSource, recordId);
    if (translations.length === 0) {
      issues.push({
        field: 'translations',
        code: 'required',
        message: 'At least one record translation with a title is required.',
      });
    }
    return { valid: issues.length === 0, issues };
  }

  async submitForReview(actorUserId: string, recordId: string) {
    const validation = await this.validate(recordId);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'The record is not ready for review.',
        issues: validation.issues,
      });
    }
    await this.dataSource.transaction(async (manager) => {
      const record = await this.findRecord(manager, recordId, true);
      this.assertEditable(record);
      await manager.query(
        `UPDATE scientific_records SET status = 'in_review', updated_at = now() WHERE id = $1`,
        [recordId],
      );
      await this.writeRevision(manager, recordId, actorUserId, 'record.submitted-for-review');
      await this.writeAudit(
        manager,
        actorUserId,
        'scientific-record.submitted-for-review',
        recordId,
        {},
      );
    });
    return this.get(recordId);
  }

  async publish(reviewerUserId: string, recordId: string) {
    const validation = await this.validate(recordId);
    const publication = await this.trust.publicationIssues(recordId, reviewerUserId);
    const issues = [...validation.issues, ...publication.issues];
    if (issues.length > 0) {
      throw new BadRequestException({ message: 'Publication checks failed.', issues });
    }
    await this.dataSource.transaction(async (manager) => {
      const record = await this.findRecord(manager, recordId, true);
      if (record.status !== ScientificRecordStatus.IN_REVIEW) {
        throw new ConflictException('Only a record in review can be published.');
      }
      await manager.query(
        `UPDATE record_translations SET status = 'published', reviewer_user_id = $2, updated_at = now()
         WHERE record_id = $1 AND status = 'reviewed'`,
        [recordId, reviewerUserId],
      );
      await manager.query(
        `UPDATE scientific_records SET status = 'published', reviewed_by_user_id = $2,
          published_at = now(), updated_at = now() WHERE id = $1`,
        [recordId, reviewerUserId],
      );
      await this.writeRevision(manager, recordId, reviewerUserId, 'record.published');
      await this.writeAudit(manager, reviewerUserId, 'scientific-record.published', recordId, {});
    });
    return this.get(recordId);
  }

  async archive(actorUserId: string, recordId: string) {
    await this.dataSource.transaction(async (manager) => {
      const record = await this.findRecord(manager, recordId, true);
      if (record.status === ScientificRecordStatus.ARCHIVED) {
        throw new ConflictException('The record is already archived.');
      }
      await manager.query(
        `UPDATE scientific_records SET status = 'archived', updated_at = now() WHERE id = $1`,
        [recordId],
      );
      await this.writeRevision(manager, recordId, actorUserId, 'record.archived');
      await this.writeAudit(manager, actorUserId, 'scientific-record.archived', recordId, {
        previousStatus: record.status,
      });
    });
    return this.get(recordId);
  }

  async restore(actorUserId: string, recordId: string) {
    await this.dataSource.transaction(async (manager) => {
      const record = await this.findRecord(manager, recordId, true);
      if (record.status !== ScientificRecordStatus.ARCHIVED) {
        throw new ConflictException('Only an archived record can be restored.');
      }
      const nextStatus = record.template_version_id
        ? ScientificRecordStatus.DRAFT
        : ScientificRecordStatus.UNCLASSIFIED_DRAFT;
      await manager.query(
        `UPDATE scientific_records SET status = $2, updated_at = now() WHERE id = $1`,
        [recordId, nextStatus],
      );
      await this.writeRevision(manager, recordId, actorUserId, 'record.restored');
      await this.writeAudit(manager, actorUserId, 'scientific-record.restored', recordId, {});
    });
    return this.get(recordId);
  }

  async revisions(recordId: string) {
    await this.findRecord(this.dataSource, recordId, false);
    const rows = (await this.dataSource.query(
      `
        SELECT id::text, revision, snapshot, reason, actor_user_id, created_at
        FROM record_revisions
        WHERE record_id = $1
        ORDER BY revision DESC
      `,
      [recordId],
    )) as unknown as RevisionRow[];
    return {
      items: rows.map((row) => ({
        id: row.id,
        revision: row.revision,
        snapshot: row.snapshot,
        reason: row.reason,
        actorUserId: row.actor_user_id,
        createdAt: row.created_at.toISOString(),
      })),
    };
  }

  async listSaved(userId: string) {
    const rows = (await this.dataSource.query(
      `
        SELECT r.id, r.stable_id, r.slug, t.title, sr.created_at AS saved_at, r.updated_at
        FROM saved_records sr
        JOIN scientific_records r ON r.id = sr.record_id AND r.status = 'published'
        LEFT JOIN LATERAL (
          SELECT title FROM record_translations
          WHERE record_id = r.id AND status = 'published'
          ORDER BY CASE WHEN locale = 'en' THEN 0 ELSE 1 END, locale
          LIMIT 1
        ) t ON true
        WHERE sr.user_id = $1
        ORDER BY sr.created_at DESC
      `,
      [userId],
    )) as unknown as SavedRecordRow[];
    return {
      items: rows.map((row) => ({
        id: row.id,
        stableId: row.stable_id,
        slug: row.slug,
        title: row.title,
        savedAt: row.saved_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      })),
    };
  }

  async save(userId: string, recordId: string): Promise<{ saved: true }> {
    const rows = (await this.dataSource.query(
      `SELECT id FROM scientific_records WHERE id = $1 AND status = 'published'`,
      [recordId],
    )) as unknown as Array<{ id: string }>;
    if (!rows[0]) throw new NotFoundException('Published record not found.');
    await this.dataSource.query(
      `INSERT INTO saved_records (user_id, record_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, recordId],
    );
    return { saved: true };
  }

  async unsave(userId: string, recordId: string): Promise<{ saved: false }> {
    await this.dataSource.query(`DELETE FROM saved_records WHERE user_id = $1 AND record_id = $2`, [
      userId,
      recordId,
    ]);
    return { saved: false };
  }

  private async resolveClassification(
    executor: DataSource | EntityManager,
    categoryId: string | null | undefined,
    recordTypeId: string | null | undefined,
  ): Promise<ClassificationRow | null> {
    if (!categoryId && !recordTypeId) return null;
    if (!categoryId || !recordTypeId) {
      throw new BadRequestException('Category and record type must be selected together.');
    }
    const rows = (await executor.query(
      `
        SELECT crt.category_id, crt.record_type_id,
               crt.active_template_version_id AS template_version_id
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
    )) as unknown as ClassificationRow[];
    if (!rows[0]) {
      throw new BadRequestException(
        'The selected category and record type do not have an active template.',
      );
    }
    return rows[0];
  }

  private async loadFields(
    executor: DataSource | EntityManager,
    templateVersionId: string,
  ): Promise<FieldDefinition[]> {
    const rows = (await executor.query(
      `
        SELECT stable_key, data_type, required, validation, status
        FROM field_definitions
        WHERE template_version_id = $1
        ORDER BY position, stable_key
      `,
      [templateVersionId],
    )) as unknown as FieldRow[];
    return rows.map((row) => ({
      stableKey: row.stable_key,
      dataType: row.data_type,
      required: row.required,
      validation: row.validation,
      status: row.status,
    }));
  }

  private assertValidAttributes(
    fields: FieldDefinition[],
    attributes: Record<string, unknown>,
    requireComplete: boolean,
  ): void {
    const issues = validateAttributes(fields, attributes, requireComplete);
    if (issues.length > 0) {
      throw new BadRequestException({ message: 'Record attributes are invalid.', issues });
    }
  }

  private async findRecord(
    executor: DataSource | EntityManager,
    recordId: string,
    lock: boolean,
  ): Promise<RecordRow> {
    const rows = (await executor.query(
      `SELECT * FROM scientific_records WHERE id = $1${lock ? ' FOR UPDATE' : ''}`,
      [recordId],
    )) as unknown as RecordRow[];
    if (!rows[0]) throw new NotFoundException('Scientific record not found.');
    return rows[0];
  }

  private async loadTranslations(
    executor: DataSource | EntityManager,
    recordId: string,
  ): Promise<TranslationRow[]> {
    return executor.query<TranslationRow[]>(
      `SELECT * FROM record_translations WHERE record_id = $1 ORDER BY locale`,
      [recordId],
    );
  }

  private assertEditable(record: RecordRow): void {
    if (record.status === ScientificRecordStatus.ARCHIVED) {
      throw new ConflictException('Restore the record before editing it.');
    }
    if (record.status === ScientificRecordStatus.PUBLISHED) {
      throw new ConflictException('Published records require the Phase 4 revision workflow.');
    }
  }

  private async writeRevision(
    manager: EntityManager,
    recordId: string,
    actorUserId: string,
    reason: string,
  ): Promise<void> {
    const record = await this.findRecord(manager, recordId, false);
    const translations = await this.loadTranslations(manager, recordId);
    await manager.query(
      `
        INSERT INTO record_revisions (record_id, revision, snapshot, reason, actor_user_id)
        SELECT $1, COALESCE(MAX(revision), 0) + 1, $2::jsonb, $3, $4
        FROM record_revisions
        WHERE record_id = $1
      `,
      [
        recordId,
        JSON.stringify({
          record: this.presentRecord(record),
          translations: translations.map(this.presentTranslation),
        }),
        reason,
        actorUserId,
      ],
    );
  }

  private async writeAudit(
    manager: EntityManager,
    actorUserId: string,
    action: string,
    recordId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await manager.query(
      `
        INSERT INTO content_audit_events
          (actor_user_id, action, target_type, target_id, metadata)
        VALUES ($1, $2, 'scientific-record', $3, $4::jsonb)
      `,
      [actorUserId, action, recordId, JSON.stringify(metadata)],
    );
  }

  private presentRecord(row: RecordRow) {
    return {
      id: row.id,
      stableId: row.stable_id,
      slug: row.slug,
      status: row.status,
      categoryId: row.category_id,
      recordTypeId: row.record_type_id,
      templateVersionId: row.template_version_id,
      attributes: row.attributes,
      ownerUserId: row.owner_user_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private readonly presentTranslation = (row: TranslationRow) => ({
    locale: row.locale,
    title: row.title,
    summary: row.summary,
    description: row.description,
    sourceLocale: row.source_locale,
    status: row.status,
    translatorUserId: row.translator_user_id,
    reviewerUserId: row.reviewer_user_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  });
}

function isScientificRecordSlugConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const value = error as { code?: unknown; constraint?: unknown; driverError?: unknown };
  if (value.code === '23505' && value.constraint === 'scientific_records_slug_key') return true;
  if (typeof value.driverError !== 'object' || value.driverError === null) return false;
  const driver = value.driverError as { code?: unknown; constraint?: unknown };
  return driver.code === '23505' && driver.constraint === 'scientific_records_slug_key';
}
