import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScientificContentFoundation1790442000000 implements MigrationInterface {
  name = 'ScientificContentFoundation1790442000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "scientific_structure_status" AS ENUM ('active', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TYPE "template_version_status" AS ENUM ('draft', 'active', 'deprecated')`,
    );
    await queryRunner.query(
      `CREATE TYPE "field_data_type" AS ENUM ('text', 'long_text', 'integer', 'decimal', 'boolean', 'date', 'choice', 'multi_choice')`,
    );
    await queryRunner.query(`CREATE TYPE "field_status" AS ENUM ('active', 'deprecated')`);
    await queryRunner.query(
      `CREATE TYPE "scientific_record_status" AS ENUM ('unclassified_draft', 'draft', 'in_review', 'published', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TYPE "content_translation_status" AS ENUM ('draft', 'reviewed', 'published')`,
    );

    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid PRIMARY KEY,
        "parent_id" uuid REFERENCES "categories"("id") ON DELETE RESTRICT,
        "stable_key" varchar(100) NOT NULL UNIQUE,
        "slug" varchar(120) NOT NULL UNIQUE,
        "records_allowed" boolean NOT NULL DEFAULT false,
        "status" "scientific_structure_status" NOT NULL DEFAULT 'active',
        "position" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_categories_not_self_parent" CHECK ("parent_id" IS NULL OR "parent_id" <> "id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_categories_parent_position" ON "categories" ("parent_id", "position", "stable_key")`,
    );

    await queryRunner.query(`
      CREATE TABLE "category_translations" (
        "category_id" uuid NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
        "locale" varchar(35) NOT NULL,
        "name" varchar(160) NOT NULL,
        "description" text,
        "review_status" "content_translation_status" NOT NULL DEFAULT 'draft',
        PRIMARY KEY ("category_id", "locale"),
        CONSTRAINT "ck_category_translation_locale" CHECK ("locale" ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "record_types" (
        "id" uuid PRIMARY KEY,
        "stable_key" varchar(100) NOT NULL UNIQUE,
        "status" "scientific_structure_status" NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "record_type_translations" (
        "record_type_id" uuid NOT NULL REFERENCES "record_types"("id") ON DELETE CASCADE,
        "locale" varchar(35) NOT NULL,
        "name" varchar(160) NOT NULL,
        "description" text,
        "review_status" "content_translation_status" NOT NULL DEFAULT 'draft',
        PRIMARY KEY ("record_type_id", "locale"),
        CONSTRAINT "ck_record_type_translation_locale" CHECK ("locale" ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "record_templates" (
        "id" uuid PRIMARY KEY,
        "record_type_id" uuid NOT NULL REFERENCES "record_types"("id") ON DELETE RESTRICT,
        "stable_key" varchar(100) NOT NULL UNIQUE,
        "name" varchar(160) NOT NULL,
        "status" "scientific_structure_status" NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_record_templates_type" ON "record_templates" ("record_type_id", "status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "template_versions" (
        "id" uuid PRIMARY KEY,
        "template_id" uuid NOT NULL REFERENCES "record_templates"("id") ON DELETE RESTRICT,
        "version" integer NOT NULL,
        "schema" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "status" "template_version_status" NOT NULL DEFAULT 'draft',
        "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_template_versions_template_version" UNIQUE ("template_id", "version"),
        CONSTRAINT "ck_template_versions_positive" CHECK ("version" > 0),
        CONSTRAINT "ck_template_versions_schema_object" CHECK (jsonb_typeof("schema") = 'object')
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_template_versions_one_active" ON "template_versions" ("template_id") WHERE "status" = 'active'`,
    );

    await queryRunner.query(`
      CREATE TABLE "field_definitions" (
        "id" uuid PRIMARY KEY,
        "template_version_id" uuid NOT NULL REFERENCES "template_versions"("id") ON DELETE CASCADE,
        "stable_key" varchar(100) NOT NULL,
        "data_type" "field_data_type" NOT NULL,
        "required" boolean NOT NULL DEFAULT false,
        "validation" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "unit" varchar(80),
        "searchable" boolean NOT NULL DEFAULT false,
        "filterable" boolean NOT NULL DEFAULT false,
        "position" integer NOT NULL DEFAULT 0,
        "status" "field_status" NOT NULL DEFAULT 'active',
        CONSTRAINT "uq_field_definitions_version_key" UNIQUE ("template_version_id", "stable_key"),
        CONSTRAINT "ck_field_definitions_validation_object" CHECK (jsonb_typeof("validation") = 'object')
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_field_definitions_version_position" ON "field_definitions" ("template_version_id", "position", "stable_key")`,
    );
    await queryRunner.query(`
      CREATE TABLE "field_definition_translations" (
        "field_definition_id" uuid NOT NULL REFERENCES "field_definitions"("id") ON DELETE CASCADE,
        "locale" varchar(35) NOT NULL,
        "label" varchar(160) NOT NULL,
        "help_text" text,
        "review_status" "content_translation_status" NOT NULL DEFAULT 'draft',
        PRIMARY KEY ("field_definition_id", "locale"),
        CONSTRAINT "ck_field_definition_translation_locale" CHECK ("locale" ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "category_record_types" (
        "category_id" uuid NOT NULL REFERENCES "categories"("id") ON DELETE RESTRICT,
        "record_type_id" uuid NOT NULL REFERENCES "record_types"("id") ON DELETE RESTRICT,
        "active_template_version_id" uuid NOT NULL REFERENCES "template_versions"("id") ON DELETE RESTRICT,
        "status" "scientific_structure_status" NOT NULL DEFAULT 'active',
        "position" integer NOT NULL DEFAULT 0,
        PRIMARY KEY ("category_id", "record_type_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "template_migrations" (
        "id" uuid PRIMARY KEY,
        "from_version_id" uuid NOT NULL REFERENCES "template_versions"("id") ON DELETE RESTRICT,
        "to_version_id" uuid NOT NULL REFERENCES "template_versions"("id") ON DELETE RESTRICT,
        "mapping" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "dry_run_result" jsonb,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "approved_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_template_migrations_versions" UNIQUE ("from_version_id", "to_version_id"),
        CONSTRAINT "ck_template_migrations_different_versions" CHECK ("from_version_id" <> "to_version_id"),
        CONSTRAINT "ck_template_migrations_mapping_object" CHECK (jsonb_typeof("mapping") = 'object'),
        CONSTRAINT "ck_template_migrations_status" CHECK ("status" IN ('draft', 'previewed', 'approved', 'applied'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "scientific_records" (
        "id" uuid PRIMARY KEY,
        "stable_id" uuid NOT NULL UNIQUE,
        "slug" varchar(160) UNIQUE,
        "status" "scientific_record_status" NOT NULL DEFAULT 'unclassified_draft',
        "category_id" uuid REFERENCES "categories"("id") ON DELETE RESTRICT,
        "record_type_id" uuid REFERENCES "record_types"("id") ON DELETE RESTRICT,
        "template_version_id" uuid REFERENCES "template_versions"("id") ON DELETE RESTRICT,
        "attributes" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_scientific_records_attributes_object" CHECK (jsonb_typeof("attributes") = 'object'),
        CONSTRAINT "ck_scientific_records_classification" CHECK (
          ("category_id" IS NULL AND "record_type_id" IS NULL AND "template_version_id" IS NULL)
          OR
          ("category_id" IS NOT NULL AND "record_type_id" IS NOT NULL AND "template_version_id" IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_scientific_records_status_updated" ON "scientific_records" ("status", "updated_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_scientific_records_owner" ON "scientific_records" ("owner_user_id", "updated_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_scientific_records_classification" ON "scientific_records" ("category_id", "record_type_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "record_translations" (
        "record_id" uuid NOT NULL REFERENCES "scientific_records"("id") ON DELETE CASCADE,
        "locale" varchar(35) NOT NULL,
        "title" varchar(240) NOT NULL,
        "summary" text,
        "description" text,
        "source_locale" varchar(35),
        "status" "content_translation_status" NOT NULL DEFAULT 'draft',
        "translator_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "reviewer_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("record_id", "locale"),
        CONSTRAINT "ck_record_translation_locale" CHECK ("locale" ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
        CONSTRAINT "ck_record_translation_source_locale" CHECK ("source_locale" IS NULL OR "source_locale" ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "record_revisions" (
        "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "record_id" uuid NOT NULL REFERENCES "scientific_records"("id") ON DELETE RESTRICT,
        "revision" integer NOT NULL,
        "snapshot" jsonb NOT NULL,
        "reason" varchar(240) NOT NULL,
        "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_record_revisions_record_revision" UNIQUE ("record_id", "revision"),
        CONSTRAINT "ck_record_revisions_positive" CHECK ("revision" > 0),
        CONSTRAINT "ck_record_revisions_snapshot_object" CHECK (jsonb_typeof("snapshot") = 'object')
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_record_revisions_record_created" ON "record_revisions" ("record_id", "created_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "saved_records" (
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "record_id" uuid NOT NULL REFERENCES "scientific_records"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("user_id", "record_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "content_audit_events" (
        "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "action" varchar(100) NOT NULL,
        "target_type" varchar(60) NOT NULL,
        "target_id" varchar(191),
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_content_audit_events_target" ON "content_audit_events" ("target_type", "target_id", "created_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE FUNCTION prevent_active_template_version_mutation() RETURNS trigger AS $$
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
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_template_versions_immutable"
      BEFORE UPDATE OR DELETE ON "template_versions"
      FOR EACH ROW EXECUTE FUNCTION prevent_active_template_version_mutation()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "trg_template_versions_immutable" ON "template_versions"',
    );
    await queryRunner.query('DROP FUNCTION IF EXISTS prevent_active_template_version_mutation');
    await queryRunner.query('DROP TABLE IF EXISTS "content_audit_events"');
    await queryRunner.query('DROP TABLE IF EXISTS "saved_records"');
    await queryRunner.query('DROP TABLE IF EXISTS "record_revisions"');
    await queryRunner.query('DROP TABLE IF EXISTS "record_translations"');
    await queryRunner.query('DROP TABLE IF EXISTS "scientific_records"');
    await queryRunner.query('DROP TABLE IF EXISTS "template_migrations"');
    await queryRunner.query('DROP TABLE IF EXISTS "category_record_types"');
    await queryRunner.query('DROP TABLE IF EXISTS "field_definition_translations"');
    await queryRunner.query('DROP TABLE IF EXISTS "field_definitions"');
    await queryRunner.query('DROP TABLE IF EXISTS "template_versions"');
    await queryRunner.query('DROP TABLE IF EXISTS "record_templates"');
    await queryRunner.query('DROP TABLE IF EXISTS "record_type_translations"');
    await queryRunner.query('DROP TABLE IF EXISTS "record_types"');
    await queryRunner.query('DROP TABLE IF EXISTS "category_translations"');
    await queryRunner.query('DROP TABLE IF EXISTS "categories"');
    await queryRunner.query('DROP TYPE IF EXISTS "content_translation_status"');
    await queryRunner.query('DROP TYPE IF EXISTS "scientific_record_status"');
    await queryRunner.query('DROP TYPE IF EXISTS "field_status"');
    await queryRunner.query('DROP TYPE IF EXISTS "field_data_type"');
    await queryRunner.query('DROP TYPE IF EXISTS "template_version_status"');
    await queryRunner.query('DROP TYPE IF EXISTS "scientific_structure_status"');
  }
}
