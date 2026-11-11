import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReviewIntegrity1790542800000 implements MigrationInterface {
  name = 'ReviewIntegrity1790542800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION enforce_independent_translation_review() RETURNS trigger AS $$
      BEGIN
        IF NEW.status IN ('reviewed', 'published') AND (
          NEW.reviewer_user_id IS NULL OR NEW.reviewer_user_id IS NOT DISTINCT FROM NEW.translator_user_id
        ) THEN
          RAISE EXCEPTION 'Reviewed translations require an independent reviewer';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    for (const table of [
      'record_translations',
      'research_translations',
      'news_translations',
      'managed_page_translations',
    ]) {
      await queryRunner.query(`
        CREATE TRIGGER "trg_${table}_independent_review"
        BEFORE INSERT OR UPDATE OF status, translator_user_id, reviewer_user_id ON "${table}"
        FOR EACH ROW EXECUTE FUNCTION enforce_independent_translation_review()
      `);
    }

    await queryRunner.query(`
      CREATE FUNCTION enforce_research_publication() RETURNS trigger AS $$
      BEGIN
        IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
          IF NEW.reviewed_by_user_id IS NULL OR NEW.reviewed_by_user_id = NEW.owner_user_id THEN
            RAISE EXCEPTION 'Research publication requires an independent reviewer';
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM research_translations WHERE research_publication_id=NEW.id
            AND status='published' AND reviewer_user_id IS DISTINCT FROM translator_user_id
          ) THEN RAISE EXCEPTION 'Research publication requires a published reviewed translation'; END IF;
          IF NOT EXISTS (SELECT 1 FROM research_contributors WHERE research_publication_id=NEW.id) THEN
            RAISE EXCEPTION 'Research publication requires a contributor';
          END IF;
          IF EXISTS (
            SELECT 1 FROM research_media rm JOIN media_assets m ON m.id=rm.media_asset_id
            WHERE rm.research_publication_id=NEW.id AND m.processing_status <> 'approved'
          ) THEN RAISE EXCEPTION 'Research publication contains unapproved media'; END IF;
          NEW.published_at := COALESCE(NEW.published_at, now());
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_research_publication"
      BEFORE UPDATE OF status ON "research_publications"
      FOR EACH ROW EXECUTE FUNCTION enforce_research_publication()
    `);

    await queryRunner.query(`
      CREATE FUNCTION enforce_news_publication() RETURNS trigger AS $$
      BEGIN
        IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
          IF NEW.reviewed_by_user_id IS NULL OR NEW.reviewed_by_user_id = NEW.author_user_id THEN
            RAISE EXCEPTION 'News publication requires an independent reviewer';
          END IF;
          IF jsonb_array_length(NEW.source_links) < 1 THEN
            RAISE EXCEPTION 'News publication requires a source';
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM news_translations WHERE news_article_id=NEW.id
            AND status='published' AND reviewer_user_id IS DISTINCT FROM translator_user_id
          ) THEN RAISE EXCEPTION 'News publication requires a published reviewed translation'; END IF;
          NEW.published_at := COALESCE(NEW.published_at, now());
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_news_publication"
      BEFORE UPDATE OF status ON "news_articles"
      FOR EACH ROW EXECUTE FUNCTION enforce_news_publication()
    `);

    await queryRunner.query(`
      CREATE FUNCTION enforce_managed_page_publication() RETURNS trigger AS $$
      BEGIN
        IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
          IF NEW.reviewed_by_user_id IS NULL THEN
            RAISE EXCEPTION 'Managed page publication requires a reviewer';
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM managed_page_translations WHERE managed_page_id=NEW.id
            AND status='published' AND reviewer_user_id IS DISTINCT FROM translator_user_id
          ) THEN RAISE EXCEPTION 'Managed page publication requires a published reviewed translation'; END IF;
          NEW.published_at := COALESCE(NEW.published_at, now());
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_managed_page_publication"
      BEFORE UPDATE OF status ON "managed_pages"
      FOR EACH ROW EXECUTE FUNCTION enforce_managed_page_publication()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "trg_managed_page_publication" ON "managed_pages"',
    );
    await queryRunner.query('DROP FUNCTION IF EXISTS enforce_managed_page_publication');
    await queryRunner.query('DROP TRIGGER IF EXISTS "trg_news_publication" ON "news_articles"');
    await queryRunner.query('DROP FUNCTION IF EXISTS enforce_news_publication');
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "trg_research_publication" ON "research_publications"',
    );
    await queryRunner.query('DROP FUNCTION IF EXISTS enforce_research_publication');
    for (const table of [
      'managed_page_translations',
      'news_translations',
      'research_translations',
      'record_translations',
    ]) {
      await queryRunner.query(
        `DROP TRIGGER IF EXISTS "trg_${table}_independent_review" ON "${table}"`,
      );
    }
    await queryRunner.query('DROP FUNCTION IF EXISTS enforce_independent_translation_review');
  }
}
