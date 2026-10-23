import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecordPublicationReadiness1792305600000 implements MigrationInterface {
  name = 'RecordPublicationReadiness1792305600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_record_publication_readiness()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM NEW.status THEN
          IF NOT EXISTS (
            SELECT 1
            FROM categories c
            LEFT JOIN categories p ON p.id = c.parent_id
            WHERE c.id = NEW.category_id
              AND c.status = 'active'
              AND c.publication_status = 'published'
              AND (p.id IS NULL OR (p.status = 'active' AND p.publication_status = 'published'))
          ) THEN
            RAISE EXCEPTION 'Published records require a published category branch';
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM record_translations t
            WHERE t.record_id = NEW.id
              AND t.locale = 'en'
              AND t.status = 'published'
              AND length(btrim(t.title)) > 0
              AND length(btrim(COALESCE(t.summary, ''))) > 0
              AND length(btrim(COALESCE(t.description, ''))) > 0
              AND t.reviewer_user_id IS NOT NULL
              AND t.reviewer_user_id IS DISTINCT FROM t.translator_user_id
          ) THEN
            RAISE EXCEPTION 'Published records require complete independently reviewed English details';
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM record_media rm
            JOIN media_assets m ON m.id = rm.media_asset_id
            WHERE rm.record_id = NEW.id
              AND rm.is_primary = true
              AND m.media_kind = 'image'
              AND m.processing_status = 'approved'
              AND length(btrim(m.rights_statement)) > 0
              AND length(btrim(COALESCE(rm.alt_text, ''))) >= 5
          ) THEN
            RAISE EXCEPTION 'Published records require an approved rights-cleared primary image';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_scientific_record_publication_readiness"
      BEFORE UPDATE OF status ON "scientific_records"
      FOR EACH ROW EXECUTE FUNCTION enforce_record_publication_readiness()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "trg_scientific_record_publication_readiness" ON "scientific_records"',
    );
    await queryRunner.query('DROP FUNCTION IF EXISTS enforce_record_publication_readiness');
  }
}
