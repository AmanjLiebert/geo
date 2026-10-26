import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecordOwnerPublication1792392000000 implements MigrationInterface {
  name = 'RecordOwnerPublication1792392000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "trg_record_translations_independent_review" ON "record_translations"',
    );
    await queryRunner.query(recordPublicationFunction(false));
    await queryRunner.query(recordReadinessFunction(false));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(recordPublicationFunction(true));
    await queryRunner.query(recordReadinessFunction(true));
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "trg_record_translations_independent_review" ON "record_translations";
      CREATE TRIGGER "trg_record_translations_independent_review"
      BEFORE INSERT OR UPDATE OF status, translator_user_id, reviewer_user_id
      ON "record_translations"
      FOR EACH ROW EXECUTE FUNCTION enforce_independent_translation_review()
    `);
  }
}

function recordPublicationFunction(requireIndependentReviewer: boolean): string {
  const recordReviewerCheck = requireIndependentReviewer
    ? `NEW.reviewed_by_user_id IS NULL OR NEW.reviewed_by_user_id = NEW.owner_user_id`
    : `NEW.reviewed_by_user_id IS NULL`;
  const translationReviewerCheck = requireIndependentReviewer
    ? `reviewer_user_id IS NOT NULL AND reviewer_user_id IS DISTINCT FROM translator_user_id`
    : `reviewer_user_id IS NOT NULL`;
  const reviewerMessage = requireIndependentReviewer
    ? 'Published records require an independent reviewer'
    : 'Published records require an identified publisher';

  return `
    CREATE OR REPLACE FUNCTION enforce_scientific_record_publication() RETURNS trigger AS $$
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
        IF ${recordReviewerCheck} THEN
          RAISE EXCEPTION '${reviewerMessage}';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM record_translations
          WHERE record_id = NEW.id AND status = 'published' AND ${translationReviewerCheck}
        ) THEN
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
          SELECT 1 FROM record_media rm JOIN media_assets m ON m.id=rm.media_asset_id
          WHERE rm.record_id = NEW.id AND m.processing_status <> 'approved'
        ) THEN
          RAISE EXCEPTION 'Published record contains media that is not approved';
        END IF;
        NEW.published_at := COALESCE(NEW.published_at, now());
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `;
}

function recordReadinessFunction(requireIndependentReviewer: boolean): string {
  const translationReviewerCheck = requireIndependentReviewer
    ? `AND t.reviewer_user_id IS DISTINCT FROM t.translator_user_id`
    : '';
  const translationMessage = requireIndependentReviewer
    ? 'Published records require complete independently reviewed English details'
    : 'Published records require complete approved English details';

  return `
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
            ${translationReviewerCheck}
        ) THEN
          RAISE EXCEPTION '${translationMessage}';
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
  `;
}
