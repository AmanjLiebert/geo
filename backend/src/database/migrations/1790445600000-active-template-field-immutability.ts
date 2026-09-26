import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActiveTemplateFieldImmutability1790445600000 implements MigrationInterface {
  name = 'ActiveTemplateFieldImmutability1790445600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION prevent_active_template_field_mutation() RETURNS trigger AS $$
      DECLARE
        version_status template_version_status;
        affected_version_id uuid;
      BEGIN
        affected_version_id := CASE
          WHEN TG_OP = 'DELETE' THEN OLD.template_version_id
          ELSE NEW.template_version_id
        END;
        SELECT status INTO version_status
        FROM template_versions
        WHERE id = affected_version_id;

        IF version_status = 'active' THEN
          RAISE EXCEPTION 'Fields belonging to an active template version are immutable';
        END IF;
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_active_template_fields_immutable"
      BEFORE INSERT OR UPDATE OR DELETE ON "field_definitions"
      FOR EACH ROW EXECUTE FUNCTION prevent_active_template_field_mutation()
    `);

    await queryRunner.query(`
      CREATE FUNCTION prevent_active_template_field_translation_mutation() RETURNS trigger AS $$
      DECLARE
        version_status template_version_status;
        affected_field_id uuid;
      BEGIN
        affected_field_id := CASE
          WHEN TG_OP = 'DELETE' THEN OLD.field_definition_id
          ELSE NEW.field_definition_id
        END;
        SELECT tv.status INTO version_status
        FROM field_definitions f
        JOIN template_versions tv ON tv.id = f.template_version_id
        WHERE f.id = affected_field_id;

        IF version_status = 'active' THEN
          RAISE EXCEPTION 'Field translations belonging to an active template version are immutable';
        END IF;
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_active_template_field_translations_immutable"
      BEFORE INSERT OR UPDATE OR DELETE ON "field_definition_translations"
      FOR EACH ROW EXECUTE FUNCTION prevent_active_template_field_translation_mutation()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "trg_active_template_field_translations_immutable" ON "field_definition_translations"',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS prevent_active_template_field_translation_mutation',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "trg_active_template_fields_immutable" ON "field_definitions"',
    );
    await queryRunner.query('DROP FUNCTION IF EXISTS prevent_active_template_field_mutation');
  }
}
