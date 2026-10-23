import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface PublicCategoryRow {
  slug: string;
  parent_slug: string | null;
  records_allowed: boolean;
  name: string;
  summary: string | null;
  description: string | null;
  record_count: string;
  image_ready: boolean;
}

interface CountRow {
  total: string;
}

interface PublicRecordRow {
  record_id: string;
  public_id: string;
  slug: string | null;
  title: string;
  summary: string | null;
  description: string | null;
  category_slug: string;
  category_name: string;
  record_type_name: string;
  published_at: Date | null;
  updated_at: Date;
  image_ready: boolean;
  image_caption: string | null;
  image_description: string | null;
  image_alt_text: string | null;
  image_licence: string | null;
  image_credit: string | null;
}

interface PublicFieldRow {
  label: string;
  data_type: string;
  unit: string | null;
  value: unknown;
}

interface PublicLocationRow {
  label: string | null;
  visibility: string;
  region_label: string | null;
  public_precision_metres: number | null;
  geometry: unknown;
}

interface PublicReferenceRow {
  source_type: string;
  authors: unknown;
  title: string;
  publication: string | null;
  publication_year: number | null;
  identifier: string | null;
  pages_or_figure: string | null;
  source_url: string | null;
  rights_statement: string | null;
  evidence_kind: string;
}

@Injectable()
export class PublicScientificContentService {
  constructor(private readonly dataSource: DataSource) {}

  async listCategories(locale = 'en', limit = 50, offset = 0) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    const rows = await this.loadCategories(locale, safeLimit, safeOffset);
    const counts = await this.dataSource.query<CountRow[]>(
      `SELECT COUNT(*)::text AS total
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       JOIN category_translations ct ON ct.category_id = c.id AND ct.locale = $1
       WHERE c.status = 'active' AND c.publication_status = 'published'
         AND (p.id IS NULL OR (p.status = 'active' AND p.publication_status = 'published'))`,
      [locale],
    );
    return {
      items: rows.map((row) => this.presentCategory(row, locale)),
      total: Number(counts[0]?.total ?? 0),
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  async getCategory(slug: string, locale = 'en') {
    const rows = await this.loadCategories(locale, 1, 0, slug);
    const row = rows[0];
    if (!row) throw new NotFoundException('Published category not found.');
    return this.presentCategory(row, locale);
  }

  async listRecords(locale = 'en', limit = 20, offset = 0, categorySlug?: string) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    const params = [locale, categorySlug ?? null, safeLimit, safeOffset];
    const rows = await this.dataSource.query<PublicRecordRow[]>(
      `${this.recordCategoryCte()}
       SELECT r.id AS record_id, r.stable_id AS public_id, r.slug,
              t.title, t.summary, t.description,
              c.slug AS category_slug, ct.name AS category_name,
              rtt.name AS record_type_name,
              r.published_at, r.updated_at,
              (m.id IS NOT NULL) AS image_ready,
              rm.caption AS image_caption, rm.description AS image_description,
              rm.alt_text AS image_alt_text, m.licence AS image_licence,
              m.credit AS image_credit
       FROM scientific_records r
       JOIN categories c ON c.id = r.category_id
       LEFT JOIN categories p ON p.id = c.parent_id
       JOIN record_translations t
         ON t.record_id = r.id AND t.locale = $1 AND t.status = 'published'
       JOIN category_translations ct ON ct.category_id = c.id AND ct.locale = $1
       JOIN record_types rt ON rt.id = r.record_type_id AND rt.status = 'active'
       JOIN record_type_translations rtt ON rtt.record_type_id = rt.id AND rtt.locale = $1
       LEFT JOIN record_media rm ON rm.record_id = r.id AND rm.is_primary = true
       LEFT JOIN media_assets m ON m.id = rm.media_asset_id
         AND m.media_kind = 'image' AND m.processing_status = 'approved'
         AND btrim(m.rights_statement) <> ''
       WHERE r.status = 'published'
         AND c.status = 'active' AND c.publication_status = 'published'
         AND (p.id IS NULL OR (p.status = 'active' AND p.publication_status = 'published'))
         AND ($2::text IS NULL OR r.category_id IN (SELECT id FROM selected_categories))
       ORDER BY r.published_at DESC NULLS LAST, r.updated_at DESC, r.stable_id
       LIMIT $3 OFFSET $4`,
      params,
    );
    const counts = await this.dataSource.query<CountRow[]>(
      `${this.recordCategoryCte()}
       SELECT COUNT(*)::text AS total
       FROM scientific_records r
       JOIN categories c ON c.id = r.category_id
       LEFT JOIN categories p ON p.id = c.parent_id
       JOIN record_translations t
         ON t.record_id = r.id AND t.locale = $1 AND t.status = 'published'
       WHERE r.status = 'published'
         AND c.status = 'active' AND c.publication_status = 'published'
         AND (p.id IS NULL OR (p.status = 'active' AND p.publication_status = 'published'))
         AND ($2::text IS NULL OR r.category_id IN (SELECT id FROM selected_categories))`,
      [locale, categorySlug ?? null],
    );
    return {
      items: rows.map((row) => this.presentRecord(row, locale)),
      total: Number(counts[0]?.total ?? 0),
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  async getRecord(publicId: string, locale = 'en') {
    const rows = await this.dataSource.query<PublicRecordRow[]>(
      `${this.recordBaseSelect()}
       WHERE r.stable_id = $2 AND r.status = 'published'
         AND c.status = 'active' AND c.publication_status = 'published'
         AND (p.id IS NULL OR (p.status = 'active' AND p.publication_status = 'published'))`,
      [locale, publicId],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Published record not found.');

    const [fields, locations, references] = await Promise.all([
      this.dataSource.query<PublicFieldRow[]>(
        `SELECT COALESCE(fdt.label, fd.stable_key) AS label, fd.data_type, fd.unit,
                r.attributes -> fd.stable_key AS value
         FROM scientific_records r
         JOIN field_definitions fd ON fd.template_version_id = r.template_version_id
         LEFT JOIN field_definition_translations fdt
           ON fdt.field_definition_id = fd.id AND fdt.locale = $1
         WHERE r.id = $2 AND r.attributes ? fd.stable_key
         ORDER BY fd.position, fd.stable_key`,
        [locale, row.record_id],
      ),
      this.dataSource.query<PublicLocationRow[]>(
        `SELECT
           CASE WHEN visibility IN ('public', 'approximate') THEN label ELSE NULL END AS label,
           CASE WHEN visibility = 'public' THEN 'public'
                WHEN visibility = 'approximate' THEN 'approximate'
                WHEN region_label IS NOT NULL THEN 'region_only'
                ELSE 'hidden' END AS visibility,
           region_label,
           CASE WHEN visibility IN ('public', 'approximate')
                THEN public_precision_metres ELSE NULL END AS public_precision_metres,
           CASE WHEN visibility IN ('public', 'approximate') AND geometry IS NOT NULL
                THEN ST_AsGeoJSON(geometry)::jsonb ELSE NULL END AS geometry
         FROM public_record_locations
         WHERE record_id = $1
         ORDER BY id`,
        [row.record_id],
      ),
      this.dataSource.query<PublicReferenceRow[]>(
        `SELECT ref.source_type, ref.authors, ref.title, ref.publication,
                ref.publication_year, ref.identifier, ref.pages_or_figure,
                CASE WHEN ref.source_url ~ '^https://' THEN ref.source_url ELSE NULL END AS source_url,
                ref.rights_statement, e.evidence_kind
         FROM record_evidence e
         JOIN scientific_references ref ON ref.id = e.reference_id
         WHERE e.record_id = $1 AND ref.verification_status = 'verified'
         ORDER BY ref.publication_year DESC NULLS LAST, ref.title, ref.id`,
        [row.record_id],
      ),
    ]);

    return {
      ...this.presentRecord(row, locale),
      description: row.description,
      fields: fields.map((field) => ({
        label: field.label,
        dataType: field.data_type,
        unit: field.unit,
        value: field.value,
      })),
      locations: locations.map((location) => ({
        label: location.label,
        visibility: location.visibility,
        regionLabel: location.region_label,
        precisionMetres: location.public_precision_metres,
        geometry: location.geometry,
      })),
      references: references.map((reference) => ({
        sourceType: reference.source_type,
        authors: this.safeAuthors(reference.authors),
        title: reference.title,
        publication: reference.publication,
        year: reference.publication_year,
        identifier: reference.identifier,
        pagesOrFigure: reference.pages_or_figure,
        url: reference.source_url,
        rightsStatement: reference.rights_statement,
        evidenceKind: reference.evidence_kind,
      })),
    };
  }

  async getCategoryImageAssetId(slug: string): Promise<string> {
    const rows = await this.dataSource.query<Array<{ id: string }>>(
      `SELECT m.id
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       JOIN media_assets m ON m.id = c.image_media_asset_id
       WHERE c.slug = $1 AND c.status = 'active' AND c.publication_status = 'published'
         AND (p.id IS NULL OR (p.status = 'active' AND p.publication_status = 'published'))
         AND m.media_kind = 'image' AND m.processing_status = 'approved'
         AND btrim(m.rights_statement) <> ''`,
      [slug],
    );
    if (!rows[0]) throw new NotFoundException('Published image not found.');
    return rows[0].id;
  }

  async getRecordImageAssetId(publicId: string): Promise<string> {
    const rows = await this.dataSource.query<Array<{ id: string }>>(
      `SELECT m.id
       FROM scientific_records r
       JOIN categories c ON c.id = r.category_id
       LEFT JOIN categories p ON p.id = c.parent_id
       JOIN record_media rm ON rm.record_id = r.id AND rm.is_primary = true
       JOIN media_assets m ON m.id = rm.media_asset_id
       WHERE r.stable_id = $1 AND r.status = 'published'
         AND c.status = 'active' AND c.publication_status = 'published'
         AND (p.id IS NULL OR (p.status = 'active' AND p.publication_status = 'published'))
         AND m.media_kind = 'image' AND m.processing_status = 'approved'
         AND btrim(m.rights_statement) <> ''`,
      [publicId],
    );
    if (!rows[0]) throw new NotFoundException('Published image not found.');
    return rows[0].id;
  }

  private async loadCategories(locale: string, limit: number, offset: number, slug?: string) {
    return this.dataSource.query<PublicCategoryRow[]>(
      `SELECT c.slug, p.slug AS parent_slug, c.records_allowed,
              ct.name, ct.summary, ct.description,
              counts.record_count::text,
              (m.id IS NOT NULL) AS image_ready
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       JOIN category_translations ct ON ct.category_id = c.id AND ct.locale = $1
       LEFT JOIN media_assets m ON m.id = c.image_media_asset_id
         AND m.media_kind = 'image' AND m.processing_status = 'approved'
         AND btrim(m.rights_statement) <> ''
       LEFT JOIN LATERAL (
         WITH RECURSIVE descendants AS (
           SELECT c.id
           UNION ALL
           SELECT child.id FROM categories child
           JOIN descendants d ON child.parent_id = d.id
           WHERE child.status = 'active' AND child.publication_status = 'published'
         )
         SELECT COUNT(*) AS record_count
         FROM scientific_records r
         JOIN descendants d ON d.id = r.category_id
         JOIN record_translations rt
           ON rt.record_id = r.id AND rt.locale = $1 AND rt.status = 'published'
         WHERE r.status = 'published'
       ) counts ON true
       WHERE c.status = 'active' AND c.publication_status = 'published'
         AND (p.id IS NULL OR (p.status = 'active' AND p.publication_status = 'published'))
         AND ($4::text IS NULL OR c.slug = $4)
       ORDER BY c.parent_id NULLS FIRST, c.position, c.slug
       LIMIT $2 OFFSET $3`,
      [locale, limit, offset, slug ?? null],
    );
  }

  private presentCategory(row: PublicCategoryRow, locale: string) {
    return {
      slug: row.slug,
      parentSlug: row.parent_slug,
      name: row.name,
      summary: row.summary,
      description: row.description,
      recordsAllowed: row.records_allowed,
      recordCount: Number(row.record_count),
      locale,
      image: row.image_ready
        ? {
            viewEndpoint: `/api/v1/public/scientific/categories/${encodeURIComponent(row.slug)}/image`,
          }
        : null,
    };
  }

  private presentRecord(row: PublicRecordRow, locale: string) {
    return {
      publicId: row.public_id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      category: { slug: row.category_slug, name: row.category_name },
      recordType: row.record_type_name,
      locale,
      publishedAt: row.published_at?.toISOString() ?? null,
      updatedAt: row.updated_at.toISOString(),
      image: row.image_ready
        ? {
            viewEndpoint: `/api/v1/public/scientific/records/${encodeURIComponent(row.public_id)}/image`,
            caption: row.image_caption,
            description: row.image_description,
            altText: row.image_alt_text,
            licence: row.image_licence,
            credit: row.image_credit,
          }
        : null,
    };
  }

  private recordCategoryCte(): string {
    return `WITH RECURSIVE selected_categories AS (
      SELECT id FROM categories
      WHERE $2::text IS NOT NULL AND slug = $2
        AND status = 'active' AND publication_status = 'published'
      UNION ALL
      SELECT child.id FROM categories child
      JOIN selected_categories selected ON child.parent_id = selected.id
      WHERE child.status = 'active' AND child.publication_status = 'published'
    )`;
  }

  private recordBaseSelect(): string {
    return `SELECT r.id AS record_id, r.stable_id AS public_id, r.slug,
                   t.title, t.summary, t.description,
                   c.slug AS category_slug, ct.name AS category_name,
                   rtt.name AS record_type_name,
                   r.published_at, r.updated_at,
                   (m.id IS NOT NULL) AS image_ready,
                   rm.caption AS image_caption, rm.description AS image_description,
                   rm.alt_text AS image_alt_text, m.licence AS image_licence,
                   m.credit AS image_credit
            FROM scientific_records r
            JOIN categories c ON c.id = r.category_id
            LEFT JOIN categories p ON p.id = c.parent_id
            JOIN record_translations t
              ON t.record_id = r.id AND t.locale = $1 AND t.status = 'published'
            JOIN category_translations ct ON ct.category_id = c.id AND ct.locale = $1
            JOIN record_types rt ON rt.id = r.record_type_id AND rt.status = 'active'
            JOIN record_type_translations rtt ON rtt.record_type_id = rt.id AND rtt.locale = $1
            LEFT JOIN record_media rm ON rm.record_id = r.id AND rm.is_primary = true
            LEFT JOIN media_assets m ON m.id = rm.media_asset_id
              AND m.media_kind = 'image' AND m.processing_status = 'approved'
              AND btrim(m.rights_statement) <> ''`;
  }

  private safeAuthors(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((author): author is string => typeof author === 'string')
      : [];
  }
}
