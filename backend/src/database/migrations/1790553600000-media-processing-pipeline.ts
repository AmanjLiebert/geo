import { MigrationInterface, QueryRunner } from 'typeorm';

export class MediaProcessingPipeline1790553600000 implements MigrationInterface {
  name = 'MediaProcessingPipeline1790553600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "media_assets"
        ADD COLUMN "processing_attempts" integer NOT NULL DEFAULT 0,
        ADD COLUMN "processing_started_at" timestamptz,
        ADD COLUMN "processed_at" timestamptz,
        ADD COLUMN "scanner_result" varchar(40),
        ADD CONSTRAINT "ck_media_assets_processing_attempts" CHECK ("processing_attempts" >= 0)
    `);

    await queryRunner.query(`
      CREATE TABLE "media_derivatives" (
        "id" uuid PRIMARY KEY,
        "media_asset_id" uuid NOT NULL REFERENCES "media_assets"("id") ON DELETE CASCADE,
        "derivative_kind" varchar(30) NOT NULL,
        "page_number" integer,
        "storage_key" varchar(500) NOT NULL UNIQUE,
        "content_type" varchar(120) NOT NULL,
        "byte_size" bigint NOT NULL,
        "width" integer NOT NULL,
        "height" integer NOT NULL,
        "sha256" char(64) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_media_derivatives_kind" CHECK ("derivative_kind" IN ('display', 'thumbnail', 'page')),
        CONSTRAINT "ck_media_derivatives_page" CHECK (
          ("derivative_kind" = 'page' AND "page_number" > 0)
          OR ("derivative_kind" <> 'page' AND "page_number" IS NULL)
        ),
        CONSTRAINT "ck_media_derivatives_key" CHECK ("storage_key" LIKE 'processed/%' AND position('..' in "storage_key") = 0),
        CONSTRAINT "ck_media_derivatives_type" CHECK ("content_type" = 'image/webp'),
        CONSTRAINT "ck_media_derivatives_size" CHECK ("byte_size" > 0),
        CONSTRAINT "ck_media_derivatives_dimensions" CHECK ("width" > 0 AND "height" > 0),
        CONSTRAINT "ck_media_derivatives_sha256" CHECK ("sha256" ~ '^[a-f0-9]{64}$')
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_media_derivatives_slot" ON "media_derivatives" ("media_asset_id", "derivative_kind", COALESCE("page_number", 0))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_media_derivatives_asset" ON "media_derivatives" ("media_asset_id", "derivative_kind", "page_number")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "media_derivatives"');
    await queryRunner.query(`
      ALTER TABLE "media_assets"
        DROP CONSTRAINT IF EXISTS "ck_media_assets_processing_attempts",
        DROP COLUMN IF EXISTS "scanner_result",
        DROP COLUMN IF EXISTS "processed_at",
        DROP COLUMN IF EXISTS "processing_started_at",
        DROP COLUMN IF EXISTS "processing_attempts"
    `);
  }
}
