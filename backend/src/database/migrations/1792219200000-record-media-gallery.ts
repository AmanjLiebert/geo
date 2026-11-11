import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecordMediaGallery1792219200000 implements MigrationInterface {
  name = 'RecordMediaGallery1792219200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "record_media"
        ADD COLUMN "caption" varchar(160),
        ADD COLUMN "description" varchar(2000),
        ADD COLUMN "alt_text" varchar(500),
        ADD COLUMN "is_primary" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_record_media_primary"
        ON "record_media" ("record_id")
        WHERE ("is_primary" = true)
    `);

    await queryRunner.query(`
      ALTER TABLE "media_assets" DROP CONSTRAINT IF EXISTS "ck_media_assets_kind"
    `);

    await queryRunner.query(`
      ALTER TABLE "media_assets"
        ADD CONSTRAINT "ck_media_assets_kind" CHECK ("media_kind" IN ('image', 'document', 'video'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const videoRows: unknown = await queryRunner.query(
      `SELECT 1 FROM "media_assets" WHERE "media_kind" = 'video' LIMIT 1`,
    );
    if (Array.isArray(videoRows) && videoRows.length > 0) {
      throw new Error(
        'Cannot roll back the record media gallery while video assets exist; archive and migrate them first.',
      );
    }

    await queryRunner.query('DROP INDEX IF EXISTS "uq_record_media_primary"');

    await queryRunner.query(`
      ALTER TABLE "record_media"
        DROP COLUMN IF EXISTS "is_primary",
        DROP COLUMN IF EXISTS "alt_text",
        DROP COLUMN IF EXISTS "description",
        DROP COLUMN IF EXISTS "caption"
    `);

    await queryRunner.query(`
      ALTER TABLE "media_assets" DROP CONSTRAINT IF EXISTS "ck_media_assets_kind"
    `);

    await queryRunner.query(`
      ALTER TABLE "media_assets"
        ADD CONSTRAINT "ck_media_assets_kind" CHECK ("media_kind" IN ('image', 'document'))
    `);
  }
}
