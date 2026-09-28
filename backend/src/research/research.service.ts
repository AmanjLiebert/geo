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
  AddContributorDto,
  AttachResearchMediaDto,
  CreateResearchDto,
  UpsertResearchTranslationDto,
} from './dto/research.dto';

interface ResearchRow {
  id: string;
  owner_user_id: string;
  status: string;
}

interface ResearchPublicationRow {
  id: string;
  stable_id: string;
  slug: string | null;
  status: string;
  publication_year: number | null;
  doi: string | null;
  rights_statement: string | null;
  owner_user_id: string;
  published_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  title: string | null;
}

interface CountRow {
  total: string;
}

@Injectable()
export class ResearchService {
  constructor(private readonly dataSource: DataSource) {}

  async list(limit = 50, offset = 0, status?: string) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    const values: unknown[] = [safeLimit, safeOffset];
    const statusClause = status ? `WHERE p.status = $3` : '';
    if (status) values.push(status);

    const rows = (await this.dataSource.query(
      `SELECT p.id, p.stable_id, p.slug, p.status, p.publication_year, p.doi,
        p.rights_statement, p.owner_user_id, p.published_at, p.created_at, p.updated_at,
        t.title
       FROM research_publications p
       LEFT JOIN LATERAL (
         SELECT title FROM research_translations WHERE research_publication_id = p.id
         ORDER BY CASE WHEN locale = 'en' THEN 0 ELSE 1 END, locale LIMIT 1
       ) t ON true
       ${statusClause}
       ORDER BY p.updated_at DESC, p.id
       LIMIT $1 OFFSET $2`,
      values,
    )) as unknown as ResearchPublicationRow[];

    const countRows = (await this.dataSource.query(
      `SELECT COUNT(*)::text AS total FROM research_publications p ${status ? 'WHERE p.status = $1' : ''}`,
      status ? [status] : [],
    )) as unknown as CountRow[];

    return {
      items: rows.map((row) => ({
        id: row.id,
        stableId: row.stable_id,
        slug: row.slug,
        status: row.status,
        publicationYear: row.publication_year,
        doi: row.doi,
        rightsStatement: row.rights_statement,
        ownerUserId: row.owner_user_id,
        publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
        title: row.title,
      })),
      total: Number(countRows[0]?.total ?? 0),
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  async get(id: string) {
    const rows = await this.dataSource.query(`SELECT * FROM research_publications WHERE id = $1`, [
      id,
    ]);
    if (!rows[0]) throw new NotFoundException('Research publication not found.');
    const translations = await this.dataSource.query(
      `SELECT * FROM research_translations WHERE research_publication_id = $1 ORDER BY locale`,
      [id],
    );
    const contributors = await this.dataSource.query(
      `SELECT * FROM research_contributors WHERE research_publication_id = $1 ORDER BY position, id`,
      [id],
    );
    return { ...rows[0], translations, contributors };
  }

  async create(actorUserId: string, input: CreateResearchDto) {
    const id = randomUUID();
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO research_publications (
          id, stable_id, slug, publication_year, doi, rights_statement, owner_user_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          id,
          randomUUID(),
          input.slug ?? null,
          input.publicationYear ?? null,
          input.doi ?? null,
          input.rightsStatement.trim(),
          actorUserId,
        ],
      );
      await this.revision(manager, id, actorUserId, 'research.created');
    });
    return this.get(id);
  }

  async upsertTranslation(
    actorUserId: string,
    id: string,
    locale: string,
    input: UpsertResearchTranslationDto,
  ) {
    await this.assertEditable(id);
    await this.dataSource.transaction(async (manager) => {
      const status = 'draft';
      await manager.query(
        `INSERT INTO research_translations (
          research_publication_id, locale, title, abstract, status, translator_user_id, reviewer_user_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (research_publication_id, locale) DO UPDATE SET
          title=EXCLUDED.title, abstract=EXCLUDED.abstract, status=EXCLUDED.status,
          translator_user_id=EXCLUDED.translator_user_id, reviewer_user_id=EXCLUDED.reviewer_user_id,
          updated_at=now()`,
        [id, locale, input.title.trim(), input.abstract?.trim() || null, status, actorUserId, null],
      );
      await manager.query(`UPDATE research_publications SET updated_at = now() WHERE id = $1`, [
        id,
      ]);
      await this.revision(manager, id, actorUserId, `research.translation.${locale}`);
    });
    return this.get(id);
  }

  async reviewTranslation(reviewerUserId: string, id: string, locale: string) {
    await this.assertEditable(id);
    const rows = (await this.dataSource.query(
      `SELECT translator_user_id FROM research_translations
       WHERE research_publication_id=$1 AND locale=$2`,
      [id, locale],
    )) as unknown as Array<{ translator_user_id: string | null }>;
    if (!rows[0]) throw new NotFoundException('Research translation not found.');
    if (rows[0].translator_user_id === reviewerUserId) {
      throw new BadRequestException('A translator cannot review their own translation.');
    }
    await this.dataSource.query(
      `UPDATE research_translations SET status='reviewed', reviewer_user_id=$3, updated_at=now()
       WHERE research_publication_id=$1 AND locale=$2`,
      [id, locale, reviewerUserId],
    );
    return this.get(id);
  }

  async addContributor(actorUserId: string, id: string, input: AddContributorDto) {
    await this.assertEditable(id);
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO research_contributors (
          id, research_publication_id, display_name, orcid, organization, contribution_role, position
        ) VALUES ($1,$2,$3,$4,$5,$6,
          (SELECT count(*) FROM research_contributors WHERE research_publication_id = $2))`,
        [
          randomUUID(),
          id,
          input.displayName.trim(),
          input.orcid ?? null,
          input.organization ?? null,
          input.contributionRole.trim(),
        ],
      );
      await this.revision(manager, id, actorUserId, 'research.contributor-added');
    });
    return this.get(id);
  }

  async attachMedia(actorUserId: string, id: string, input: AttachResearchMediaDto) {
    await this.assertEditable(id);
    const media = await this.dataSource.query(
      `SELECT id FROM media_assets WHERE id = $1 AND owner_user_id = $2 AND processing_status NOT IN ('rejected','archived')`,
      [input.mediaAssetId, actorUserId],
    );
    if (!media[0]) throw new NotFoundException('Media asset not found.');
    await this.dataSource.query(
      `INSERT INTO research_media (research_publication_id, media_asset_id, purpose)
       VALUES ($1,$2,$3) ON CONFLICT DO UPDATE SET purpose=EXCLUDED.purpose`,
      [id, input.mediaAssetId, input.purpose.trim()],
    );
    return { researchPublicationId: id, ...input };
  }

  async submit(actorUserId: string, id: string) {
    const issues = await this.publicationIssues(id);
    if (issues.length)
      throw new BadRequestException({ message: 'Research is not ready for review.', issues });
    await this.dataSource.transaction(async (manager) => {
      const row = await this.lock(manager, id);
      if (row.status !== 'draft')
        throw new ConflictException('Only draft research can enter review.');
      await manager.query(
        `UPDATE research_publications SET status='in_review', updated_at=now() WHERE id=$1`,
        [id],
      );
      await this.revision(manager, id, actorUserId, 'research.submitted-for-review');
    });
    return this.get(id);
  }

  async publish(reviewerUserId: string, id: string) {
    const issues = await this.publicationIssues(id, reviewerUserId);
    if (issues.length)
      throw new BadRequestException({ message: 'Research publication checks failed.', issues });
    await this.dataSource.transaction(async (manager) => {
      const row = await this.lock(manager, id);
      if (row.status !== 'in_review')
        throw new ConflictException('Only research in review can be published.');
      await manager.query(
        `UPDATE research_translations SET status='published', reviewer_user_id=$2, updated_at=now()
         WHERE research_publication_id=$1 AND status='reviewed'`,
        [id, reviewerUserId],
      );
      await manager.query(
        `UPDATE research_publications SET status='published', reviewed_by_user_id=$2,
          published_at=now(), updated_at=now() WHERE id=$1`,
        [id, reviewerUserId],
      );
      await this.revision(manager, id, reviewerUserId, 'research.published');
    });
    return this.get(id);
  }

  async archive(actorUserId: string, id: string) {
    await this.dataSource.transaction(async (manager) => {
      await this.lock(manager, id);
      await manager.query(
        `UPDATE research_publications SET status='archived', updated_at=now() WHERE id=$1`,
        [id],
      );
      await this.revision(manager, id, actorUserId, 'research.archived');
    });
    return this.get(id);
  }

  private async publicationIssues(id: string, reviewerUserId?: string) {
    const row = await this.find(id);
    const issues: Array<{ field: string; code: string; message: string }> = [];
    if (reviewerUserId === row.owner_user_id)
      issues.push({
        field: 'reviewer',
        code: 'independent',
        message: 'The author cannot publish their own research.',
      });
    const counts = await this.dataSource.query(
      `SELECT
        (SELECT count(*)::int FROM research_translations WHERE research_publication_id=$1 AND status='reviewed'
          AND reviewer_user_id IS NOT NULL AND reviewer_user_id IS DISTINCT FROM translator_user_id) AS translations,
        (SELECT count(*)::int FROM research_contributors WHERE research_publication_id=$1) AS contributors,
        (SELECT count(*)::int FROM research_media rm JOIN media_assets m ON m.id=rm.media_asset_id
          WHERE rm.research_publication_id=$1 AND m.processing_status <> 'approved') AS unsafe_media`,
      [id],
    );
    const count = counts[0] as { translations: number; contributors: number; unsafe_media: number };
    if (count.translations < 1)
      issues.push({
        field: 'translations',
        code: 'reviewed_required',
        message: 'At least one reviewed translation is required.',
      });
    if (count.contributors < 1)
      issues.push({
        field: 'contributors',
        code: 'required',
        message: 'At least one contributor is required.',
      });
    if (count.unsafe_media > 0)
      issues.push({
        field: 'media',
        code: 'not_approved',
        message: 'All attached documents and media must be approved.',
      });
    return issues;
  }

  private async assertEditable(id: string) {
    const row = await this.find(id);
    if (['published', 'archived'].includes(row.status))
      throw new ConflictException('Published or archived research is not directly editable.');
  }

  private async find(id: string): Promise<ResearchRow> {
    const rows = (await this.dataSource.query(
      `SELECT id, owner_user_id, status FROM research_publications WHERE id=$1`,
      [id],
    )) as unknown as ResearchRow[];
    if (!rows[0]) throw new NotFoundException('Research publication not found.');
    return rows[0];
  }

  private async lock(manager: EntityManager, id: string): Promise<ResearchRow> {
    const rows = (await manager.query(
      `SELECT id, owner_user_id, status FROM research_publications WHERE id=$1 FOR UPDATE`,
      [id],
    )) as unknown as ResearchRow[];
    if (!rows[0]) throw new NotFoundException('Research publication not found.');
    return rows[0];
  }

  private async revision(manager: EntityManager, id: string, actorUserId: string, reason: string) {
    await manager.query(
      `INSERT INTO research_revisions (research_publication_id, revision, snapshot, reason, actor_user_id)
       SELECT p.id, COALESCE((SELECT max(revision)+1 FROM research_revisions WHERE research_publication_id=p.id),1),
         jsonb_build_object('publication',to_jsonb(p),'translations',COALESCE((SELECT jsonb_agg(t) FROM research_translations t WHERE t.research_publication_id=p.id),'[]'::jsonb),'contributors',COALESCE((SELECT jsonb_agg(c) FROM research_contributors c WHERE c.research_publication_id=p.id),'[]'::jsonb)),
         $2,$3 FROM research_publications p WHERE p.id=$1`,
      [id, reason, actorUserId],
    );
  }
}
