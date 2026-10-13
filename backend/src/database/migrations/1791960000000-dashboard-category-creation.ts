import { randomUUID } from 'node:crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class DashboardCategoryCreation1791960000000 implements MigrationInterface {
  name = 'DashboardCategoryCreation1791960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE categories ADD COLUMN publication_status varchar(16) NOT NULL DEFAULT 'published'`,
    );
    await queryRunner.query(
      `ALTER TABLE categories ADD CONSTRAINT ck_categories_publication_status CHECK (publication_status IN ('draft', 'published'))`,
    );
    await queryRunner.query(
      `ALTER TABLE categories ADD COLUMN image_media_asset_id uuid REFERENCES media_assets(id) ON DELETE RESTRICT`,
    );
    await queryRunner.query(`ALTER TABLE category_translations ADD COLUMN summary varchar(500)`);
    await queryRunner.query(`
      CREATE FUNCTION guard_published_record_category() RETURNS trigger AS $$
      BEGIN
        IF NEW.status = 'published' AND NOT EXISTS (
          SELECT 1 FROM categories c LEFT JOIN categories p ON p.id = c.parent_id
          WHERE c.id = NEW.category_id AND c.status = 'active' AND c.publication_status = 'published'
            AND (p.id IS NULL OR (p.status = 'active' AND p.publication_status = 'published'))
        ) THEN RAISE EXCEPTION 'Published records require a published category branch'; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(
      `CREATE TRIGGER trg_published_record_category BEFORE INSERT OR UPDATE OF status, category_id ON scientific_records FOR EACH ROW EXECUTE FUNCTION guard_published_record_category()`,
    );

    const typeId = randomUUID();
    const templateId = randomUUID();
    const versionId = randomUUID();
    await queryRunner.query(
      `INSERT INTO record_types (id, stable_key) VALUES ($1, 'general_geological_record') ON CONFLICT (stable_key) DO NOTHING`,
      [typeId],
    );
    const types = (await queryRunner.query(
      `SELECT id FROM record_types WHERE stable_key = 'general_geological_record'`,
    )) as Array<{ id: string }>;
    if (!types[0]) throw new Error('General record type could not be created.');
    const actualTypeId = types[0].id;
    await queryRunner.query(
      `INSERT INTO record_type_translations (record_type_id, locale, name, description) VALUES ($1, 'en', 'General geological record', 'Describe a geological subject using the common record sections.') ON CONFLICT DO NOTHING`,
      [actualTypeId],
    );
    await queryRunner.query(
      `INSERT INTO record_templates (id, record_type_id, stable_key, name) VALUES ($1, $2, 'general_geological_record_template', 'General geological record template') ON CONFLICT (stable_key) DO NOTHING`,
      [templateId, actualTypeId],
    );
    const templates = (await queryRunner.query(
      `SELECT id FROM record_templates WHERE stable_key = 'general_geological_record_template'`,
    )) as Array<{ id: string }>;
    if (!templates[0]) throw new Error('General record template could not be created.');
    await queryRunner.query(
      `INSERT INTO template_versions (id, template_id, version, status) VALUES ($1, $2, 1, 'active') ON CONFLICT DO NOTHING`,
      [versionId, templates[0].id],
    );
  }

  public down(): Promise<void> {
    return Promise.reject(
      new Error('Category content and records require a reviewed forward recovery migration.'),
    );
  }
}
