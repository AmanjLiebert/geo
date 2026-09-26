param(
  [string]$BaseUrl = 'http://localhost'
)

$ErrorActionPreference = 'Stop'
$teacherId = '00000000-0000-4000-8000-00000000f301'
$teacherSessionId = '00000000-0000-4000-8000-00000000f302'
$visitorId = '00000000-0000-4000-8000-00000000f303'
$visitorSessionId = '00000000-0000-4000-8000-00000000f304'
$categoryId = '00000000-0000-4000-8000-00000000f311'
$recordTypeId = '00000000-0000-4000-8000-00000000f312'
$templateId = '00000000-0000-4000-8000-00000000f313'
$templateVersionId = '00000000-0000-4000-8000-00000000f314'
$fieldId = '00000000-0000-4000-8000-00000000f315'
$targetTemplateVersionId = '00000000-0000-4000-8000-00000000f316'
$targetFieldId = '00000000-0000-4000-8000-00000000f317'

function New-OpaqueToken {
  return [Convert]::ToHexString(
    [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
  ).ToLowerInvariant()
}

function Get-TokenHash([string]$Token) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($Token)
  return [Convert]::ToHexString(
    [System.Security.Cryptography.SHA256]::HashData($bytes)
  ).ToLowerInvariant()
}

function Invoke-DatabaseSql([string]$Sql) {
  $Sql | docker compose exec -T database sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
  if ($LASTEXITCODE -ne 0) {
    throw "Database command failed with exit code $LASTEXITCODE."
  }
}

function Assert-Equal($Actual, $Expected, [string]$Message) {
  if ($Actual -ne $Expected) {
    throw "$Message Expected '$Expected' but received '$Actual'."
  }
}

function Get-HttpStatus([string]$Url, [string]$Cookie) {
  return [int](curl.exe -sS -o NUL -w '%{http_code}' -H "Cookie: $Cookie" $Url)
}

$teacherSessionToken = New-OpaqueToken
$teacherCsrfToken = New-OpaqueToken
$visitorSessionToken = New-OpaqueToken
$visitorCsrfToken = New-OpaqueToken
$recordId = $null

$cleanupSql = @"
DELETE FROM content_audit_events WHERE actor_user_id IN ('$teacherId', '$visitorId');
DELETE FROM scientific_structure_requests WHERE requested_by_user_id IN ('$teacherId', '$visitorId');
DELETE FROM record_revisions WHERE actor_user_id IN ('$teacherId', '$visitorId')
  OR record_id IN (SELECT id FROM scientific_records WHERE owner_user_id IN ('$teacherId', '$visitorId'));
DELETE FROM scientific_records WHERE owner_user_id IN ('$teacherId', '$visitorId');
DELETE FROM user_sessions WHERE id IN ('$teacherSessionId', '$visitorSessionId');
DELETE FROM category_record_types WHERE category_id = '$categoryId' AND record_type_id = '$recordTypeId';
UPDATE template_versions SET status = 'deprecated' WHERE id = '$templateVersionId' AND status = 'active';
DELETE FROM field_definition_translations WHERE field_definition_id IN ('$fieldId', '$targetFieldId');
DELETE FROM field_definitions WHERE id IN ('$fieldId', '$targetFieldId');
DELETE FROM template_versions WHERE id IN ('$templateVersionId', '$targetTemplateVersionId');
DELETE FROM record_templates WHERE id = '$templateId';
DELETE FROM record_type_translations WHERE record_type_id = '$recordTypeId';
DELETE FROM record_types WHERE id = '$recordTypeId';
DELETE FROM category_translations WHERE category_id = '$categoryId';
DELETE FROM categories WHERE id = '$categoryId';
DELETE FROM users WHERE id IN ('$teacherId', '$visitorId');
"@

try {
  Invoke-DatabaseSql $cleanupSql

  $fixtureSql = @"
INSERT INTO users (id, role, status, display_name)
VALUES
  ('$teacherId', 'teacher', 'active', 'Phase 3 proof teacher'),
  ('$visitorId', 'visitor', 'active', 'Phase 3 proof visitor');

INSERT INTO user_sessions (
  id, token_hash, csrf_token_hash, user_id, provider_subject,
  expires_at, reauthenticated_at
) VALUES
  ('$teacherSessionId', '$(Get-TokenHash $teacherSessionToken)', '$(Get-TokenHash $teacherCsrfToken)',
   '$teacherId', 'phase3-proof-teacher', now() + interval '1 hour', now()),
  ('$visitorSessionId', '$(Get-TokenHash $visitorSessionToken)', '$(Get-TokenHash $visitorCsrfToken)',
   '$visitorId', 'phase3-proof-visitor', now() + interval '1 hour', now());

INSERT INTO categories (id, stable_key, slug, records_allowed, status, position)
VALUES ('$categoryId', 'proof_category', 'proof-category', true, 'active', 1);
INSERT INTO category_translations (category_id, locale, name, review_status)
VALUES ('$categoryId', 'en', 'Proof category', 'reviewed');

INSERT INTO record_types (id, stable_key, status)
VALUES ('$recordTypeId', 'proof_occurrence', 'active');
INSERT INTO record_type_translations (record_type_id, locale, name, review_status)
VALUES ('$recordTypeId', 'en', 'Proof occurrence', 'reviewed');

INSERT INTO record_templates (id, record_type_id, stable_key, name, status)
VALUES ('$templateId', '$recordTypeId', 'proof_occurrence_template', 'Proof occurrence template', 'active');
INSERT INTO template_versions (id, template_id, version, schema, status, created_by_user_id)
VALUES ('$templateVersionId', '$templateId', 1, '{"kind":"proof"}'::jsonb, 'draft', '$teacherId');
INSERT INTO template_versions (id, template_id, version, schema, status, created_by_user_id)
VALUES ('$targetTemplateVersionId', '$templateId', 2, '{"kind":"proof-v2"}'::jsonb, 'draft', '$teacherId');
INSERT INTO field_definitions (
  id, template_version_id, stable_key, data_type, required, validation, position, status
) VALUES (
  '$fieldId', '$templateVersionId', 'scientific_name', 'text', true,
  '{"minLength":3,"maxLength":80}'::jsonb, 1, 'active'
);
INSERT INTO field_definitions (
  id, template_version_id, stable_key, data_type, required, validation, position, status
) VALUES (
  '$targetFieldId', '$targetTemplateVersionId', 'taxon_name', 'text', true,
  '{"minLength":3,"maxLength":100}'::jsonb, 1, 'active'
);
INSERT INTO field_definition_translations (field_definition_id, locale, label, review_status)
VALUES ('$fieldId', 'en', 'Scientific name', 'reviewed');
UPDATE template_versions SET status = 'active' WHERE id = '$templateVersionId';
INSERT INTO category_record_types (
  category_id, record_type_id, active_template_version_id, status, position
) VALUES ('$categoryId', '$recordTypeId', '$templateVersionId', 'active', 1);
"@
  Invoke-DatabaseSql $fixtureSql

  $teacherCookie = "gk_session=$teacherSessionToken; gk_csrf=$teacherCsrfToken"
  $visitorCookie = "gk_session=$visitorSessionToken; gk_csrf=$visitorCsrfToken"
  $teacherHeaders = @{ Cookie = $teacherCookie; 'x-csrf-token' = $teacherCsrfToken }
  $visitorHeaders = @{ Cookie = $visitorCookie; 'x-csrf-token' = $visitorCsrfToken }

  Assert-Equal (Get-HttpStatus "$BaseUrl/api/v1/records" $visitorCookie) 403 'Visitor draft access was not denied.'
  Assert-Equal (Get-HttpStatus "$BaseUrl/api/v1/saved-records" $visitorCookie) 200 'Visitor saved-list access failed.'

  $categories = Invoke-RestMethod -Uri "$BaseUrl/api/v1/scientific-structure/categories?locale=en" -Headers @{ Cookie = $teacherCookie }
  Assert-Equal $categories.items.Count 1 'Teacher could not load the temporary category.'
  $types = Invoke-RestMethod -Uri "$BaseUrl/api/v1/scientific-structure/categories/$categoryId/record-types?locale=en" -Headers @{ Cookie = $teacherCookie }
  Assert-Equal $types.items.Count 1 'Teacher could not load the allowed record type.'
  $template = Invoke-RestMethod -Uri "$BaseUrl/api/v1/scientific-structure/templates/active?categoryId=$categoryId&recordTypeId=$recordTypeId&locale=en" -Headers @{ Cookie = $teacherCookie }
  Assert-Equal $template.fields.Count 1 'The generated template field was not returned.'
  $structureRequest = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/scientific-structure/requests" -Headers $teacherHeaders -ContentType 'application/json' -Body (@{
    parentCategoryId = $categoryId
    proposedRecordTypeName = 'Proof missing record type'
    reason = 'The current reviewed structure cannot represent this temporary proof case.'
  } | ConvertTo-Json -Depth 10)
  Assert-Equal $structureRequest.status 'pending' 'Missing scientific structure was not recorded for review.'

  $unclassified = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/records" -Headers $teacherHeaders -ContentType 'application/json' -Body (@{
    attributes = @{}
  } | ConvertTo-Json -Depth 10)
  Assert-Equal $unclassified.status 'unclassified_draft' 'Empty unclassified draft creation failed.'

  $created = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/records" -Headers $teacherHeaders -ContentType 'application/json' -Body (@{
    categoryId = $categoryId
    recordTypeId = $recordTypeId
    slug = 'phase3-proof-record'
    attributes = @{}
  } | ConvertTo-Json -Depth 10)
  $recordId = $created.id
  Assert-Equal $created.status 'draft' 'Classified record did not start as a draft.'

  $translated = Invoke-RestMethod -Method Put -Uri "$BaseUrl/api/v1/records/$recordId/translations/en" -Headers $teacherHeaders -ContentType 'application/json' -Body (@{
    title = 'Phase 3 proof record'
    summary = 'Temporary lifecycle proof'
  } | ConvertTo-Json -Depth 10)
  Assert-Equal $translated.translations.Count 1 'Translation was not stored.'

  $beforeValidation = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/records/$recordId/validate" -Headers $teacherHeaders -ContentType 'application/json' -Body '{}'
  Assert-Equal $beforeValidation.valid $false 'Missing required scientific data incorrectly validated.'

  $updated = Invoke-RestMethod -Method Patch -Uri "$BaseUrl/api/v1/records/$recordId" -Headers $teacherHeaders -ContentType 'application/json' -Body (@{
    attributes = @{ scientific_name = 'Phaseus demonstratus' }
  } | ConvertTo-Json -Depth 10)
  Assert-Equal $updated.attributes.scientific_name 'Phaseus demonstratus' 'Scientific attributes were not stored.'

  $afterValidation = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/records/$recordId/validate" -Headers $teacherHeaders -ContentType 'application/json' -Body '{}'
  Assert-Equal $afterValidation.valid $true 'Complete draft did not validate.'
  $preview = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/scientific-structure/template-migrations/preview" -Headers $teacherHeaders -ContentType 'application/json' -Body (@{
    fromVersionId = $templateVersionId
    toVersionId = $targetTemplateVersionId
    mapping = @{ scientific_name = 'taxon_name' }
  } | ConvertTo-Json -Depth 10)
  Assert-Equal $preview.totalRecords 1 'Template preview did not inspect the pinned record.'
  Assert-Equal $preview.validRecords 1 'Compatible template mapping did not validate.'
  Assert-Equal $preview.recordsChanged $false 'Template preview changed canonical records.'
  $revisions = Invoke-RestMethod -Uri "$BaseUrl/api/v1/records/$recordId/revisions" -Headers @{ Cookie = $teacherCookie }
  if ($revisions.items.Count -lt 3) { throw 'Automatic record revisions were not created.' }

  $archived = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/records/$recordId/archive" -Headers $teacherHeaders -ContentType 'application/json' -Body '{}'
  Assert-Equal $archived.status 'archived' 'Record archive failed.'
  $restored = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/records/$recordId/restore" -Headers $teacherHeaders -ContentType 'application/json' -Body '{}'
  Assert-Equal $restored.status 'draft' 'Record restore failed.'

  Invoke-DatabaseSql "UPDATE template_versions SET status = 'deprecated' WHERE id = '$templateVersionId';"
  $immutabilitySql = @"
DO `$`$
DECLARE mutation_blocked boolean := false;
BEGIN
  BEGIN
    UPDATE field_definitions SET required = false WHERE id = '$fieldId';
  EXCEPTION WHEN OTHERS THEN
    mutation_blocked := true;
  END;
  IF NOT mutation_blocked THEN
    RAISE EXCEPTION 'A field pinned by a record was mutated.';
  END IF;
END
`$`$;
"@
  Invoke-DatabaseSql $immutabilitySql

  Invoke-DatabaseSql "UPDATE scientific_records SET status = 'published' WHERE id = '$recordId';"
  $saved = Invoke-RestMethod -Method Put -Uri "$BaseUrl/api/v1/saved-records/$recordId" -Headers $visitorHeaders -ContentType 'application/json' -Body '{}'
  Assert-Equal $saved.saved $true 'Visitor could not save the temporary published record.'
  $visitorSaved = Invoke-RestMethod -Uri "$BaseUrl/api/v1/saved-records" -Headers @{ Cookie = $visitorCookie }
  $teacherSaved = Invoke-RestMethod -Uri "$BaseUrl/api/v1/saved-records" -Headers @{ Cookie = $teacherCookie }
  Assert-Equal $visitorSaved.items.Count 1 'Visitor saved-record ownership was not preserved.'
  Assert-Equal $teacherSaved.items.Count 0 'One user could see another user saved-record list.'

  Write-Output "PHASE3_API_PROOF=passed"
  Write-Output "PHASE3_API_PROOF_REVISIONS=$($revisions.items.Count)"
  Write-Output 'PHASE3_TEMPLATE_IMMUTABILITY=passed'
  Write-Output 'PHASE3_SAVED_RECORD_OWNERSHIP=passed'
  Write-Output 'PHASE3_API_PROOF_PUBLICATION_ENDPOINT=absent-by-design'
}
finally {
  Invoke-DatabaseSql $cleanupSql
}
