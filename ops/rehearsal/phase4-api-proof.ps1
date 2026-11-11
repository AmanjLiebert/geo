param([string]$BaseUrl = 'http://localhost')

$ErrorActionPreference = 'Stop'
$authorId = '00000000-0000-4000-8000-00000000f401'
$reviewerId = '00000000-0000-4000-8000-00000000f402'
$adminAuthorId = '00000000-0000-4000-8000-00000000f403'
$adminReviewerId = '00000000-0000-4000-8000-00000000f404'
$visitorId = '00000000-0000-4000-8000-00000000f405'
$categoryId = '00000000-0000-4000-8000-00000000f411'
$recordTypeId = '00000000-0000-4000-8000-00000000f412'
$templateId = '00000000-0000-4000-8000-00000000f413'
$templateVersionId = '00000000-0000-4000-8000-00000000f414'
$fieldId = '00000000-0000-4000-8000-00000000f415'
$mediaId = '00000000-0000-4000-8000-00000000f416'

function New-Token {
  $bytes = New-Object byte[] 32
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
  -join ($bytes | ForEach-Object { $_.ToString('x2') })
}
function Get-Hash([string]$Token) {
  $hasher = [System.Security.Cryptography.SHA256]::Create()
  try { $bytes = $hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($Token)) } finally { $hasher.Dispose() }
  -join ($bytes | ForEach-Object { $_.ToString('x2') })
}
function Invoke-Sql([string]$Sql) {
  $Sql | docker compose exec -T database sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
  if ($LASTEXITCODE -ne 0) { throw "Database command failed ($LASTEXITCODE)." }
}
function Assert-Equal($Actual, $Expected, [string]$Message) {
  if ($Actual -ne $Expected) { throw "$Message Expected '$Expected', received '$Actual'." }
}
function Get-Status([string]$Method, [string]$Url, [string]$Cookie, [string]$Csrf = '', [string]$Body = '{}') {
  $arguments = @('-sS','-o','NUL','-w','%{http_code}','-X',$Method,'-H',"Cookie: $Cookie")
  if ($Csrf) {
    $arguments += @('-H',"x-csrf-token: $Csrf",'-H','content-type: application/json','--data-binary','@-')
    return [int]($Body | & curl.exe @arguments $Url)
  }
  [int](& curl.exe @arguments $Url)
}
function New-Session([string]$UserId, [string]$SessionId, [string]$Subject) {
  $session = New-Token; $csrf = New-Token
  Invoke-Sql "INSERT INTO user_sessions (id,token_hash,csrf_token_hash,user_id,provider_subject,expires_at,reauthenticated_at) VALUES ('$SessionId','$(Get-Hash $session)','$(Get-Hash $csrf)','$UserId','$Subject',now()+interval '1 hour',now());"
  $webSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $webSession.Cookies.Add((New-Object System.Net.Cookie('gk_session', $session, '/', 'localhost')))
  $webSession.Cookies.Add((New-Object System.Net.Cookie('gk_csrf', $csrf, '/', 'localhost')))
  @{ Session=$session; Csrf=$csrf; Cookie="gk_session=$session; gk_csrf=$csrf"; Headers=@{'x-csrf-token'=$csrf}; WebSession=$webSession }
}

$userIds = "'$authorId','$reviewerId','$adminAuthorId','$adminReviewerId','$visitorId'"
$cleanup = @"
DELETE FROM content_audit_events WHERE actor_user_id IN ($userIds);
DELETE FROM saved_records WHERE user_id IN ($userIds);
DELETE FROM record_revisions WHERE actor_user_id IN ($userIds) OR record_id IN (SELECT id FROM scientific_records WHERE owner_user_id IN ($userIds));
DELETE FROM content_relationships WHERE created_by_user_id IN ($userIds);
DELETE FROM record_evidence WHERE created_by_user_id IN ($userIds);
DELETE FROM record_locations WHERE owner_user_id IN ($userIds);
DELETE FROM record_media WHERE record_id IN (SELECT id FROM scientific_records WHERE owner_user_id IN ($userIds));
DELETE FROM scientific_records WHERE owner_user_id IN ($userIds);
DELETE FROM media_assets WHERE owner_user_id IN ($userIds);
DELETE FROM scientific_references WHERE created_by_user_id IN ($userIds);
DELETE FROM research_revisions WHERE actor_user_id IN ($userIds);
DELETE FROM research_media WHERE research_publication_id IN (SELECT id FROM research_publications WHERE owner_user_id IN ($userIds));
DELETE FROM research_contributors WHERE research_publication_id IN (SELECT id FROM research_publications WHERE owner_user_id IN ($userIds));
DELETE FROM research_publications WHERE owner_user_id IN ($userIds);
DELETE FROM news_revisions WHERE actor_user_id IN ($userIds);
DELETE FROM news_articles WHERE author_user_id IN ($userIds);
DELETE FROM managed_page_revisions WHERE actor_user_id IN ($userIds);
DELETE FROM managed_pages WHERE page_type='about';
DELETE FROM organization_profiles WHERE updated_by_user_id IN ($userIds);
DELETE FROM user_sessions WHERE user_id IN ($userIds);
DELETE FROM record_type_evidence_policies WHERE record_type_id='$recordTypeId';
DELETE FROM category_record_types WHERE category_id='$categoryId';
UPDATE template_versions SET status='deprecated' WHERE id='$templateVersionId' AND status='active';
DELETE FROM field_definition_translations WHERE field_definition_id='$fieldId';
DELETE FROM field_definitions WHERE id='$fieldId';
DELETE FROM template_versions WHERE id='$templateVersionId';
DELETE FROM record_templates WHERE id='$templateId';
DELETE FROM record_type_translations WHERE record_type_id='$recordTypeId';
DELETE FROM record_types WHERE id='$recordTypeId';
DELETE FROM category_translations WHERE category_id='$categoryId';
DELETE FROM categories WHERE id='$categoryId';
DELETE FROM users WHERE id IN ($userIds);
"@

try {
  Invoke-Sql $cleanup
  Invoke-Sql @"
INSERT INTO users (id,role,status,display_name) VALUES
('$authorId','teacher','active','Phase 4 author'),('$reviewerId','teacher','active','Phase 4 reviewer'),
('$adminAuthorId','admin','active','Phase 4 admin author'),('$adminReviewerId','admin','active','Phase 4 admin reviewer'),
('$visitorId','visitor','active','Phase 4 visitor');
INSERT INTO categories (id,stable_key,slug,records_allowed,status,position) VALUES ('$categoryId','phase4_proof','phase4-proof',true,'active',1);
INSERT INTO category_translations (category_id,locale,name,review_status) VALUES ('$categoryId','en','Phase 4 proof','reviewed');
INSERT INTO record_types (id,stable_key,status) VALUES ('$recordTypeId','phase4_occurrence','active');
INSERT INTO record_type_translations (record_type_id,locale,name,review_status) VALUES ('$recordTypeId','en','Phase 4 occurrence','reviewed');
INSERT INTO record_templates (id,record_type_id,stable_key,name,status) VALUES ('$templateId','$recordTypeId','phase4_template','Phase 4 template','active');
INSERT INTO template_versions (id,template_id,version,schema,status,created_by_user_id) VALUES ('$templateVersionId','$templateId',1,'{}','draft','$authorId');
INSERT INTO field_definitions (id,template_version_id,stable_key,data_type,required,validation,status) VALUES ('$fieldId','$templateVersionId','scientific_name','text',true,'{"minLength":3}','active');
INSERT INTO field_definition_translations (field_definition_id,locale,label,review_status) VALUES ('$fieldId','en','Scientific name','reviewed');
UPDATE template_versions SET status='active' WHERE id='$templateVersionId';
INSERT INTO category_record_types (category_id,record_type_id,active_template_version_id,status) VALUES ('$categoryId','$recordTypeId','$templateVersionId','active');
INSERT INTO record_type_evidence_policies (record_type_id,minimum_verified_references,required_evidence_kinds,independent_reviewer_required)
VALUES ('$recordTypeId',1,'["scientific_source"]',true);
INSERT INTO media_assets (id,storage_key,derivative_storage_key,original_filename,declared_content_type,detected_content_type,byte_size,sha256,media_kind,processing_status,rights_statement,licence,owner_user_id,scanner_result,processed_at)
VALUES ('$mediaId','quarantine/phase4-proof','processed/phase4-proof/display.webp','phase4-proof.png','image/png','image/png',68,repeat('a',64),'image','approved','Reusable Phase 4 publication fixture','Test fixture only','$authorId','clean',now());
"@

  $author = New-Session $authorId '00000000-0000-4000-8000-00000000f421' 'phase4-author'
  $reviewer = New-Session $reviewerId '00000000-0000-4000-8000-00000000f422' 'phase4-reviewer'
  $adminAuthor = New-Session $adminAuthorId '00000000-0000-4000-8000-00000000f423' 'phase4-admin-author'
  $adminReviewer = New-Session $adminReviewerId '00000000-0000-4000-8000-00000000f424' 'phase4-admin-reviewer'
  $visitor = New-Session $visitorId '00000000-0000-4000-8000-00000000f425' 'phase4-visitor'

  Assert-Equal (Get-Status 'GET' "$BaseUrl/api/v1/research" $visitor.Cookie) 403 'Visitor research-management access was not denied.'
  Assert-Equal (Get-Status 'POST' "$BaseUrl/api/v1/editorial/news" $author.Cookie) 403 'Teacher admin-editorial access was not denied.'
  $record = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/records" -Headers $author.Headers -WebSession $author.WebSession -ContentType 'application/json' -Body (@{categoryId=$categoryId;recordTypeId=$recordTypeId;attributes=@{scientific_name='Phaseus securus'}}|ConvertTo-Json -Depth 8)
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/media/records/$($record.id)/attachments" -Headers $author.Headers -WebSession $author.WebSession -ContentType 'application/json' -Body (@{mediaAssetId=$mediaId;purpose='gallery'}|ConvertTo-Json) | Out-Null
  Invoke-RestMethod -Method Put -Uri "$BaseUrl/api/v1/records/$($record.id)/translations/en" -Headers $author.Headers -WebSession $author.WebSession -ContentType 'application/json' -Body (@{title='Phase 4 proof record'}|ConvertTo-Json) | Out-Null
  Assert-Equal (Get-Status 'POST' "$BaseUrl/api/v1/records/$($record.id)/translations/en/review" $author.Cookie $author.Csrf) 400 'Self-review of a record translation was not denied.'
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/records/$($record.id)/translations/en/review" -Headers $reviewer.Headers -WebSession $reviewer.WebSession -ContentType 'application/json' -Body '{}' | Out-Null
  $reference = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/references" -Headers $author.Headers -WebSession $author.WebSession -ContentType 'application/json' -Body (@{sourceType='journal';authors=@(@{name='Proof Author'});title='Traceable Phase 4 source';identifier='doi:phase4-proof';rightsStatement='Citation only'}|ConvertTo-Json -Depth 8)
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/references/$($reference.id)/verify" -Headers $reviewer.Headers -WebSession $reviewer.WebSession -ContentType 'application/json' -Body '{}' | Out-Null
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/records/$($record.id)/evidence" -Headers $author.Headers -WebSession $author.WebSession -ContentType 'application/json' -Body (@{referenceId=$reference.id;evidenceKind='scientific_source';fieldKey='scientific_name'}|ConvertTo-Json) | Out-Null
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/records/$($record.id)/locations" -Headers $author.Headers -WebSession $author.WebSession -ContentType 'application/json' -Body (@{label='Protected proof locality';exactLatitude=36.19;exactLongitude=44.01;visibility='restricted';sensitivityReason='Temporary proof location';regionLabel='Kurdistan Region'}|ConvertTo-Json) | Out-Null
  $locations = Invoke-RestMethod -Uri "$BaseUrl/api/v1/records/$($record.id)/locations" -WebSession $reviewer.WebSession
  if (-not $locations.items[0].exact_geometry) { throw 'Authorized teacher did not receive exact protected geometry.' }
  Assert-Equal (Get-Status 'GET' "$BaseUrl/api/v1/records/$($record.id)/locations" $visitor.Cookie) 403 'Visitor exact-location access was not denied.'
  $publicLocationLeak = docker compose exec -T database psql -U geo_kurdistan -d geo_kurdistan -tAc "SELECT count(*) FROM public_record_locations WHERE record_id='$($record.id)' AND geometry IS NOT NULL;"
  Assert-Equal $publicLocationLeak.Trim() '0' 'Restricted exact geometry leaked into the public representation.'
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/records/$($record.id)/submit-review" -Headers $author.Headers -WebSession $author.WebSession -ContentType 'application/json' -Body '{}' | Out-Null
  Assert-Equal (Get-Status 'POST' "$BaseUrl/api/v1/records/$($record.id)/publish" $author.Cookie $author.Csrf) 400 'Author self-publication was not denied.'
  $publishedRecord = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/records/$($record.id)/publish" -Headers $reviewer.Headers -WebSession $reviewer.WebSession -ContentType 'application/json' -Body '{}'
  Assert-Equal $publishedRecord.status 'published' 'Reviewed record publication failed.'

  $research = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/research" -Headers $author.Headers -WebSession $author.WebSession -ContentType 'application/json' -Body (@{slug='phase4-proof-research';publicationYear=2026;rightsStatement='Read online only'}|ConvertTo-Json)
  Invoke-RestMethod -Method Put -Uri "$BaseUrl/api/v1/research/$($research.id)/translations/en" -Headers $author.Headers -WebSession $author.WebSession -ContentType 'application/json' -Body (@{title='Phase 4 proof research';abstract='Temporary proof'}|ConvertTo-Json) | Out-Null
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/research/$($research.id)/translations/en/review" -Headers $reviewer.Headers -WebSession $reviewer.WebSession -ContentType 'application/json' -Body '{}' | Out-Null
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/research/$($research.id)/contributors" -Headers $author.Headers -WebSession $author.WebSession -ContentType 'application/json' -Body (@{displayName='Proof Geologist';contributionRole='author'}|ConvertTo-Json) | Out-Null
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/research/$($research.id)/submit-review" -Headers $author.Headers -WebSession $author.WebSession -ContentType 'application/json' -Body '{}' | Out-Null
  $publishedResearch = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/research/$($research.id)/publish" -Headers $reviewer.Headers -WebSession $reviewer.WebSession -ContentType 'application/json' -Body '{}'
  Assert-Equal $publishedResearch.status 'published' 'Research publication failed.'
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/records/$($record.id)/relationships" -Headers $author.Headers -WebSession $author.WebSession -ContentType 'application/json' -Body (@{targetType='research';targetId=$research.id;relationshipType='supported_by'}|ConvertTo-Json) | Out-Null

  $news = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/editorial/news" -Headers $adminAuthor.Headers -WebSession $adminAuthor.WebSession -ContentType 'application/json' -Body (@{slug='phase4-proof-news';tags=@('proof');sourceLinks=@('https://example.org/source')}|ConvertTo-Json)
  Invoke-RestMethod -Method Put -Uri "$BaseUrl/api/v1/editorial/news/$($news.id)/translations/en" -Headers $adminAuthor.Headers -WebSession $adminAuthor.WebSession -ContentType 'application/json' -Body (@{headline='Phase 4 proof news';body='Temporary reviewed news.'}|ConvertTo-Json) | Out-Null
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/editorial/news/$($news.id)/translations/en/review" -Headers $adminReviewer.Headers -WebSession $adminReviewer.WebSession -ContentType 'application/json' -Body '{}' | Out-Null
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/editorial/news/$($news.id)/submit-review" -Headers $adminAuthor.Headers -WebSession $adminAuthor.WebSession -ContentType 'application/json' -Body '{}' | Out-Null
  $publishedNews = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/editorial/news/$($news.id)/publish" -Headers $adminReviewer.Headers -WebSession $adminReviewer.WebSession -ContentType 'application/json' -Body '{}'
  Assert-Equal $publishedNews.status 'published' 'News publication failed.'

  $page = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/editorial/pages" -Headers $adminAuthor.Headers -WebSession $adminAuthor.WebSession -ContentType 'application/json' -Body (@{pageType='about'}|ConvertTo-Json)
  Invoke-RestMethod -Method Put -Uri "$BaseUrl/api/v1/editorial/pages/$($page.id)/translations/en" -Headers $adminAuthor.Headers -WebSession $adminAuthor.WebSession -ContentType 'application/json' -Body (@{title='About the publisher';body='Temporary proof page.'}|ConvertTo-Json) | Out-Null
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/editorial/pages/$($page.id)/translations/en/review" -Headers $adminReviewer.Headers -WebSession $adminReviewer.WebSession -ContentType 'application/json' -Body '{}' | Out-Null
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/editorial/pages/$($page.id)/submit-review" -Headers $adminAuthor.Headers -WebSession $adminAuthor.WebSession -ContentType 'application/json' -Body '{}' | Out-Null
  $publishedPage = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/editorial/pages/$($page.id)/publish" -Headers $adminReviewer.Headers -WebSession $adminReviewer.WebSession -ContentType 'application/json' -Body '{}'
  Assert-Equal $publishedPage.status 'published' 'Managed page publication failed.'

  Write-Output 'PHASE4_POLICY_PROOF=passed'
  Write-Output 'PHASE4_RESTRICTED_GEOMETRY=passed'
  Write-Output 'PHASE4_INDEPENDENT_REVIEW=passed'
  Write-Output 'PHASE4_APPROVED_MEDIA_PUBLICATION=passed'
  Write-Output 'PHASE4_RESEARCH_EDITORIAL=passed'
  Write-Output 'PHASE4_MEDIA_STORAGE=run-phase4-media-storage-proof-separately'
}
finally { Invoke-Sql $cleanup }
