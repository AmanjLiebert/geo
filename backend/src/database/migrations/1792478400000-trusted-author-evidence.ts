import { MigrationInterface, QueryRunner } from 'typeorm';

export class TrustedAuthorEvidence1792478400000 implements MigrationInterface {
  name = 'TrustedAuthorEvidence1792478400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(publicationFunction(false));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(publicationFunction(true));
  }
}

function publicationFunction(requireVerification: boolean): string {
  const referenceFilter = requireVerification ? `AND r.verification_status = 'verified'` : '';
  const policyName = requireVerification ? 'verified-reference' : 'reference';
  return `
    CREATE OR REPLACE FUNCTION enforce_scientific_record_publication() RETURNS trigger AS $$
    DECLARE
      minimum_references integer;
      reference_count integer;
      required_kinds jsonb;
      missing_kind text;
    BEGIN
      IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
        IF NEW.category_id IS NULL OR NEW.record_type_id IS NULL OR NEW.template_version_id IS NULL THEN
          RAISE EXCEPTION 'Published records require a complete classification';
        END IF;
        IF NEW.reviewed_by_user_id IS NULL THEN
          RAISE EXCEPTION 'Published records require an identified publisher';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM record_translations
          WHERE record_id = NEW.id AND status = 'published' AND reviewer_user_id IS NOT NULL
        ) THEN
          RAISE EXCEPTION 'Published records require a published translation';
        END IF;
        SELECT COALESCE(minimum_verified_references, 1), COALESCE(required_evidence_kinds, '[]'::jsonb)
        INTO minimum_references, required_kinds
        FROM record_type_evidence_policies WHERE record_type_id = NEW.record_type_id;
        minimum_references := COALESCE(minimum_references, 1);
        required_kinds := COALESCE(required_kinds, '[]'::jsonb);
        SELECT count(DISTINCT e.reference_id) INTO reference_count
        FROM record_evidence e JOIN scientific_references r ON r.id = e.reference_id
        WHERE e.record_id = NEW.id ${referenceFilter};
        IF reference_count < minimum_references THEN
          RAISE EXCEPTION 'Published records do not satisfy the ${policyName} policy';
        END IF;
        SELECT value INTO missing_kind FROM jsonb_array_elements_text(required_kinds)
        WHERE NOT EXISTS (
          SELECT 1 FROM record_evidence e JOIN scientific_references r ON r.id = e.reference_id
          WHERE e.record_id = NEW.id AND e.evidence_kind = value ${referenceFilter}
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
