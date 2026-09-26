import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { CreateStructureRequestDto } from './dto/create-structure-request.dto';
import { FieldDataType, FieldDefinition } from './scientific-content.types';
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

  async listCategories(locale: string) {
    const rows = (await this.dataSource.query(
      `
        SELECT c.id, c.parent_id, c.stable_key, c.slug, c.records_allowed, c.position,
               ct.name, ct.description
        FROM categories c
        LEFT JOIN category_translations ct
          ON ct.category_id = c.id AND ct.locale = $1
        WHERE c.status = 'active'
        ORDER BY c.parent_id NULLS FIRST, c.position, c.stable_key
      `,
      [locale],
    )) as unknown as CategoryRow[];

    return {
      items: rows.map((row) => ({
        id: row.id,
        parentId: row.parent_id,
        stableKey: row.stable_key,
        slug: row.slug,
        recordsAllowed: row.records_allowed,
        position: row.position,
        name: row.name ?? row.stable_key,
        description: row.description,
        locale,
        translationAvailable: row.name !== null,
      })),
    };
  }

  async listRecordTypes(categoryId: string, locale: string) {
    const rows = (await this.dataSource.query(
      `
        SELECT rt.id, rt.stable_key, crt.position, rtt.name, rtt.description,
               crt.active_template_version_id
        FROM category_record_types crt
        JOIN categories c ON c.id = crt.category_id AND c.status = 'active'
        JOIN record_types rt ON rt.id = crt.record_type_id AND rt.status = 'active'
        JOIN template_versions tv
          ON tv.id = crt.active_template_version_id AND tv.status = 'active'
        JOIN record_templates t
          ON t.id = tv.template_id AND t.record_type_id = rt.id AND t.status = 'active'
        LEFT JOIN record_type_translations rtt
          ON rtt.record_type_id = rt.id AND rtt.locale = $2
        WHERE crt.category_id = $1 AND crt.status = 'active'
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
        JOIN record_types rt ON rt.id = crt.record_type_id AND rt.status = 'active'
        JOIN template_versions tv
          ON tv.id = crt.active_template_version_id AND tv.status = 'active'
        JOIN record_templates t
          ON t.id = tv.template_id AND t.record_type_id = rt.id AND t.status = 'active'
        WHERE crt.category_id = $1 AND crt.record_type_id = $2 AND crt.status = 'active'
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
