param(
  [ValidateSet('Setup', 'Cleanup')]
  [string]$Action = 'Setup',
  [switch]$ConfirmCleanup
)

# Local Docker Desktop rehearsal only. Cleanup removes drafts classified under
# the TEST ONLY categories, including drafts created during the browser test.
$ErrorActionPreference = 'Stop'

if ((docker context show) -ne 'desktop-linux') {
  throw 'This fixture may only run against the local Docker Desktop context.'
}
if ($Action -eq 'Cleanup' -and -not $ConfirmCleanup) {
  throw 'Cleanup removes test records. Run with -Action Cleanup -ConfirmCleanup only after finishing the browser test.'
}

$setupSql = @'
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM categories WHERE stable_key LIKE 'phase5_browser_test_%'
  ) OR EXISTS (
    SELECT 1 FROM scientific_records WHERE id = '00000000-0000-4000-8000-00000000e50b'
  ) THEN
    RAISE EXCEPTION 'Phase 5 browser fixture already exists. Setup will not overwrite it.';
  END IF;
END $$;

INSERT INTO users (id, role, status, display_name)
VALUES ('00000000-0000-4000-8000-00000000e50d', 'teacher', 'active', 'Temporary browser test fixture');

INSERT INTO categories (id, parent_id, stable_key, slug, records_allowed, status, position)
VALUES
  ('00000000-0000-4000-8000-00000000e500', NULL, 'phase5_browser_test_root', 'phase5-browser-test-root', false, 'active', 9000),
  ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000e500', 'phase5_browser_test_a', 'phase5-browser-test-a', true, 'active', 1),
  ('00000000-0000-4000-8000-00000000e502', '00000000-0000-4000-8000-00000000e500', 'phase5_browser_test_b', 'phase5-browser-test-b', true, 'active', 2);

INSERT INTO category_translations (category_id, locale, name, review_status)
VALUES
  ('00000000-0000-4000-8000-00000000e500', 'en', 'TEST ONLY — Category', 'reviewed'),
  ('00000000-0000-4000-8000-00000000e501', 'en', 'TEST ONLY — Subcategory A', 'reviewed'),
  ('00000000-0000-4000-8000-00000000e502', 'en', 'TEST ONLY — Subcategory B', 'reviewed');

INSERT INTO record_types (id, stable_key, status)
VALUES
  ('00000000-0000-4000-8000-00000000e503', 'phase5_browser_test_type_a', 'active'),
  ('00000000-0000-4000-8000-00000000e504', 'phase5_browser_test_type_b', 'active');

INSERT INTO record_type_translations (record_type_id, locale, name, review_status)
VALUES
  ('00000000-0000-4000-8000-00000000e503', 'en', 'TEST ONLY — Type A', 'reviewed'),
  ('00000000-0000-4000-8000-00000000e504', 'en', 'TEST ONLY — Type B', 'reviewed');

INSERT INTO record_templates (id, record_type_id, stable_key, name, status)
VALUES
  ('00000000-0000-4000-8000-00000000e505', '00000000-0000-4000-8000-00000000e503', 'phase5_browser_test_template_a', 'TEST ONLY — Template A', 'active'),
  ('00000000-0000-4000-8000-00000000e506', '00000000-0000-4000-8000-00000000e504', 'phase5_browser_test_template_b', 'TEST ONLY — Template B', 'active');

INSERT INTO template_versions (id, template_id, version, schema, status, created_by_user_id)
VALUES
  ('00000000-0000-4000-8000-00000000e507', '00000000-0000-4000-8000-00000000e505', 1, '{"kind":"temporary-browser-test"}'::jsonb, 'draft', '00000000-0000-4000-8000-00000000e50d'),
  ('00000000-0000-4000-8000-00000000e508', '00000000-0000-4000-8000-00000000e506', 1, '{"kind":"temporary-browser-test"}'::jsonb, 'draft', '00000000-0000-4000-8000-00000000e50d');

INSERT INTO field_definitions (id, template_version_id, stable_key, data_type, required, validation, position, status)
VALUES
  ('00000000-0000-4000-8000-00000000e509', '00000000-0000-4000-8000-00000000e507', 'test_note', 'text', false, '{"maxLength":160}'::jsonb, 1, 'active'),
  ('00000000-0000-4000-8000-00000000e50a', '00000000-0000-4000-8000-00000000e508', 'test_label', 'text', false, '{"maxLength":160}'::jsonb, 1, 'active');

INSERT INTO field_definition_translations (field_definition_id, locale, label, review_status)
VALUES
  ('00000000-0000-4000-8000-00000000e509', 'en', 'Test note', 'reviewed'),
  ('00000000-0000-4000-8000-00000000e50a', 'en', 'Test label', 'reviewed');

UPDATE template_versions SET status = 'active'
WHERE id IN ('00000000-0000-4000-8000-00000000e507', '00000000-0000-4000-8000-00000000e508');

INSERT INTO category_record_types (category_id, record_type_id, active_template_version_id, status, position)
VALUES
  ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000e503', '00000000-0000-4000-8000-00000000e507', 'active', 1),
  ('00000000-0000-4000-8000-00000000e502', '00000000-0000-4000-8000-00000000e504', '00000000-0000-4000-8000-00000000e508', 'active', 1);

INSERT INTO scientific_records (id, stable_id, slug, status, attributes, owner_user_id)
VALUES ('00000000-0000-4000-8000-00000000e50b', '00000000-0000-4000-8000-00000000e50c', NULL, 'unclassified_draft', '{}'::jsonb, '00000000-0000-4000-8000-00000000e50d');

INSERT INTO record_translations (record_id, locale, title, status)
VALUES ('00000000-0000-4000-8000-00000000e50b', 'en', 'TEST ONLY — Unclassified draft', 'draft');

COMMIT;
'@

$cleanupSql = @'
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM scientific_records
    WHERE (id = '00000000-0000-4000-8000-00000000e50b'
      OR category_id IN ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000e502')
      OR template_version_id IN ('00000000-0000-4000-8000-00000000e507', '00000000-0000-4000-8000-00000000e508'))
      AND status NOT IN ('draft', 'unclassified_draft')
  ) THEN
    RAISE EXCEPTION 'A fixture record is no longer a draft; cleanup stopped.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM record_media WHERE record_id IN (
      SELECT id FROM scientific_records WHERE id = '00000000-0000-4000-8000-00000000e50b'
        OR category_id IN ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000e502')
    )
  ) OR EXISTS (
    SELECT 1 FROM record_evidence WHERE record_id IN (
      SELECT id FROM scientific_records WHERE id = '00000000-0000-4000-8000-00000000e50b'
        OR category_id IN ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000e502')
    )
  ) OR EXISTS (
    SELECT 1 FROM record_locations WHERE record_id IN (
      SELECT id FROM scientific_records WHERE id = '00000000-0000-4000-8000-00000000e50b'
        OR category_id IN ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000e502')
    )
  ) THEN
    RAISE EXCEPTION 'Fixture records have media, evidence, or locations; cleanup stopped.';
  END IF;
END $$;

DELETE FROM record_revisions WHERE record_id IN (
  SELECT id FROM scientific_records WHERE id = '00000000-0000-4000-8000-00000000e50b'
    OR category_id IN ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000e502')
    OR template_version_id IN ('00000000-0000-4000-8000-00000000e507', '00000000-0000-4000-8000-00000000e508')
);
DELETE FROM scientific_records WHERE id = '00000000-0000-4000-8000-00000000e50b'
  OR category_id IN ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000e502')
  OR template_version_id IN ('00000000-0000-4000-8000-00000000e507', '00000000-0000-4000-8000-00000000e508');
DELETE FROM category_record_types WHERE category_id IN ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000e502');
UPDATE template_versions SET status = 'deprecated' WHERE id IN ('00000000-0000-4000-8000-00000000e507', '00000000-0000-4000-8000-00000000e508') AND status = 'active';
DELETE FROM field_definition_translations WHERE field_definition_id IN ('00000000-0000-4000-8000-00000000e509', '00000000-0000-4000-8000-00000000e50a');
DELETE FROM field_definitions WHERE id IN ('00000000-0000-4000-8000-00000000e509', '00000000-0000-4000-8000-00000000e50a');
DELETE FROM template_versions WHERE id IN ('00000000-0000-4000-8000-00000000e507', '00000000-0000-4000-8000-00000000e508');
DELETE FROM record_templates WHERE id IN ('00000000-0000-4000-8000-00000000e505', '00000000-0000-4000-8000-00000000e506');
DELETE FROM record_type_translations WHERE record_type_id IN ('00000000-0000-4000-8000-00000000e503', '00000000-0000-4000-8000-00000000e504');
DELETE FROM record_types WHERE id IN ('00000000-0000-4000-8000-00000000e503', '00000000-0000-4000-8000-00000000e504');
DELETE FROM category_translations WHERE category_id IN ('00000000-0000-4000-8000-00000000e500', '00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000e502');
DELETE FROM categories WHERE id IN ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000e502');
DELETE FROM categories WHERE id = '00000000-0000-4000-8000-00000000e500';
DELETE FROM users WHERE id = '00000000-0000-4000-8000-00000000e50d';

COMMIT;
'@

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $repoRoot
try {
  $sql = if ($Action -eq 'Setup') { $setupSql } else { $cleanupSql }
  $sql | docker compose exec -T database sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
  if ($LASTEXITCODE -ne 0) {
    throw "Fixture $Action failed; PostgreSQL rolled back the transaction."
  }
  Write-Output "Phase 5 browser fixture $Action completed."
} finally {
  Pop-Location
}
