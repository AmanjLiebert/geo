import { MigrationInterface, QueryRunner } from 'typeorm';

export class CategorySubtreeArchive1792132800000 implements MigrationInterface {
  name = 'CategorySubtreeArchive1792132800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Preserve descendants, bindings, and records. The service archives children first;
    // the existing trigger still rejects an active child under an archived parent.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION guard_category_lifecycle() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'Categories cannot be deleted';
        END IF;
        IF NEW.stable_key IS DISTINCT FROM OLD.stable_key OR NEW.slug IS DISTINCT FROM OLD.slug THEN
          RAISE EXCEPTION 'Category identity is immutable';
        END IF;
        IF NEW.parent_id IS NOT NULL AND
           (NEW.parent_id IS DISTINCT FROM OLD.parent_id OR
            (OLD.status = 'archived' AND NEW.status = 'active')) THEN
          IF NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.parent_id AND status = 'active') THEN
            RAISE EXCEPTION 'A category needs an active parent';
          END IF;
          IF EXISTS (
            WITH RECURSIVE ancestors AS (
              SELECT id, parent_id FROM categories WHERE id = NEW.parent_id
              UNION SELECT c.id, c.parent_id FROM categories c JOIN ancestors a ON c.id = a.parent_id
            ) SELECT 1 FROM ancestors WHERE id = OLD.id
          ) THEN RAISE EXCEPTION 'Category hierarchy cannot contain a cycle'; END IF;
        END IF;
        IF OLD.records_allowed AND NOT NEW.records_allowed AND EXISTS (
          SELECT 1 FROM scientific_records WHERE category_id = OLD.id AND status <> 'archived'
        ) THEN RAISE EXCEPTION 'Resolve active records before disabling direct records'; END IF;
        IF OLD.status = 'active' AND NEW.status = 'archived' AND EXISTS (
          SELECT 1 FROM categories WHERE parent_id = OLD.id AND status = 'active'
        ) THEN RAISE EXCEPTION 'Archive active children first'; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
  }

  down(): Promise<void> {
    return Promise.reject(
      new Error('Category lifecycle recovery requires a reviewed forward migration.'),
    );
  }
}
