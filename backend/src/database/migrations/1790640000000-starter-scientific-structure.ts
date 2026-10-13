import { randomUUID } from 'node:crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

type DataType = 'text' | 'long_text' | 'decimal' | 'date';

interface CatalogField {
  key: string;
  label: string;
  dataType: DataType;
  required?: boolean;
  unit?: string;
  validation?: Record<string, unknown>;
}

interface CatalogType {
  key: string;
  name: string;
  fields: readonly CatalogField[];
}

interface CatalogCategory {
  key: string;
  name: string;
  parent?: string;
  types?: readonly string[];
}

// Snapshot of the starter catalog. Future edits require a NEW reviewed migration;
// never alter this file after it has been applied to any environment.
export const STARTER_TYPES: readonly CatalogType[] = [
  {
    key: 'geologic_unit_profile',
    name: 'Geologic unit profile',
    fields: [
      { key: 'formal_name', label: 'Unit name', dataType: 'text', required: true },
      { key: 'rank', label: 'Stratigraphic rank', dataType: 'text', required: true },
      { key: 'geologic_age', label: 'Geologic age', dataType: 'text' },
      { key: 'lithology', label: 'Lithology', dataType: 'long_text' },
    ],
  },
  {
    key: 'unit_occurrence',
    name: 'Unit occurrence',
    fields: [
      { key: 'unit_name', label: 'Observed unit', dataType: 'text', required: true },
      {
        key: 'exposure_notes',
        label: 'Exposure and contact observations',
        dataType: 'long_text',
        required: true,
      },
    ],
  },
  {
    key: 'measured_section',
    name: 'Measured section',
    fields: [
      {
        key: 'section_name',
        label: 'Section name or identifier',
        dataType: 'text',
        required: true,
      },
      {
        key: 'total_thickness_m',
        label: 'Total measured thickness',
        dataType: 'decimal',
        unit: 'm',
        validation: { minimum: 0 },
      },
      {
        key: 'interval_notes',
        label: 'Intervals and measurement method',
        dataType: 'long_text',
        required: true,
      },
    ],
  },
  {
    key: 'rock_material_profile',
    name: 'Rock material profile',
    fields: [
      { key: 'rock_name', label: 'Rock name', dataType: 'text', required: true },
      { key: 'texture', label: 'Texture', dataType: 'text' },
      { key: 'composition', label: 'Composition and identification basis', dataType: 'long_text' },
    ],
  },
  {
    key: 'rock_specimen',
    name: 'Rock specimen',
    fields: [
      { key: 'rock_name', label: 'Rock identification', dataType: 'text', required: true },
      { key: 'collection_code', label: 'Collection or catalogue code', dataType: 'text' },
      {
        key: 'collection_context',
        label: 'Collection context and provenance',
        dataType: 'long_text',
      },
    ],
  },
  {
    key: 'outcrop_observation',
    name: 'Outcrop observation',
    fields: [
      { key: 'observed_on', label: 'Observation date', dataType: 'date' },
      {
        key: 'observation_notes',
        label: 'Observed geology',
        dataType: 'long_text',
        required: true,
      },
    ],
  },
  {
    key: 'mineral_profile',
    name: 'Mineral profile',
    fields: [
      { key: 'mineral_name', label: 'Mineral name', dataType: 'text', required: true },
      {
        key: 'identification_basis',
        label: 'Identification basis',
        dataType: 'long_text',
        required: true,
      },
    ],
  },
  {
    key: 'mineral_specimen',
    name: 'Mineral specimen',
    fields: [
      { key: 'mineral_name', label: 'Mineral identification', dataType: 'text', required: true },
      { key: 'collection_code', label: 'Collection or catalogue code', dataType: 'text' },
      {
        key: 'identification_basis',
        label: 'Identification basis',
        dataType: 'long_text',
        required: true,
      },
    ],
  },
  {
    key: 'mineral_occurrence',
    name: 'Mineral occurrence',
    fields: [
      { key: 'mineral_name', label: 'Observed mineral', dataType: 'text', required: true },
      { key: 'host_rock', label: 'Host rock or unit', dataType: 'text' },
      {
        key: 'occurrence_notes',
        label: 'Occurrence evidence',
        dataType: 'long_text',
        required: true,
      },
    ],
  },
  {
    key: 'fossil_occurrence',
    name: 'Fossil occurrence',
    fields: [
      { key: 'identification', label: 'Fossil identification', dataType: 'text', required: true },
      { key: 'host_unit', label: 'Host unit or bed', dataType: 'text' },
      { key: 'age_interpretation', label: 'Age interpretation', dataType: 'text' },
    ],
  },
  {
    key: 'fossil_specimen',
    name: 'Fossil specimen',
    fields: [
      { key: 'identification', label: 'Fossil identification', dataType: 'text', required: true },
      { key: 'repository', label: 'Repository or collection', dataType: 'text' },
      { key: 'catalogue_number', label: 'Catalogue number', dataType: 'text' },
    ],
  },
  {
    key: 'mapped_structural_feature',
    name: 'Mapped structural feature',
    fields: [
      { key: 'feature_kind', label: 'Structure kind', dataType: 'text', required: true },
      { key: 'geometry_notes', label: 'Mapped geometry and observations', dataType: 'long_text' },
      { key: 'interpretation', label: 'Interpretation and confidence', dataType: 'long_text' },
    ],
  },
  {
    key: 'structural_measurement',
    name: 'Structural measurement',
    fields: [
      { key: 'measurement_kind', label: 'Measurement kind', dataType: 'text', required: true },
      {
        key: 'orientation_description',
        label: 'Orientation and convention',
        dataType: 'text',
        required: true,
      },
      { key: 'method', label: 'Measurement method', dataType: 'text' },
    ],
  },
  {
    key: 'water_point_profile',
    name: 'Water-point profile',
    fields: [
      { key: 'site_name', label: 'Site name or identifier', dataType: 'text', required: true },
      { key: 'water_point_kind', label: 'Water-point kind', dataType: 'text', required: true },
      { key: 'host_aquifer', label: 'Aquifer or host unit', dataType: 'text' },
    ],
  },
  {
    key: 'water_observation',
    name: 'Water observation',
    fields: [
      { key: 'observed_on', label: 'Observation date', dataType: 'date', required: true },
      { key: 'parameter_name', label: 'Measured parameter', dataType: 'text', required: true },
      { key: 'value', label: 'Measured value', dataType: 'decimal', required: true },
      { key: 'unit', label: 'Measurement unit', dataType: 'text', required: true },
    ],
  },
  {
    key: 'aquifer_profile',
    name: 'Aquifer profile',
    fields: [
      { key: 'aquifer_name', label: 'Aquifer name', dataType: 'text', required: true },
      { key: 'host_units', label: 'Constituent geological units', dataType: 'long_text' },
      { key: 'hydraulic_context', label: 'Hydraulic evidence', dataType: 'long_text' },
    ],
  },
  {
    key: 'surficial_unit_profile',
    name: 'Surficial unit profile',
    fields: [
      {
        key: 'deposit_name',
        label: 'Deposit name or description',
        dataType: 'text',
        required: true,
      },
      { key: 'deposit_material', label: 'Deposit material', dataType: 'long_text', required: true },
      { key: 'age_interpretation', label: 'Age interpretation', dataType: 'text' },
    ],
  },
  {
    key: 'landform_profile',
    name: 'Landform profile',
    fields: [
      { key: 'feature_kind', label: 'Landform kind', dataType: 'text', required: true },
      {
        key: 'morphology',
        label: 'Morphology and observed evidence',
        dataType: 'long_text',
        required: true,
      },
      { key: 'host_rock', label: 'Host rock or unit', dataType: 'text' },
    ],
  },
];

export const STARTER_CATEGORIES: readonly CatalogCategory[] = [
  { key: 'stratigraphy_units', name: 'Stratigraphy and geological units' },
  { key: 'rocks_minerals', name: 'Rocks and minerals' },
  { key: 'fossils', name: 'Fossils' },
  { key: 'structural_geology', name: 'Structural geology' },
  { key: 'hydrogeology', name: 'Hydrogeology' },
  { key: 'surface_geology', name: 'Surface geology and landforms' },
  {
    key: 'lithostratigraphic_units',
    name: 'Lithostratigraphic units',
    parent: 'stratigraphy_units',
    types: ['geologic_unit_profile', 'unit_occurrence'],
  },
  {
    key: 'stratigraphic_sections',
    name: 'Stratigraphic sections',
    parent: 'stratigraphy_units',
    types: ['measured_section'],
  },
  {
    key: 'sedimentary_rocks',
    name: 'Sedimentary rocks',
    parent: 'rocks_minerals',
    types: ['rock_material_profile', 'rock_specimen', 'outcrop_observation'],
  },
  {
    key: 'igneous_metamorphic_rocks',
    name: 'Igneous and metamorphic rocks',
    parent: 'rocks_minerals',
    types: ['rock_material_profile', 'rock_specimen', 'outcrop_observation'],
  },
  {
    key: 'minerals',
    name: 'Minerals',
    parent: 'rocks_minerals',
    types: ['mineral_profile', 'mineral_specimen', 'mineral_occurrence'],
  },
  {
    key: 'invertebrate_fossils',
    name: 'Invertebrate body fossils',
    parent: 'fossils',
    types: ['fossil_occurrence', 'fossil_specimen'],
  },
  {
    key: 'vertebrate_fossils',
    name: 'Vertebrate body fossils',
    parent: 'fossils',
    types: ['fossil_occurrence', 'fossil_specimen'],
  },
  {
    key: 'microfossils',
    name: 'Microfossils',
    parent: 'fossils',
    types: ['fossil_occurrence', 'fossil_specimen'],
  },
  {
    key: 'trace_fossils',
    name: 'Trace fossils',
    parent: 'fossils',
    types: ['fossil_occurrence', 'fossil_specimen'],
  },
  {
    key: 'folds',
    name: 'Folds',
    parent: 'structural_geology',
    types: ['mapped_structural_feature', 'structural_measurement'],
  },
  {
    key: 'faults_shear_zones',
    name: 'Faults and shear zones',
    parent: 'structural_geology',
    types: ['mapped_structural_feature', 'structural_measurement'],
  },
  {
    key: 'joints_fractures',
    name: 'Joints and fractures',
    parent: 'structural_geology',
    types: ['mapped_structural_feature', 'structural_measurement'],
  },
  {
    key: 'springs',
    name: 'Springs',
    parent: 'hydrogeology',
    types: ['water_point_profile', 'water_observation'],
  },
  {
    key: 'wells',
    name: 'Wells',
    parent: 'hydrogeology',
    types: ['water_point_profile', 'water_observation'],
  },
  { key: 'aquifers', name: 'Aquifers', parent: 'hydrogeology', types: ['aquifer_profile'] },
  {
    key: 'surficial_deposits',
    name: 'Quaternary and other surficial deposits',
    parent: 'surface_geology',
    types: ['surficial_unit_profile', 'outcrop_observation'],
  },
  {
    key: 'karst_erosional_landforms',
    name: 'Karst and erosional landforms',
    parent: 'surface_geology',
    types: ['landform_profile', 'outcrop_observation'],
  },
];

export class StarterScientificStructure1790640000000 implements MigrationInterface {
  name = 'StarterScientificStructure1790640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const categories = new Map<string, string>();
    const typeVersions = new Map<string, { typeId: string; versionId: string }>();

    for (const [position, category] of STARTER_CATEGORIES.entries()) {
      const parentId = category.parent ? categories.get(category.parent) : null;
      if (category.parent && !parentId) throw new Error(`Unknown parent: ${category.parent}`);
      const recordsAllowed = Boolean(category.parent);
      const id = randomUUID();
      await queryRunner.query(
        `INSERT INTO categories (id, parent_id, stable_key, slug, records_allowed, position)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, parentId, category.key, category.key.replaceAll('_', '-'), recordsAllowed, position],
      );
      await queryRunner.query(
        `INSERT INTO category_translations (category_id, locale, name)
         VALUES ($1, 'en', $2)`,
        [id, category.name],
      );
      categories.set(category.key, id);
    }

    for (const type of STARTER_TYPES) {
      const typeId = randomUUID();
      await queryRunner.query('INSERT INTO record_types (id, stable_key) VALUES ($1, $2)', [
        typeId,
        type.key,
      ]);
      await queryRunner.query(
        `INSERT INTO record_type_translations (record_type_id, locale, name)
         VALUES ($1, 'en', $2)`,
        [typeId, type.name],
      );

      const templateKey = `${type.key}_template`;
      const templateId = randomUUID();
      await queryRunner.query(
        'INSERT INTO record_templates (id, record_type_id, stable_key, name) VALUES ($1, $2, $3, $4)',
        [templateId, typeId, templateKey, `${type.name} template`],
      );
      const versionId = randomUUID();
      await queryRunner.query(
        `INSERT INTO template_versions (id, template_id, version, status)
         VALUES ($1, $2, 1, 'draft')`,
        [versionId, templateId],
      );
      for (const [position, field] of type.fields.entries()) {
        const fieldId = randomUUID();
        await queryRunner.query(
          `INSERT INTO field_definitions
             (id, template_version_id, stable_key, data_type, required, validation, unit, position)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
          [
            fieldId,
            versionId,
            field.key,
            field.dataType,
            field.required ?? false,
            JSON.stringify(field.validation ?? {}),
            field.unit ?? null,
            position,
          ],
        );
        await queryRunner.query(
          `INSERT INTO field_definition_translations (field_definition_id, locale, label)
           VALUES ($1, 'en', $2)`,
          [fieldId, field.label],
        );
      }
      await queryRunner.query("UPDATE template_versions SET status = 'active' WHERE id = $1", [
        versionId,
      ]);
      typeVersions.set(type.key, { typeId, versionId });
    }

    for (const category of STARTER_CATEGORIES) {
      if (!category.types) continue;
      const categoryId = categories.get(category.key);
      if (!categoryId) throw new Error(`Missing category: ${category.key}`);
      for (const [position, typeKey] of category.types.entries()) {
        const type = typeVersions.get(typeKey);
        if (!type) throw new Error(`Unknown record type: ${typeKey}`);
        await queryRunner.query(
          `INSERT INTO category_record_types
             (category_id, record_type_id, active_template_version_id, position)
           VALUES ($1, $2, $3, $4)`,
          [categoryId, type.typeId, type.versionId, position],
        );
      }
    }
  }

  // Structure is retained for records, revisions, and clean rebuilds. Reversal is an
  // explicit forward migration that archives or supersedes the affected entries.
  public down(): Promise<void> {
    return Promise.reject(
      new Error('Scientific structure changes require a reviewed forward migration.'),
    );
  }
}
