import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4PublishingFoundation1790539200000 implements MigrationInterface {
  name = 'Phase4PublishingFoundation1790539200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "reference_verification_status" AS ENUM ('unverified', 'verified', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TYPE "location_visibility" AS ENUM ('public', 'approximate', 'restricted', 'embargoed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "media_processing_status" AS ENUM ('pending', 'quarantined', 'processing', 'approved', 'rejected', 'failed', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TYPE "editorial_status" AS ENUM ('draft', 'in_review', 'published', 'archived')`,
    );

    await queryRunner.query(`
      CREATE TABLE "scientific_references" (
        "id" uuid PRIMARY KEY,
        "source_type" varchar(40) NOT NULL,
        "authors" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "title" varchar(500) NOT NULL,
        "publication" varchar(300),
        "publication_year" integer,
        "identifier" varchar(240),
        "pages_or_figure" varchar(160),
        "source_url" text,
        "research_publication_id" uuid,
        "rights_statement" text,
        "verification_status" "reference_verification_status" NOT NULL DEFAULT 'unverified',
        "reviewer_notes" text,
        "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "verified_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_scientific_references_authors_array" CHECK (jsonb_typeof("authors") = 'array'),
        CONSTRAINT "ck_scientific_references_year" CHECK ("publication_year" IS NULL OR "publication_year" BETWEEN 1500 AND 2200),
        CONSTRAINT "ck_scientific_references_traceable" CHECK ("identifier" IS NOT NULL OR "source_url" IS NOT NULL OR "publication" IS NOT NULL OR "research_publication_id" IS NOT NULL)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "record_type_evidence_policies" (
        "record_type_id" uuid PRIMARY KEY REFERENCES "record_types"("id") ON DELETE CASCADE,
        "minimum_verified_references" integer NOT NULL DEFAULT 1,
        "required_evidence_kinds" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "independent_reviewer_required" boolean NOT NULL DEFAULT false,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_evidence_policy_minimum" CHECK ("minimum_verified_references" BETWEEN 0 AND 20),
        CONSTRAINT "ck_evidence_policy_kinds_array" CHECK (jsonb_typeof("required_evidence_kinds") = 'array')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "record_evidence" (
        "id" uuid PRIMARY KEY,
        "record_id" uuid NOT NULL REFERENCES "scientific_records"("id") ON DELETE CASCADE,
        "reference_id" uuid NOT NULL REFERENCES "scientific_references"("id") ON DELETE RESTRICT,
        "evidence_kind" varchar(60) NOT NULL,
        "claim_key" varchar(160),
        "field_key" varchar(100),
        "notes" text,
        "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_record_evidence_scope" UNIQUE NULLS NOT DISTINCT ("record_id", "reference_id", "evidence_kind", "claim_key", "field_key"),
        CONSTRAINT "ck_record_evidence_scope" CHECK (NOT ("claim_key" IS NOT NULL AND "field_key" IS NOT NULL))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_record_evidence_record" ON "record_evidence" ("record_id", "evidence_kind")`,
    );

    await queryRunner.query(`
      CREATE TABLE "record_locations" (
        "id" uuid PRIMARY KEY,
        "record_id" uuid NOT NULL REFERENCES "scientific_records"("id") ON DELETE CASCADE,
        "label" varchar(240),
        "exact_geometry" geometry(Geometry, 4326) NOT NULL,
        "public_geometry" geometry(Geometry, 4326),
        "visibility" "location_visibility" NOT NULL,
        "sensitivity_reason" text,
        "public_precision_metres" integer,
        "region_label" varchar(240),
        "embargo_until" timestamptz,
        "owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_record_locations_sensitive_reason" CHECK ("visibility" = 'public' OR "sensitivity_reason" IS NOT NULL),
        CONSTRAINT "ck_record_locations_public_geometry" CHECK (
          ("visibility" = 'public' AND "public_geometry" IS NOT NULL)
          OR ("visibility" = 'approximate' AND "public_geometry" IS NOT NULL AND "public_precision_metres" IS NOT NULL)
          OR ("visibility" IN ('restricted', 'embargoed'))
        ),
        CONSTRAINT "ck_record_locations_embargo" CHECK ("visibility" <> 'embargoed' OR "embargo_until" IS NOT NULL)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_record_locations_exact" ON "record_locations" USING gist ("exact_geometry")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_record_locations_public" ON "record_locations" USING gist ("public_geometry") WHERE "public_geometry" IS NOT NULL`,
    );
    await queryRunner.query(`
      CREATE VIEW "public_record_locations" AS
      SELECT id, record_id, label, visibility, region_label, public_precision_metres,
             CASE
               WHEN visibility = 'embargoed' AND embargo_until > now() THEN NULL
               WHEN visibility IN ('public', 'approximate') THEN public_geometry
               ELSE NULL
             END AS geometry
      FROM record_locations
    `);

    await queryRunner.query(`
      CREATE TABLE "map_layers" (
        "id" uuid PRIMARY KEY,
        "stable_key" varchar(100) NOT NULL UNIQUE,
        "title" varchar(240) NOT NULL,
        "source" text NOT NULL,
        "licence" text NOT NULL,
        "format" varchar(80) NOT NULL,
        "coordinate_reference_system" varchar(100) NOT NULL,
        "scale_or_resolution" varchar(120) NOT NULL,
        "geographic_extent" geometry(Geometry, 4326),
        "version_date" date,
        "visibility" "location_visibility" NOT NULL DEFAULT 'public',
        "status" "editorial_status" NOT NULL DEFAULT 'draft',
        "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "media_assets" (
        "id" uuid PRIMARY KEY,
        "storage_key" varchar(500) NOT NULL UNIQUE,
        "derivative_storage_key" varchar(500) UNIQUE,
        "original_filename" varchar(300) NOT NULL,
        "declared_content_type" varchar(120) NOT NULL,
        "detected_content_type" varchar(120),
        "byte_size" bigint NOT NULL,
        "sha256" char(64),
        "media_kind" varchar(30) NOT NULL,
        "processing_status" "media_processing_status" NOT NULL DEFAULT 'pending',
        "rights_statement" text NOT NULL,
        "licence" varchar(160),
        "credit" text,
        "owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "failure_code" varchar(80),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_media_assets_size" CHECK ("byte_size" > 0 AND "byte_size" <= 104857600),
        CONSTRAINT "ck_media_assets_kind" CHECK ("media_kind" IN ('image', 'document')),
        CONSTRAINT "ck_media_assets_sha256" CHECK ("sha256" IS NULL OR "sha256" ~ '^[a-f0-9]{64}$'),
        CONSTRAINT "ck_media_assets_generated_key" CHECK ("storage_key" LIKE 'quarantine/%' AND position('..' in "storage_key") = 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_media_assets_owner_status" ON "media_assets" ("owner_user_id", "processing_status", "created_at" DESC)`,
    );
    await queryRunner.query(`
      CREATE TABLE "record_media" (
        "record_id" uuid NOT NULL REFERENCES "scientific_records"("id") ON DELETE CASCADE,
        "media_asset_id" uuid NOT NULL REFERENCES "media_assets"("id") ON DELETE RESTRICT,
        "purpose" varchar(40) NOT NULL,
        "position" integer NOT NULL DEFAULT 0,
        PRIMARY KEY ("record_id", "media_asset_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "research_publications" (
        "id" uuid PRIMARY KEY,
        "stable_id" uuid NOT NULL UNIQUE,
        "slug" varchar(160) UNIQUE,
        "status" "editorial_status" NOT NULL DEFAULT 'draft',
        "publication_year" integer,
        "doi" varchar(240),
        "rights_statement" text NOT NULL,
        "owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "reviewed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "published_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_research_publication_year" CHECK ("publication_year" IS NULL OR "publication_year" BETWEEN 1500 AND 2200)
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "scientific_references"
      ADD CONSTRAINT "fk_scientific_references_research"
      FOREIGN KEY ("research_publication_id") REFERENCES "research_publications"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE TABLE "research_translations" (
        "research_publication_id" uuid NOT NULL REFERENCES "research_publications"("id") ON DELETE CASCADE,
        "locale" varchar(35) NOT NULL,
        "title" varchar(500) NOT NULL,
        "abstract" text,
        "status" "content_translation_status" NOT NULL DEFAULT 'draft',
        "translator_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "reviewer_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("research_publication_id", "locale")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "research_contributors" (
        "id" uuid PRIMARY KEY,
        "research_publication_id" uuid NOT NULL REFERENCES "research_publications"("id") ON DELETE CASCADE,
        "display_name" varchar(240) NOT NULL,
        "orcid" varchar(40),
        "organization" varchar(240),
        "contribution_role" varchar(80) NOT NULL,
        "position" integer NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "research_media" (
        "research_publication_id" uuid NOT NULL REFERENCES "research_publications"("id") ON DELETE CASCADE,
        "media_asset_id" uuid NOT NULL REFERENCES "media_assets"("id") ON DELETE RESTRICT,
        "purpose" varchar(40) NOT NULL,
        PRIMARY KEY ("research_publication_id", "media_asset_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "research_revisions" (
        "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "research_publication_id" uuid NOT NULL REFERENCES "research_publications"("id") ON DELETE RESTRICT,
        "revision" integer NOT NULL,
        "snapshot" jsonb NOT NULL,
        "reason" varchar(240) NOT NULL,
        "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("research_publication_id", "revision")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "content_relationships" (
        "id" uuid PRIMARY KEY,
        "source_type" varchar(20) NOT NULL,
        "source_id" uuid NOT NULL,
        "target_type" varchar(20) NOT NULL,
        "target_id" uuid NOT NULL,
        "relationship_type" varchar(80) NOT NULL,
        "notes" text,
        "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("source_type", "source_id", "target_type", "target_id", "relationship_type"),
        CONSTRAINT "ck_content_relationship_source_type" CHECK ("source_type" IN ('record', 'research')),
        CONSTRAINT "ck_content_relationship_target_type" CHECK ("target_type" IN ('record', 'research')),
        CONSTRAINT "ck_content_relationship_not_self" CHECK ("source_type" <> "target_type" OR "source_id" <> "target_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "news_articles" (
        "id" uuid PRIMARY KEY,
        "stable_id" uuid NOT NULL UNIQUE,
        "slug" varchar(160) UNIQUE,
        "status" "editorial_status" NOT NULL DEFAULT 'draft',
        "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "source_links" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "author_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "reviewed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "scheduled_at" timestamptz,
        "published_at" timestamptz,
        "expires_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_news_tags_array" CHECK (jsonb_typeof("tags") = 'array'),
        CONSTRAINT "ck_news_sources_array" CHECK (jsonb_typeof("source_links") = 'array'),
        CONSTRAINT "ck_news_expiry" CHECK ("expires_at" IS NULL OR "published_at" IS NULL OR "expires_at" > "published_at")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "news_translations" (
        "news_article_id" uuid NOT NULL REFERENCES "news_articles"("id") ON DELETE CASCADE,
        "locale" varchar(35) NOT NULL,
        "headline" varchar(300) NOT NULL,
        "summary" text,
        "body" text NOT NULL,
        "status" "content_translation_status" NOT NULL DEFAULT 'draft',
        "translator_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "reviewer_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("news_article_id", "locale")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "news_revisions" (
        "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "news_article_id" uuid NOT NULL REFERENCES "news_articles"("id") ON DELETE RESTRICT,
        "revision" integer NOT NULL,
        "snapshot" jsonb NOT NULL,
        "reason" varchar(240) NOT NULL,
        "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("news_article_id", "revision")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "managed_pages" (
        "id" uuid PRIMARY KEY,
        "page_type" varchar(40) NOT NULL UNIQUE,
        "status" "editorial_status" NOT NULL DEFAULT 'draft',
        "reviewed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "effective_at" timestamptz,
        "published_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_managed_page_type" CHECK ("page_type" IN ('about', 'mission', 'ownership', 'contact', 'privacy', 'terms'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "managed_page_translations" (
        "managed_page_id" uuid NOT NULL REFERENCES "managed_pages"("id") ON DELETE CASCADE,
        "locale" varchar(35) NOT NULL,
        "title" varchar(300) NOT NULL,
        "body" text NOT NULL,
        "status" "content_translation_status" NOT NULL DEFAULT 'draft',
        "translator_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "reviewer_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("managed_page_id", "locale")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "managed_page_revisions" (
        "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "managed_page_id" uuid NOT NULL REFERENCES "managed_pages"("id") ON DELETE RESTRICT,
        "revision" integer NOT NULL,
        "snapshot" jsonb NOT NULL,
        "reason" varchar(240) NOT NULL,
        "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("managed_page_id", "revision")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "organization_profiles" (
        "id" uuid PRIMARY KEY,
        "stable_key" varchar(80) NOT NULL UNIQUE,
        "legal_name" varchar(300) NOT NULL,
        "display_name" varchar(300) NOT NULL,
        "ownership_statement" text NOT NULL,
        "contact_email" varchar(320),
        "contact_phone" varchar(40),
        "public_links" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "logo_media_asset_id" uuid REFERENCES "media_assets"("id") ON DELETE SET NULL,
        "updated_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_organization_links_array" CHECK (jsonb_typeof("public_links") = 'array')
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "scientific_records"
        ADD COLUMN "reviewed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        ADD COLUMN "published_at" timestamptz
    `);

    await queryRunner.query(`
      CREATE FUNCTION enforce_scientific_record_publication() RETURNS trigger AS $$
      DECLARE
        minimum_references integer;
        verified_references integer;
        required_kinds jsonb;
        missing_kind text;
      BEGIN
        IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
          IF NEW.category_id IS NULL OR NEW.record_type_id IS NULL OR NEW.template_version_id IS NULL THEN
            RAISE EXCEPTION 'Published records require a complete classification';
          END IF;
          IF NEW.reviewed_by_user_id IS NULL OR NEW.reviewed_by_user_id = NEW.owner_user_id THEN
            RAISE EXCEPTION 'Published records require an independent reviewer';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM record_translations WHERE record_id = NEW.id AND status = 'published'
            AND reviewer_user_id IS NOT NULL AND reviewer_user_id IS DISTINCT FROM translator_user_id) THEN
            RAISE EXCEPTION 'Published records require a published translation';
          END IF;
          SELECT COALESCE(minimum_verified_references, 1), COALESCE(required_evidence_kinds, '[]'::jsonb)
          INTO minimum_references, required_kinds
          FROM record_type_evidence_policies WHERE record_type_id = NEW.record_type_id;
          minimum_references := COALESCE(minimum_references, 1);
          required_kinds := COALESCE(required_kinds, '[]'::jsonb);
          SELECT count(DISTINCT e.reference_id) INTO verified_references
          FROM record_evidence e JOIN scientific_references r ON r.id = e.reference_id
          WHERE e.record_id = NEW.id AND r.verification_status = 'verified';
          IF verified_references < minimum_references THEN
            RAISE EXCEPTION 'Published records do not satisfy the verified-reference policy';
          END IF;
          SELECT value INTO missing_kind FROM jsonb_array_elements_text(required_kinds)
          WHERE NOT EXISTS (
            SELECT 1 FROM record_evidence e JOIN scientific_references r ON r.id = e.reference_id
            WHERE e.record_id = NEW.id AND e.evidence_kind = value AND r.verification_status = 'verified'
          ) LIMIT 1;
          IF missing_kind IS NOT NULL THEN
            RAISE EXCEPTION 'Published record is missing required evidence kind: %', missing_kind;
          END IF;
          IF EXISTS (
            SELECT 1 FROM record_locations l WHERE l.record_id = NEW.id AND (
              (l.visibility IN ('public', 'approximate') AND l.public_geometry IS NULL)
              OR (l.visibility = 'embargoed' AND l.embargo_until IS NULL)
            )
          ) THEN
            RAISE EXCEPTION 'Published record has an invalid public location policy';
          END IF;
          IF EXISTS (
            SELECT 1 FROM record_media rm JOIN media_assets m ON m.id = rm.media_asset_id
            WHERE rm.record_id = NEW.id AND m.processing_status <> 'approved'
          ) THEN
            RAISE EXCEPTION 'Published record contains media that is not approved';
          END IF;
          NEW.published_at := COALESCE(NEW.published_at, now());
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_scientific_record_publication"
      BEFORE UPDATE OF status ON "scientific_records"
      FOR EACH ROW EXECUTE FUNCTION enforce_scientific_record_publication()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "trg_scientific_record_publication" ON "scientific_records"',
    );
    await queryRunner.query('DROP FUNCTION IF EXISTS enforce_scientific_record_publication');
    await queryRunner.query(
      'ALTER TABLE "scientific_records" DROP COLUMN IF EXISTS "published_at", DROP COLUMN IF EXISTS "reviewed_by_user_id"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "organization_profiles"');
    await queryRunner.query('DROP TABLE IF EXISTS "managed_page_revisions"');
    await queryRunner.query('DROP TABLE IF EXISTS "managed_page_translations"');
    await queryRunner.query('DROP TABLE IF EXISTS "managed_pages"');
    await queryRunner.query('DROP TABLE IF EXISTS "news_revisions"');
    await queryRunner.query('DROP TABLE IF EXISTS "news_translations"');
    await queryRunner.query('DROP TABLE IF EXISTS "news_articles"');
    await queryRunner.query('DROP TABLE IF EXISTS "content_relationships"');
    await queryRunner.query(
      'ALTER TABLE "scientific_references" DROP CONSTRAINT IF EXISTS "fk_scientific_references_research"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "research_revisions"');
    await queryRunner.query('DROP TABLE IF EXISTS "research_media"');
    await queryRunner.query('DROP TABLE IF EXISTS "research_contributors"');
    await queryRunner.query('DROP TABLE IF EXISTS "research_translations"');
    await queryRunner.query('DROP TABLE IF EXISTS "research_publications"');
    await queryRunner.query('DROP TABLE IF EXISTS "record_media"');
    await queryRunner.query('DROP TABLE IF EXISTS "media_assets"');
    await queryRunner.query('DROP TABLE IF EXISTS "map_layers"');
    await queryRunner.query('DROP VIEW IF EXISTS "public_record_locations"');
    await queryRunner.query('DROP TABLE IF EXISTS "record_locations"');
    await queryRunner.query('DROP TABLE IF EXISTS "record_evidence"');
    await queryRunner.query('DROP TABLE IF EXISTS "record_type_evidence_policies"');
    await queryRunner.query('DROP TABLE IF EXISTS "scientific_references"');
    await queryRunner.query('DROP TYPE IF EXISTS "editorial_status"');
    await queryRunner.query('DROP TYPE IF EXISTS "media_processing_status"');
    await queryRunner.query('DROP TYPE IF EXISTS "location_visibility"');
    await queryRunner.query('DROP TYPE IF EXISTS "reference_verification_status"');
  }
}
