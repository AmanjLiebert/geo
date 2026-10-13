import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScientificStructureLifecycle1790643600000 implements MigrationInterface {
  name = 'ScientificStructureLifecycle1790643600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION guard_category_parent_on_insert() RETURNS trigger AS $$
      BEGIN
        IF NEW.parent_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM categories WHERE id = NEW.parent_id AND status = 'active'
        ) THEN
          RAISE EXCEPTION 'A category must have an active parent';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_category_parent_on_insert"
      BEFORE INSERT ON categories
      FOR EACH ROW EXECUTE FUNCTION guard_category_parent_on_insert()
    `);
    await queryRunner.query(`
      CREATE FUNCTION guard_category_lifecycle() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'Archive categories through a reviewed forward migration';
        END IF;
        IF NEW.stable_key IS DISTINCT FROM OLD.stable_key
           OR NEW.slug IS DISTINCT FROM OLD.slug THEN
          RAISE EXCEPTION 'Category identity is immutable; use a new category and reviewed migration';
        END IF;
        IF NEW.parent_id IS NOT NULL AND
           (NEW.parent_id IS DISTINCT FROM OLD.parent_id OR
            (OLD.status = 'archived' AND NEW.status = 'active')) THEN
          IF NOT EXISTS (
            SELECT 1 FROM categories WHERE id = NEW.parent_id AND status = 'active'
          ) THEN
            RAISE EXCEPTION 'A category cannot move under an archived parent';
          END IF;
          IF EXISTS (
            WITH RECURSIVE ancestors AS (
              SELECT id, parent_id FROM categories WHERE id = NEW.parent_id
              UNION
              SELECT c.id, c.parent_id FROM categories c
              JOIN ancestors a ON c.id = a.parent_id
            )
            SELECT 1 FROM ancestors WHERE id = OLD.id
          ) THEN
            RAISE EXCEPTION 'Category hierarchy cannot contain a cycle';
          END IF;
        END IF;
        IF OLD.records_allowed AND NOT NEW.records_allowed AND EXISTS (
          SELECT 1 FROM scientific_records
          WHERE category_id = OLD.id AND status <> 'archived'
        ) THEN
          RAISE EXCEPTION 'Resolve active records before disabling direct records';
        END IF;
        IF OLD.status = 'active' AND NEW.status = 'archived' THEN
          IF EXISTS (SELECT 1 FROM categories WHERE parent_id = OLD.id AND status = 'active')
             OR EXISTS (SELECT 1 FROM category_record_types
                        WHERE category_id = OLD.id AND status = 'active')
             OR EXISTS (SELECT 1 FROM scientific_records
                        WHERE category_id = OLD.id AND status <> 'archived') THEN
            RAISE EXCEPTION 'Resolve active children, type bindings, and records before archiving category';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_category_lifecycle"
      BEFORE UPDATE OR DELETE ON categories
      FOR EACH ROW EXECUTE FUNCTION guard_category_lifecycle()
    `);

    await queryRunner.query(`
      CREATE FUNCTION guard_record_type_lifecycle() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'Archive record types through a reviewed forward migration';
        END IF;
        IF NEW.stable_key IS DISTINCT FROM OLD.stable_key THEN
          RAISE EXCEPTION 'Record type identity is immutable';
        END IF;
        IF OLD.status = 'active' AND NEW.status = 'archived' AND (
          EXISTS (SELECT 1 FROM category_record_types
                  WHERE record_type_id = OLD.id AND status = 'active')
          OR EXISTS (SELECT 1 FROM scientific_records
                     WHERE record_type_id = OLD.id AND status <> 'archived')
        ) THEN
          RAISE EXCEPTION 'Resolve active bindings and records before archiving record type';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_record_type_lifecycle"
      BEFORE UPDATE OR DELETE ON record_types
      FOR EACH ROW EXECUTE FUNCTION guard_record_type_lifecycle()
    `);

    await queryRunner.query(`
      CREATE FUNCTION guard_category_record_type_lifecycle() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'Archive category/type bindings through a reviewed forward migration';
        END IF;
        IF TG_OP = 'UPDATE' THEN
          IF NEW.category_id IS DISTINCT FROM OLD.category_id
             OR NEW.record_type_id IS DISTINCT FROM OLD.record_type_id THEN
            RAISE EXCEPTION 'Category/type binding identity is immutable';
          END IF;
          IF OLD.status = 'active' AND NEW.status = 'archived' AND EXISTS (
            SELECT 1 FROM scientific_records
            WHERE category_id = OLD.category_id
              AND record_type_id = OLD.record_type_id
              AND status <> 'archived'
          ) THEN
            RAISE EXCEPTION 'Resolve active records before archiving category/type binding';
          END IF;
        END IF;
        IF NEW.status = 'active' AND NOT EXISTS (
          SELECT 1 FROM template_versions tv
          JOIN record_templates t ON t.id = tv.template_id
          JOIN categories c ON c.id = NEW.category_id
          JOIN record_types rt ON rt.id = NEW.record_type_id
          WHERE tv.id = NEW.active_template_version_id
            AND tv.status = 'active'
            AND t.status = 'active'
            AND t.record_type_id = NEW.record_type_id
            AND c.status = 'active' AND c.records_allowed
            AND rt.status = 'active'
        ) THEN
          RAISE EXCEPTION 'Active binding requires an active category, type, and matching template';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_category_record_type_lifecycle"
      BEFORE INSERT OR UPDATE OR DELETE ON category_record_types
      FOR EACH ROW EXECUTE FUNCTION guard_category_record_type_lifecycle()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "trg_category_record_type_lifecycle" ON category_record_types',
    );
    await queryRunner.query('DROP FUNCTION IF EXISTS guard_category_record_type_lifecycle');
    await queryRunner.query('DROP TRIGGER IF EXISTS "trg_record_type_lifecycle" ON record_types');
    await queryRunner.query('DROP FUNCTION IF EXISTS guard_record_type_lifecycle');
    await queryRunner.query('DROP TRIGGER IF EXISTS "trg_category_lifecycle" ON categories');
    await queryRunner.query('DROP FUNCTION IF EXISTS guard_category_lifecycle');
    await queryRunner.query('DROP TRIGGER IF EXISTS "trg_category_parent_on_insert" ON categories');
    await queryRunner.query('DROP FUNCTION IF EXISTS guard_category_parent_on_insert');
  }
}
