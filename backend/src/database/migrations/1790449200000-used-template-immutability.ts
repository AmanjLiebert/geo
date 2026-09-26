import { MigrationInterface, QueryRunner } from 'typeorm';

export class UsedTemplateImmutability1790449200000 implements MigrationInterface {
  name = 'UsedTemplateImmutability1790449200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_active_template_version_mutation() RETURNS trigger AS $$
      DECLARE
        has_records boolean;
      BEGIN
        SELECT EXISTS(
          SELECT 1 FROM scientific_records WHERE template_version_id = OLD.id
        ) INTO has_records;

        IF TG_OP = 'DELETE' THEN
          IF OLD.status = 'active' OR has_records THEN
            RAISE EXCEPTION 'Active or used template versions cannot be deleted';
          END IF;
          RETURN OLD;
        END IF;

        IF OLD.status = 'active' AND NEW.status NOT IN ('active', 'deprecated') THEN
          RAISE EXCEPTION 'An active template version can only become deprecated';
        END IF;
        IF OLD.status = 'deprecated' AND NEW.status <> 'deprecated' THEN
          RAISE EXCEPTION 'A deprecated template version cannot be reactivated or returned to draft';
        END IF;
        IF (OLD.status = 'active' OR has_records) AND (
          NEW.template_id IS DISTINCT FROM OLD.template_id OR
          NEW.version IS DISTINCT FROM OLD.version OR
          NEW.schema IS DISTINCT FROM OLD.schema OR
          NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id OR
          NEW.created_at IS DISTINCT FROM OLD.created_at
        ) THEN
          RAISE EXCEPTION 'Active or used template version content is immutable';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_active_template_field_mutation() RETURNS trigger AS $$
      DECLARE
        version_status template_version_status;
        affected_version_id uuid;
        has_records boolean;
      BEGIN
        affected_version_id := CASE
          WHEN TG_OP = 'DELETE' THEN OLD.template_version_id
          ELSE NEW.template_version_id
        END;
        SELECT status INTO version_status FROM template_versions WHERE id = affected_version_id;
        SELECT EXISTS(
          SELECT 1 FROM scientific_records WHERE template_version_id = affected_version_id
        ) INTO has_records;

        IF version_status = 'active' OR has_records THEN
          RAISE EXCEPTION 'Fields belonging to an active or used template version are immutable';
        END IF;
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_active_template_field_translation_mutation() RETURNS trigger AS $$
      DECLARE
        version_status template_version_status;
        affected_version_id uuid;
        affected_field_id uuid;
        has_records boolean;
      BEGIN
        affected_field_id := CASE
          WHEN TG_OP = 'DELETE' THEN OLD.field_definition_id
          ELSE NEW.field_definition_id
        END;
        SELECT tv.id, tv.status INTO affected_version_id, version_status
        FROM field_definitions f
        JOIN template_versions tv ON tv.id = f.template_version_id
        WHERE f.id = affected_field_id;
        SELECT EXISTS(
          SELECT 1 FROM scientific_records WHERE template_version_id = affected_version_id
        ) INTO has_records;

        IF version_status = 'active' OR has_records THEN
          RAISE EXCEPTION 'Field translations belonging to an active or used template version are immutable';
        END IF;
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_active_template_version_mutation() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
          RAISE EXCEPTION 'Active template versions cannot be deleted';
        END IF;
        IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND (
          NEW.template_id IS DISTINCT FROM OLD.template_id OR
          NEW.version IS DISTINCT FROM OLD.version OR
          NEW.schema IS DISTINCT FROM OLD.schema OR
          NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id OR
          NEW.created_at IS DISTINCT FROM OLD.created_at
        ) THEN
          RAISE EXCEPTION 'Active template version content is immutable';
        END IF;
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_active_template_field_mutation() RETURNS trigger AS $$
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
      CREATE OR REPLACE FUNCTION prevent_active_template_field_translation_mutation() RETURNS trigger AS $$
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
  }
}
