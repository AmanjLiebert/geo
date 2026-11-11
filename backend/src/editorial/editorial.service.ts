/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import {
  CreateManagedPageDto,
  CreateNewsDto,
  UpsertNewsTranslationDto,
  UpsertOrganizationDto,
  UpsertPageTranslationDto,
} from './dto/editorial.dto';

type EditorialKind = 'news' | 'page';

interface NewsListRow {
  id: string;
  slug: string | null;
  status: string;
  published_at: Date | string | null;
  updated_at: Date | string;
  title: string | null;
}

interface ManagedPageListRow {
  id: string;
  page_type: string;
  status: string;
  effective_at: Date | string | null;
  published_at: Date | string | null;
  updated_at: Date | string;
  title: string | null;
}

interface CountRow {
  total: string;
}

@Injectable()
export class EditorialService {
  constructor(private readonly dataSource: DataSource) {}

  async listNews(limit = 20, offset = 0, status?: string) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    const values: (number | string)[] = [safeLimit, safeOffset];
    const statusClause = status ? `WHERE n.status = $3` : '';
    if (status) values.push(status);

    const rows = (await this.dataSource.query(
      `SELECT n.id, n.slug, n.status, n.published_at, n.updated_at,
        t.headline AS title
       FROM news_articles n
       LEFT JOIN LATERAL (
         SELECT headline FROM news_translations
         WHERE news_article_id = n.id
         ORDER BY CASE WHEN locale = 'en' THEN 0 ELSE 1 END, locale LIMIT 1
       ) t ON true
       ${statusClause}
       ORDER BY n.updated_at DESC, n.id
       LIMIT $1 OFFSET $2`,
      values,
    )) as unknown as NewsListRow[];

    const countRows = (await this.dataSource.query(
      `SELECT COUNT(*)::text AS total FROM news_articles n ${status ? 'WHERE n.status = $1' : ''}`,
      status ? [status] : [],
    )) as unknown as CountRow[];

    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
        updatedAt: new Date(row.updated_at).toISOString(),
      })),
      total: Number(countRows[0]?.total ?? 0),
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  async listPages(limit = 20, offset = 0, status?: string) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    const values: (number | string)[] = [safeLimit, safeOffset];
    const statusClause = status ? `WHERE p.status = $3` : '';
    if (status) values.push(status);

    const rows = (await this.dataSource.query(
      `SELECT p.id, p.page_type, p.status, p.effective_at, p.published_at, p.updated_at,
        t.title
       FROM managed_pages p
       LEFT JOIN LATERAL (
         SELECT title FROM managed_page_translations
         WHERE managed_page_id = p.id
         ORDER BY CASE WHEN locale = 'en' THEN 0 ELSE 1 END, locale LIMIT 1
       ) t ON true
       ${statusClause}
       ORDER BY p.updated_at DESC, p.id
       LIMIT $1 OFFSET $2`,
      values,
    )) as unknown as ManagedPageListRow[];

    const countRows = (await this.dataSource.query(
      `SELECT COUNT(*)::text AS total FROM managed_pages p ${status ? 'WHERE p.status = $1' : ''}`,
      status ? [status] : [],
    )) as unknown as CountRow[];

    return {
      items: rows.map((row) => ({
        id: row.id,
        pageType: row.page_type,
        title: row.title,
        status: row.status,
        effectiveAt: row.effective_at ? new Date(row.effective_at).toISOString() : null,
        publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
        updatedAt: new Date(row.updated_at).toISOString(),
      })),
      total: Number(countRows[0]?.total ?? 0),
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  async createNews(actorUserId: string, input: CreateNewsDto) {
    const id = randomUUID();
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO news_articles (id, stable_id, slug, tags, source_links, author_user_id, scheduled_at, expires_at)
         VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8)`,
        [
          id,
          randomUUID(),
          input.slug ?? null,
          JSON.stringify(input.tags),
          JSON.stringify(input.sourceLinks),
          actorUserId,
          parseDate(input.scheduledAt),
          parseDate(input.expiresAt),
        ],
      );
      await this.revise(manager, 'news', id, actorUserId, 'news.created');
    });
    return this.getNews(id);
  }

  async getNews(id: string) {
    const rows = await this.dataSource.query(`SELECT * FROM news_articles WHERE id=$1`, [id]);
    if (!rows[0]) throw new NotFoundException('News article not found.');
    const translations = await this.dataSource.query(
      `SELECT * FROM news_translations WHERE news_article_id=$1 ORDER BY locale`,
      [id],
    );
    return { ...rows[0], translations };
  }

  async newsTranslation(
    actorUserId: string,
    id: string,
    locale: string,
    input: UpsertNewsTranslationDto,
  ) {
    await this.assertEditable('news', id);
    await this.dataSource.transaction(async (manager) => {
      const status = 'draft';
      await manager.query(
        `INSERT INTO news_translations (news_article_id,locale,headline,summary,body,status,translator_user_id,reviewer_user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (news_article_id,locale) DO UPDATE SET headline=EXCLUDED.headline,
           summary=EXCLUDED.summary,body=EXCLUDED.body,status=EXCLUDED.status,
           translator_user_id=EXCLUDED.translator_user_id,reviewer_user_id=EXCLUDED.reviewer_user_id,updated_at=now()`,
        [
          id,
          locale,
          input.headline.trim(),
          input.summary?.trim() || null,
          input.body.trim(),
          status,
          actorUserId,
          null,
        ],
      );
      await manager.query(`UPDATE news_articles SET updated_at=now() WHERE id=$1`, [id]);
      await this.revise(manager, 'news', id, actorUserId, `news.translation.${locale}`);
    });
    return this.getNews(id);
  }

  async createPage(actorUserId: string, input: CreateManagedPageDto) {
    const id = randomUUID();
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query(
          `INSERT INTO managed_pages (id,page_type,effective_at) VALUES ($1,$2,$3)`,
          [id, input.pageType, parseDate(input.effectiveAt)],
        );
        await this.revise(manager, 'page', id, actorUserId, 'page.created');
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('That managed page already exists.');
      throw error;
    }
    return this.getPage(id);
  }

  async getPage(id: string) {
    const rows = await this.dataSource.query(`SELECT * FROM managed_pages WHERE id=$1`, [id]);
    if (!rows[0]) throw new NotFoundException('Managed page not found.');
    const translations = await this.dataSource.query(
      `SELECT * FROM managed_page_translations WHERE managed_page_id=$1 ORDER BY locale`,
      [id],
    );
    return { ...rows[0], translations };
  }

  async pageTranslation(
    actorUserId: string,
    id: string,
    locale: string,
    input: UpsertPageTranslationDto,
  ) {
    await this.assertEditable('page', id);
    await this.dataSource.transaction(async (manager) => {
      const status = 'draft';
      await manager.query(
        `INSERT INTO managed_page_translations (managed_page_id,locale,title,body,status,translator_user_id,reviewer_user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (managed_page_id,locale) DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,
           status=EXCLUDED.status,translator_user_id=EXCLUDED.translator_user_id,
           reviewer_user_id=EXCLUDED.reviewer_user_id,updated_at=now()`,
        [id, locale, input.title.trim(), input.body.trim(), status, actorUserId, null],
      );
      await manager.query(`UPDATE managed_pages SET updated_at=now() WHERE id=$1`, [id]);
      await this.revise(manager, 'page', id, actorUserId, `page.translation.${locale}`);
    });
    return this.getPage(id);
  }

  async reviewTranslation(kind: EditorialKind, reviewerUserId: string, id: string, locale: string) {
    await this.assertEditable(kind, id);
    const table = kind === 'news' ? 'news_translations' : 'managed_page_translations';
    const foreignKey = kind === 'news' ? 'news_article_id' : 'managed_page_id';
    const rows = (await this.dataSource.query(
      `SELECT translator_user_id FROM ${table} WHERE ${foreignKey}=$1 AND locale=$2`,
      [id, locale],
    )) as unknown as Array<{ translator_user_id: string | null }>;
    if (!rows[0]) throw new NotFoundException('Translation not found.');
    if (rows[0].translator_user_id === reviewerUserId) {
      throw new BadRequestException('A translator cannot review their own translation.');
    }
    await this.dataSource.query(
      `UPDATE ${table} SET status='reviewed',reviewer_user_id=$3,updated_at=now()
       WHERE ${foreignKey}=$1 AND locale=$2`,
      [id, locale, reviewerUserId],
    );
    return kind === 'news' ? this.getNews(id) : this.getPage(id);
  }

  async submit(kind: EditorialKind, actorUserId: string, id: string) {
    const issues = await this.publicationIssues(kind, id);
    if (issues.length)
      throw new BadRequestException({ message: 'Content is not ready for review.', issues });
    await this.dataSource.transaction(async (manager) => {
      await this.lock(manager, kind, id, 'draft');
      await manager.query(
        `UPDATE ${kind === 'news' ? 'news_articles' : 'managed_pages'} SET status='in_review',updated_at=now() WHERE id=$1`,
        [id],
      );
      await this.revise(manager, kind, id, actorUserId, `${kind}.submitted-for-review`);
    });
    return kind === 'news' ? this.getNews(id) : this.getPage(id);
  }

  async publish(kind: EditorialKind, reviewerUserId: string, id: string) {
    const issues = await this.publicationIssues(kind, id, reviewerUserId);
    if (issues.length)
      throw new BadRequestException({ message: 'Publication checks failed.', issues });
    await this.dataSource.transaction(async (manager) => {
      const row = await this.lock(manager, kind, id, 'in_review');
      const authorId = kind === 'news' ? String(row.author_user_id) : null;
      if (authorId === reviewerUserId)
        throw new BadRequestException('The news author cannot publish their own article.');
      const translations = kind === 'news' ? 'news_translations' : 'managed_page_translations';
      const foreignKey = kind === 'news' ? 'news_article_id' : 'managed_page_id';
      await manager.query(
        `UPDATE ${translations} SET status='published',reviewer_user_id=$2,updated_at=now() WHERE ${foreignKey}=$1 AND status='reviewed'`,
        [id, reviewerUserId],
      );
      await manager.query(
        `UPDATE ${kind === 'news' ? 'news_articles' : 'managed_pages'} SET status='published',reviewed_by_user_id=$2,published_at=COALESCE(published_at,now()),updated_at=now() WHERE id=$1`,
        [id, reviewerUserId],
      );
      await this.revise(manager, kind, id, reviewerUserId, `${kind}.published`);
    });
    return kind === 'news' ? this.getNews(id) : this.getPage(id);
  }

  async upsertOrganization(actorUserId: string, input: UpsertOrganizationDto) {
    const id = randomUUID();
    await this.dataSource.query(
      `INSERT INTO organization_profiles (id,stable_key,legal_name,display_name,ownership_statement,contact_email,contact_phone,public_links,updated_by_user_id)
       VALUES ($1,'primary',$2,$3,$4,$5,$6,$7::jsonb,$8)
       ON CONFLICT (stable_key) DO UPDATE SET legal_name=EXCLUDED.legal_name,display_name=EXCLUDED.display_name,
         ownership_statement=EXCLUDED.ownership_statement,contact_email=EXCLUDED.contact_email,
         contact_phone=EXCLUDED.contact_phone,public_links=EXCLUDED.public_links,
         updated_by_user_id=EXCLUDED.updated_by_user_id,updated_at=now()`,
      [
        id,
        input.legalName.trim(),
        input.displayName.trim(),
        input.ownershipStatement.trim(),
        input.contactEmail ?? null,
        input.contactPhone ?? null,
        JSON.stringify(input.publicLinks),
        actorUserId,
      ],
    );
    const rows = await this.dataSource.query(
      `SELECT * FROM organization_profiles WHERE stable_key='primary'`,
    );
    return rows[0];
  }

  private async publicationIssues(kind: EditorialKind, id: string, reviewerUserId?: string) {
    const table = kind === 'news' ? 'news_articles' : 'managed_pages';
    const translationTable = kind === 'news' ? 'news_translations' : 'managed_page_translations';
    const foreignKey = kind === 'news' ? 'news_article_id' : 'managed_page_id';
    const rows = await this.dataSource.query(`SELECT * FROM ${table} WHERE id=$1`, [id]);
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row)
      throw new NotFoundException(
        kind === 'news' ? 'News article not found.' : 'Managed page not found.',
      );
    const issues: Array<{ field: string; code: string; message: string }> = [];
    const translations = await this.dataSource.query(
      `SELECT count(*)::int AS count FROM ${translationTable} WHERE ${foreignKey}=$1 AND status='reviewed'
       AND reviewer_user_id IS NOT NULL AND reviewer_user_id IS DISTINCT FROM translator_user_id`,
      [id],
    );
    if (Number(translations[0]?.count ?? 0) < 1)
      issues.push({
        field: 'translations',
        code: 'reviewed_required',
        message: 'At least one reviewed translation is required.',
      });
    if (kind === 'news') {
      if (!Array.isArray(row.source_links) || row.source_links.length < 1)
        issues.push({
          field: 'sourceLinks',
          code: 'required',
          message: 'News requires at least one source link.',
        });
      if (reviewerUserId && row.author_user_id === reviewerUserId)
        issues.push({
          field: 'reviewer',
          code: 'independent',
          message: 'The author cannot publish their own article.',
        });
    }
    return issues;
  }

  private async assertEditable(kind: EditorialKind, id: string) {
    const table = kind === 'news' ? 'news_articles' : 'managed_pages';
    const rows = await this.dataSource.query(`SELECT status FROM ${table} WHERE id=$1`, [id]);
    if (!rows[0]) throw new NotFoundException('Editorial content not found.');
    if (['published', 'archived'].includes(String(rows[0].status)))
      throw new ConflictException('Published or archived content is not directly editable.');
  }

  private async lock(
    manager: EntityManager,
    kind: EditorialKind,
    id: string,
    expected: string,
  ): Promise<Record<string, unknown>> {
    const table = kind === 'news' ? 'news_articles' : 'managed_pages';
    const rows = await manager.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`, [id]);
    if (!rows[0]) throw new NotFoundException('Editorial content not found.');
    if (rows[0].status !== expected)
      throw new ConflictException(
        `Only ${expected.replace('_', ' ')} content can perform this action.`,
      );
    return rows[0] as Record<string, unknown>;
  }

  private async revise(
    manager: EntityManager,
    kind: EditorialKind,
    id: string,
    actorUserId: string,
    reason: string,
  ) {
    const table = kind === 'news' ? 'news_articles' : 'managed_pages';
    const revisionTable = kind === 'news' ? 'news_revisions' : 'managed_page_revisions';
    const foreignKey = kind === 'news' ? 'news_article_id' : 'managed_page_id';
    const translations = kind === 'news' ? 'news_translations' : 'managed_page_translations';
    await manager.query(
      `INSERT INTO ${revisionTable} (${foreignKey},revision,snapshot,reason,actor_user_id)
       SELECT c.id,COALESCE((SELECT max(revision)+1 FROM ${revisionTable} WHERE ${foreignKey}=c.id),1),
         jsonb_build_object('content',to_jsonb(c),'translations',COALESCE((SELECT jsonb_agg(t) FROM ${translations} t WHERE t.${foreignKey}=c.id),'[]'::jsonb)),
         $2,$3 FROM ${table} c WHERE c.id=$1`,
      [id, reason, actorUserId],
    );
  }
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid date.');
  return parsed;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
