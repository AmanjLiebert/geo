import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { MAX_LIST_LIMIT, MAX_LIST_OFFSET } from '../common/dto/pagination-query.dto';
import { AddEvidenceDto, CreateReferenceDto } from './dto/reference.dto';
import { CreateLocationDto } from './dto/location.dto';
import { CreateRelationshipDto } from './dto/relationship.dto';
import { CreateMapLayerDto } from './dto/map-layer.dto';

interface IdRow {
  id: string;
}

@Injectable()
export class ScientificTrustService {
  constructor(private readonly dataSource: DataSource) {}

  async createReference(actorUserId: string, input: CreateReferenceDto) {
    if (
      !input.identifier &&
      !input.sourceUrl &&
      !input.publication &&
      !input.researchPublicationId
    ) {
      throw new BadRequestException('A reference needs an identifier, HTTPS URL, or publication.');
    }
    if (input.researchPublicationId) {
      const research = (await this.dataSource.query(
        `SELECT id FROM research_publications WHERE id = $1`,
        [input.researchPublicationId],
      )) as unknown as IdRow[];
      if (!research[0]) throw new NotFoundException('Managed research publication not found.');
    }
    const id = randomUUID();
    await this.dataSource.query(
      `INSERT INTO scientific_references (
        id, source_type, authors, title, publication, publication_year, identifier,
        pages_or_figure, source_url, rights_statement, research_publication_id, created_by_user_id
      ) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id,
        input.sourceType,
        JSON.stringify(input.authors),
        input.title.trim(),
        input.publication?.trim() || null,
        input.publicationYear ?? null,
        input.identifier?.trim() || null,
        input.pagesOrFigure?.trim() || null,
        input.sourceUrl ?? null,
        input.rightsStatement?.trim() || null,
        input.researchPublicationId ?? null,
        actorUserId,
      ],
    );
    return this.getReference(id);
  }

  async listReferences(limit: number, offset: number, search?: string) {
    limit = Math.min(Math.max(limit, 1), MAX_LIST_LIMIT);
    offset = Math.min(Math.max(offset, 0), MAX_LIST_OFFSET);
    const term = search?.trim() || null;
    const filter = term
      ? `WHERE POSITION(lower($3) IN lower(title)) > 0
         OR POSITION(lower($3) IN lower(COALESCE(identifier, ''))) > 0`
      : '';
    const params = term ? [limit, offset, term] : [limit, offset];
    const rows = (await this.dataSource.query(
      `SELECT id, source_type AS "sourceType", title, publication_year AS "publicationYear",
         identifier, verification_status AS "verificationStatus", updated_at AS "updatedAt"
       FROM scientific_references ${filter}
       ORDER BY updated_at DESC, id LIMIT $1 OFFSET $2`,
      params,
    )) as unknown as Record<string, unknown>[];
    const counts = (await this.dataSource.query(
      `SELECT count(*)::int AS total FROM scientific_references
       ${term ? filter.replaceAll('$3', '$1') : ''}`,
      term ? [term] : [],
    )) as unknown as Array<{ total: number }>;
    return { items: rows, total: counts[0]?.total ?? 0, limit, offset };
  }

  async verifyReference(actorUserId: string, referenceId: string) {
    const references = (await this.dataSource.query(
      `SELECT created_by_user_id FROM scientific_references WHERE id = $1`,
      [referenceId],
    )) as unknown as Array<{ created_by_user_id: string }>;
    if (!references[0]) throw new NotFoundException('Reference not found.');
    if (references[0].created_by_user_id === actorUserId) {
      throw new BadRequestException('A reference creator cannot verify their own source.');
    }
    const result = (await this.dataSource.query(
      `UPDATE scientific_references SET verification_status = 'verified',
        verified_by_user_id = $2, updated_at = now()
       WHERE id = $1 RETURNING id`,
      [referenceId, actorUserId],
    )) as unknown as IdRow[];
    if (!result[0]) throw new NotFoundException('Reference not found.');
    return this.getReference(referenceId);
  }

  async addEvidence(actorUserId: string, recordId: string, input: AddEvidenceDto) {
    if (input.claimKey && input.fieldKey) {
      throw new BadRequestException('Evidence may target a claim or a field, not both.');
    }
    const id = randomUUID();
    try {
      await this.dataSource.transaction(async (manager) => {
        const record = await this.assertRecordEditable(manager, recordId);
        if (input.fieldKey) {
          const fields = record.template_version_id
            ? ((await manager.query(
                `SELECT stable_key FROM field_definitions
                 WHERE template_version_id = $1 AND stable_key = $2`,
                [record.template_version_id, input.fieldKey.trim()],
              )) as unknown as Array<{ stable_key: string }>)
            : [];
          if (!fields[0])
            throw new BadRequestException('The selected scientific field is invalid.');
        }
        const references = (await manager.query(
          `SELECT id FROM scientific_references WHERE id = $1`,
          [input.referenceId],
        )) as unknown as IdRow[];
        if (!references[0]) throw new NotFoundException('Reference not found.');
        await manager.query(
          `INSERT INTO record_evidence (
          id, record_id, reference_id, evidence_kind, claim_key, field_key, notes, created_by_user_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            id,
            recordId,
            input.referenceId,
            input.evidenceKind.trim(),
            input.claimKey?.trim() || null,
            input.fieldKey?.trim() || null,
            input.notes?.trim() || null,
            actorUserId,
          ],
        );
        await this.touchAndAudit(
          manager,
          actorUserId,
          recordId,
          'scientific-record.evidence-added',
          {
            evidenceId: id,
            referenceId: input.referenceId,
            fieldKey: input.fieldKey ?? null,
          },
        );
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('That evidence link already exists.');
      throw error;
    }
    return { id, recordId, ...input };
  }

  async listEvidence(recordId: string) {
    await this.assertRecordExists(this.dataSource, recordId);
    const rows = (await this.dataSource.query(
      `SELECT e.id, e.reference_id AS "referenceId", e.evidence_kind AS "evidenceKind",
         e.claim_key AS "claimKey", e.field_key AS "fieldKey", e.notes, e.created_at AS "createdAt",
         r.title AS "referenceTitle", r.source_type AS "sourceType",
         r.verification_status AS "verificationStatus"
       FROM record_evidence e JOIN scientific_references r ON r.id = e.reference_id
       WHERE e.record_id = $1 ORDER BY e.created_at, e.id`,
      [recordId],
    )) as unknown as Record<string, unknown>[];
    return { items: rows };
  }

  async addLocation(actorUserId: string, recordId: string, input: CreateLocationDto) {
    this.validateLocationPolicy(input);
    const id = randomUUID();
    const hasPublicPoint =
      input.publicLatitude !== undefined && input.publicLongitude !== undefined;
    await this.dataSource.transaction(async (manager) => {
      await this.assertRecordEditable(manager, recordId);
      await manager.query(
        `INSERT INTO record_locations (
        id, record_id, label, exact_geometry, public_geometry, visibility,
        sensitivity_reason, public_precision_metres, region_label, embargo_until, owner_user_id
      ) VALUES (
        $1,$2,$3,ST_SetSRID(ST_MakePoint($4,$5),4326),
        CASE WHEN $6::boolean THEN ST_SetSRID(ST_MakePoint($7,$8),4326) ELSE NULL END,
        $9,$10,$11,$12,$13,$14
      )`,
        [
          id,
          recordId,
          input.label?.trim() || null,
          input.exactLongitude,
          input.exactLatitude,
          hasPublicPoint,
          input.publicLongitude ?? 0,
          input.publicLatitude ?? 0,
          input.visibility,
          input.sensitivityReason?.trim() || null,
          input.publicPrecisionMetres ?? null,
          input.regionLabel?.trim() || null,
          input.embargoUntil ? new Date(input.embargoUntil) : null,
          actorUserId,
        ],
      );
      await this.touchAndAudit(manager, actorUserId, recordId, 'scientific-record.location-added', {
        locationId: id,
        visibility: input.visibility,
      });
    });
    return { id, recordId, visibility: input.visibility };
  }

  async listLocations(recordId: string, includeExact: boolean) {
    await this.assertRecordExists(this.dataSource, recordId);
    const exactColumn = includeExact
      ? ', ST_AsGeoJSON(exact_geometry)::json AS exact_geometry'
      : '';
    const rows = (await this.dataSource.query(
      `SELECT id, record_id, label, visibility, sensitivity_reason, public_precision_metres,
        region_label, embargo_until, ST_AsGeoJSON(public_geometry)::json AS public_geometry
        ${exactColumn}
       FROM record_locations WHERE record_id = $1 ORDER BY created_at, id`,
      [recordId],
    )) as unknown as Record<string, unknown>[];
    return { items: rows };
  }

  async addRelationship(actorUserId: string, recordId: string, input: CreateRelationshipDto) {
    const id = randomUUID();
    try {
      await this.dataSource.transaction(async (manager) => {
        await this.assertRecordEditable(manager, recordId);
        await this.assertTargetExists(manager, input.targetType, input.targetId);
        await manager.query(
          `INSERT INTO content_relationships (
          id, source_type, source_id, target_type, target_id, relationship_type, notes, created_by_user_id
        ) VALUES ($1,'record',$2,$3,$4,$5,$6,$7)`,
          [
            id,
            recordId,
            input.targetType,
            input.targetId,
            input.relationshipType,
            input.notes ?? null,
            actorUserId,
          ],
        );
        await this.touchAndAudit(
          manager,
          actorUserId,
          recordId,
          'scientific-record.relationship-added',
          {
            relationshipId: id,
            targetType: input.targetType,
            targetId: input.targetId,
            relationshipType: input.relationshipType,
          },
        );
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('That relationship already exists.');
      throw error;
    }
    return { id, sourceType: 'record', sourceId: recordId, ...input };
  }

  async listRelationships(recordId: string) {
    await this.assertRecordExists(this.dataSource, recordId);
    const rows = (await this.dataSource.query(
      `SELECT rel.id, rel.target_type AS "targetType", rel.target_id AS "targetId",
         rel.relationship_type AS "relationshipType", rel.notes,
         rel.created_at AS "createdAt", COALESCE(record_title.title, research_title.title) AS "targetTitle"
       FROM content_relationships rel
       LEFT JOIN LATERAL (
         SELECT title FROM record_translations WHERE record_id = rel.target_id
         ORDER BY CASE WHEN locale = 'en' THEN 0 ELSE 1 END, updated_at DESC LIMIT 1
       ) record_title ON rel.target_type = 'record'
       LEFT JOIN LATERAL (
         SELECT title FROM research_translations WHERE research_publication_id = rel.target_id
         ORDER BY CASE WHEN locale = 'en' THEN 0 ELSE 1 END, updated_at DESC LIMIT 1
       ) research_title ON rel.target_type = 'research'
       WHERE rel.source_type = 'record' AND rel.source_id = $1
       ORDER BY rel.created_at, rel.id`,
      [recordId],
    )) as unknown as Record<string, unknown>[];
    return { items: rows };
  }

  async createMapLayer(actorUserId: string, input: CreateMapLayerDto) {
    const id = randomUUID();
    const versionDate = input.versionDate ? new Date(input.versionDate) : null;
    if (versionDate && Number.isNaN(versionDate.getTime())) {
      throw new BadRequestException('Invalid map-layer version date.');
    }
    await this.dataSource.query(
      `INSERT INTO map_layers (
        id, stable_key, title, source, licence, format, coordinate_reference_system,
        scale_or_resolution, version_date, visibility, created_by_user_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        input.stableKey.trim(),
        input.title.trim(),
        input.source.trim(),
        input.licence.trim(),
        input.format.trim(),
        input.coordinateReferenceSystem.trim(),
        input.scaleOrResolution.trim(),
        versionDate,
        input.visibility,
        actorUserId,
      ],
    );
    return { id, ...input, status: 'draft' };
  }

  async listMapLayers() {
    const rows = (await this.dataSource.query(
      `SELECT id, stable_key, title, source, licence, format, coordinate_reference_system,
        scale_or_resolution, version_date, visibility, status, created_at, updated_at
       FROM map_layers ORDER BY title, id`,
    )) as unknown as Record<string, unknown>[];
    return { items: rows };
  }

  async publicationIssues(recordId: string, reviewerUserId?: string) {
    const rows = (await this.dataSource.query(
      `SELECT id, owner_user_id, category_id, record_type_id, template_version_id
       FROM scientific_records WHERE id = $1`,
      [recordId],
    )) as unknown as Array<
      IdRow & {
        owner_user_id: string;
        category_id: string | null;
        record_type_id: string | null;
        template_version_id: string | null;
      }
    >;
    const record = rows[0];
    if (!record) throw new NotFoundException('Scientific record not found.');
    const issues: Array<{ field: string; code: string; message: string }> = [];
    if (!record.category_id || !record.record_type_id || !record.template_version_id) {
      issues.push({
        field: 'classification',
        code: 'required',
        message: 'Complete classification is required.',
      });
    }
    if (record.category_id) {
      const categoryRows = (await this.dataSource.query(
        `SELECT 1 FROM categories c LEFT JOIN categories p ON p.id = c.parent_id
         WHERE c.id = $1 AND c.status = 'active' AND c.publication_status = 'published'
           AND (p.id IS NULL OR (p.status = 'active' AND p.publication_status = 'published'))`,
        [record.category_id],
      )) as unknown as Array<Record<string, unknown>>;
      if (!categoryRows[0]) {
        issues.push({
          field: 'category',
          code: 'unpublished',
          message: 'Publish the category before publishing this record.',
        });
      }
    }
    if (reviewerUserId && reviewerUserId === record.owner_user_id) {
      issues.push({
        field: 'reviewer',
        code: 'independent',
        message: 'The author cannot publish their own record.',
      });
    }
    const translations = (await this.dataSource.query(
      `SELECT count(*)::int AS count FROM record_translations WHERE record_id = $1 AND status = 'reviewed'`,
      [recordId],
    )) as unknown as Array<{ count: number }>;
    if ((translations[0]?.count ?? 0) < 1) {
      issues.push({
        field: 'translations',
        code: 'reviewed_required',
        message: 'At least one reviewed translation is required.',
      });
    }
    if (record.record_type_id) {
      const evidence = (await this.dataSource.query(
        `WITH policy AS (
          SELECT COALESCE(minimum_verified_references, 1) AS minimum,
                 COALESCE(required_evidence_kinds, '[]'::jsonb) AS kinds
          FROM record_type_evidence_policies WHERE record_type_id = $2
        ), defaults AS (SELECT 1 AS minimum, '[]'::jsonb AS kinds)
        SELECT p.minimum, p.kinds,
          (SELECT count(DISTINCT e.reference_id)::int FROM record_evidence e
           JOIN scientific_references r ON r.id = e.reference_id
           WHERE e.record_id = $1 AND r.verification_status = 'verified') AS verified_count
        FROM (SELECT * FROM policy UNION ALL SELECT * FROM defaults WHERE NOT EXISTS (SELECT 1 FROM policy)) p`,
        [recordId, record.record_type_id],
      )) as unknown as Array<{ minimum: number; kinds: string[]; verified_count: number }>;
      const policy = evidence[0];
      if ((policy?.verified_count ?? 0) < (policy?.minimum ?? 1)) {
        issues.push({
          field: 'evidence',
          code: 'verified_reference_required',
          message: `At least ${policy?.minimum ?? 1} verified reference is required.`,
        });
      }
      for (const kind of policy?.kinds ?? []) {
        const kindRows = (await this.dataSource.query(
          `SELECT 1 FROM record_evidence e JOIN scientific_references r ON r.id = e.reference_id
           WHERE e.record_id = $1 AND e.evidence_kind = $2 AND r.verification_status = 'verified' LIMIT 1`,
          [recordId, kind],
        )) as unknown as IdRow[];
        if (!kindRows[0])
          issues.push({
            field: 'evidence',
            code: 'kind_required',
            message: `Verified ${kind} evidence is required.`,
          });
      }
    }
    const media = (await this.dataSource.query(
      `SELECT count(*)::int AS count FROM record_media rm JOIN media_assets m ON m.id = rm.media_asset_id
       WHERE rm.record_id = $1 AND m.processing_status <> 'approved'`,
      [recordId],
    )) as unknown as Array<{ count: number }>;
    if ((media[0]?.count ?? 0) > 0) {
      issues.push({
        field: 'media',
        code: 'not_approved',
        message: 'All attached media must be approved.',
      });
    }
    return { valid: issues.length === 0, issues };
  }

  async getReference(id: string) {
    const rows = (await this.dataSource.query(
      `SELECT id, source_type, authors, title, publication, publication_year, identifier,
        pages_or_figure, source_url, rights_statement, verification_status, created_at, updated_at
       FROM scientific_references WHERE id = $1`,
      [id],
    )) as unknown as Record<string, unknown>[];
    if (!rows[0]) throw new NotFoundException('Reference not found.');
    return rows[0];
  }

  private async assertRecordExists(executor: DataSource | EntityManager, id: string) {
    const rows = (await executor.query(`SELECT id FROM scientific_records WHERE id = $1`, [
      id,
    ])) as unknown as IdRow[];
    if (!rows[0]) throw new NotFoundException('Scientific record not found.');
  }

  private async touchAndAudit(
    manager: EntityManager,
    actorUserId: string,
    recordId: string,
    action: string,
    metadata: Record<string, unknown>,
  ) {
    await manager.query(`UPDATE scientific_records SET updated_at = now() WHERE id = $1`, [
      recordId,
    ]);
    await manager.query(
      `INSERT INTO content_audit_events (actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'scientific-record', $3, $4::jsonb)`,
      [actorUserId, action, recordId, JSON.stringify(metadata)],
    );
  }

  private async assertRecordEditable(executor: EntityManager, id: string) {
    const rows = (await executor.query(
      `SELECT status, template_version_id FROM scientific_records WHERE id = $1 FOR UPDATE`,
      [id],
    )) as unknown as Array<{ status: string; template_version_id: string | null }>;
    if (!rows[0]) throw new NotFoundException('Scientific record not found.');
    if (rows[0].status === 'published' || rows[0].status === 'archived') {
      throw new ConflictException('This record cannot be edited in its current state.');
    }
    return rows[0];
  }

  private async assertTargetExists(
    executor: DataSource | EntityManager,
    type: 'record' | 'research',
    id: string,
  ) {
    const table = type === 'record' ? 'scientific_records' : 'research_publications';
    const rows = (await executor.query(`SELECT id FROM ${table} WHERE id = $1`, [
      id,
    ])) as unknown as IdRow[];
    if (!rows[0]) throw new NotFoundException('Relationship target not found.');
  }

  private validateLocationPolicy(input: CreateLocationDto) {
    const publicCoordinatesTogether =
      (input.publicLatitude === undefined) === (input.publicLongitude === undefined);
    if (!publicCoordinatesTogether)
      throw new BadRequestException('Public latitude and longitude must be provided together.');
    if (
      ['restricted', 'embargoed'].includes(input.visibility) &&
      input.publicLatitude !== undefined
    ) {
      throw new BadRequestException('Restricted locations cannot have public coordinates.');
    }
    if (
      ['public', 'approximate'].includes(input.visibility) &&
      input.publicLatitude === undefined
    ) {
      throw new BadRequestException(
        'Public and approximate locations require a public representation.',
      );
    }
    if (input.visibility === 'approximate' && !input.publicPrecisionMetres) {
      throw new BadRequestException('Approximate locations require a public precision.');
    }
    if (input.visibility !== 'public' && !input.sensitivityReason?.trim()) {
      throw new BadRequestException('Sensitive locations require a reason.');
    }
    if (input.visibility === 'embargoed' && !input.embargoUntil) {
      throw new BadRequestException('Embargoed locations require an embargo date.');
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
