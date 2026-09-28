param([string]$BaseUrl = 'http://localhost')

$ErrorActionPreference = 'Stop'
$userId = '00000000-0000-4000-8000-00000000f501'
$sessionId = '00000000-0000-4000-8000-00000000f502'
$mediaAssetIds = [System.Collections.Generic.List[string]]::new()
$workerPaused = $false
$scannerStopped = $false

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

function Get-SqlValue([string]$Sql) {
  $value = docker compose exec -T database psql -v ON_ERROR_STOP=1 -U geo_kurdistan -d geo_kurdistan -Atc $Sql
  if ($LASTEXITCODE -ne 0) { throw 'Could not verify the media database state.' }
  return ($value | Out-String).Trim()
}

function Remove-ProofObject([string]$Key) {
  if (-not $Key) { return }
  $deleteScript = "const {S3Client,DeleteObjectCommand}=require('@aws-sdk/client-s3');const c=new S3Client({endpoint:process.env.MEDIA_STORAGE_ENDPOINT,region:process.env.MEDIA_STORAGE_REGION,forcePathStyle:true,credentials:{accessKeyId:process.env.MEDIA_STORAGE_KEY_ID,secretAccessKey:process.env.MEDIA_STORAGE_APPLICATION_KEY}});c.send(new DeleteObjectCommand({Bucket:process.env.MEDIA_STORAGE_BUCKET,Key:process.env.PROOF_OBJECT_KEY})).catch(e=>{console.error(e.name+': '+e.message);process.exit(1)})"
  docker compose exec -T -e "PROOF_OBJECT_KEY=$Key" api node -e $deleteScript
  if ($LASTEXITCODE -ne 0) { throw "Failed to remove temporary media object: $Key" }
}

function Get-ProofObjectState([string]$Key) {
  $headScript = "const {S3Client,HeadObjectCommand}=require('@aws-sdk/client-s3');const c=new S3Client({endpoint:process.env.MEDIA_STORAGE_ENDPOINT,region:process.env.MEDIA_STORAGE_REGION,forcePathStyle:true,credentials:{accessKeyId:process.env.MEDIA_STORAGE_KEY_ID,secretAccessKey:process.env.MEDIA_STORAGE_APPLICATION_KEY}});c.send(new HeadObjectCommand({Bucket:process.env.MEDIA_STORAGE_BUCKET,Key:process.env.PROOF_OBJECT_KEY})).then(()=>process.stdout.write('exists')).catch(e=>{if(e.`$metadata?.httpStatusCode===404){process.stdout.write('missing')}else{console.error(e.name+': '+e.message);process.exit(1)}})"
  $state = (docker compose exec -T -e "PROOF_OBJECT_KEY=$Key" api node -e $headScript | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $state -notin @('exists','missing')) { throw "Could not inspect temporary media object: $Key" }
  return $state
}

function Wait-MediaStatus([string]$MediaAssetId, [string[]]$TerminalStates, [int]$TimeoutSeconds = 90) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $state = Get-SqlValue "SELECT processing_status FROM media_assets WHERE id='$MediaAssetId';"
    if ($TerminalStates -contains $state) { return $state }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)
  throw "Media $MediaAssetId remained in '$state' past the processing deadline."
}

function Wait-JobState([string]$JobId, [int]$TimeoutSeconds = 30) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $state = Get-SqlValue "SELECT state FROM pgboss.job WHERE id='$JobId';"
    if ($state -in @('completed','failed','cancelled','expired')) { return $state }
    Start-Sleep -Seconds 1
  } while ((Get-Date) -lt $deadline)
  throw "Job $JobId did not reach a terminal state."
}

function New-MinimalPdf {
  $encoding = [Text.Encoding]::ASCII
  $content = "%PDF-1.4`n"
  $objects = @(
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> /Contents 4 0 R >>',
    "<< /Length 0 >>`nstream`n`nendstream"
  )
  $offsets = [System.Collections.Generic.List[int]]::new()
  for ($index = 0; $index -lt $objects.Count; $index += 1) {
    $offsets.Add($encoding.GetByteCount($content))
    $content += "$($index + 1) 0 obj`n$($objects[$index])`nendobj`n"
  }
  $xrefOffset = $encoding.GetByteCount($content)
  $content += "xref`n0 5`n0000000000 65535 f `n"
  foreach ($offset in $offsets) { $content += "$($offset.ToString('D10')) 00000 n `n" }
  $content += "trailer`n<< /Size 5 /Root 1 0 R >>`nstartxref`n$xrefOffset`n%%EOF`n"
  return $encoding.GetBytes($content)
}

function Send-ProofUpload([string]$Filename, [string]$ContentType, [byte[]]$Bytes, [hashtable]$Headers, [Microsoft.PowerShell.Commands.WebRequestSession]$WebSession) {
  $body = @{
    filename = $Filename
    contentType = $ContentType
    byteSize = $Bytes.Length
    rightsStatement = 'Disposable Phase 4 storage proof.'
    licence = 'Test fixture only'
  } | ConvertTo-Json
  $upload = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/media/uploads" -Headers $Headers -WebSession $WebSession -ContentType 'application/json' -Body $body
  if (-not $upload.mediaAssetId -or -not $upload.uploadUrl -or $upload.expiresInSeconds -ne 300) {
    throw 'The API did not return the expected short-lived upload contract.'
  }
  if ($upload.PSObject.Properties.Name -contains 'storageKey') {
    throw 'The upload API exposed a separate internal storage-key field.'
  }
  $mediaAssetIds.Add([string]$upload.mediaAssetId)
  Invoke-WebRequest -UseBasicParsing -Method Put -Uri $upload.uploadUrl -ContentType $ContentType -Body $Bytes | Out-Null
  $confirmed = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/media/$($upload.mediaAssetId)/confirm" -Headers $Headers -WebSession $WebSession -ContentType 'application/json' -Body '{}'
  if ($confirmed.status -ne 'quarantined' -or -not $confirmed.processingRequired -or -not $confirmed.jobId) {
    throw 'The uploaded file did not enter quarantine with a processing job.'
  }
  return $upload
}

try {
  Invoke-Sql "DELETE FROM media_assets WHERE owner_user_id='$userId'; DELETE FROM user_sessions WHERE user_id='$userId'; DELETE FROM users WHERE id='$userId';"
  Invoke-Sql "INSERT INTO users (id,role,status,display_name) VALUES ('$userId','teacher','active','Phase 4 media proof');"

  $session = New-Token
  $csrf = New-Token
  Invoke-Sql "INSERT INTO user_sessions (id,token_hash,csrf_token_hash,user_id,provider_subject,expires_at,reauthenticated_at) VALUES ('$sessionId','$(Get-Hash $session)','$(Get-Hash $csrf)','$userId','phase4-media-proof',now()+interval '1 hour',now());"
  $headers = @{'x-csrf-token'=$csrf}
  $webSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $webSession.Cookies.Add((New-Object System.Net.Cookie('gk_session', $session, '/', 'localhost')))
  $webSession.Cookies.Add((New-Object System.Net.Cookie('gk_csrf', $csrf, '/', 'localhost')))

  $pngBytes = [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
  $cleanUpload = Send-ProofUpload 'phase4-clean.png' 'image/png' $pngBytes $headers $webSession
  $cleanId = [string]$cleanUpload.mediaAssetId
  $cleanStatus = Wait-MediaStatus $cleanId @('approved','failed','rejected')
  if ($cleanStatus -ne 'approved') {
    $reason = Get-SqlValue "SELECT coalesce(failure_code,'none') FROM media_assets WHERE id='$cleanId';"
    throw "Clean image processing ended as '$cleanStatus' ($reason)."
  }

  $cleanRow = Get-SqlValue "SELECT processing_status || '|' || detected_content_type || '|' || scanner_result || '|' || processing_attempts || '|' || length(sha256) FROM media_assets WHERE id='$cleanId';"
  $cleanParts = $cleanRow.Split('|')
  if ($cleanParts.Count -ne 5 -or $cleanParts[0] -ne 'approved' -or $cleanParts[1] -ne 'image/png' -or $cleanParts[2] -ne 'clean' -or [int]$cleanParts[3] -ne 1 -or [int]$cleanParts[4] -ne 64) {
    throw "Approved media metadata was unexpected: $cleanRow"
  }
  $derivativeCount = [int](Get-SqlValue "SELECT count(*) FROM media_derivatives WHERE media_asset_id='$cleanId' AND content_type='image/webp' AND derivative_kind IN ('display','thumbnail');")
  if ($derivativeCount -ne 2) { throw "Expected two image derivatives; found $derivativeCount." }

  $viewer = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/media/$cleanId/view" -Headers $headers -WebSession $webSession -ContentType 'application/json' -Body '{}'
  if ($viewer.expiresInSeconds -ne 120 -or $viewer.disposition -ne 'inline' -or @($viewer.items).Count -ne 2) {
    throw 'The approved-media viewer contract was unexpected.'
  }
  foreach ($item in @($viewer.items)) {
    if (-not $item.url -or $item.url -notmatch 'X-Amz-Signature=' -or $item.PSObject.Properties.Name -contains 'storageKey') {
      throw 'The viewer response did not contain only short-lived signed derivative URLs.'
    }
    $response = Invoke-WebRequest -UseBasicParsing -Uri $item.url -Method Get
    if ($response.StatusCode -ne 200 -or $response.Headers['Content-Type'] -notmatch '^image/webp') {
      throw 'A signed derivative URL did not return a WebP image.'
    }
  }

  $enqueueScript = "const PgBoss=require('pg-boss');(async()=>{const b=new PgBoss({connectionString:process.env.DATABASE_URL,schema:process.env.QUEUE_SCHEMA});await b.start();const id=await b.send('media.process',{mediaAssetId:process.env.PROOF_MEDIA_ID,requestedAt:new Date().toISOString()});process.stdout.write(id);await b.stop({graceful:true,timeout:10000,wait:true})})().catch(e=>{console.error(e);process.exit(1)})"
  $duplicateJobId = (docker compose exec -T -e "PROOF_MEDIA_ID=$cleanId" api node -e $enqueueScript | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $duplicateJobId) { throw 'Could not enqueue the duplicate media job.' }
  if ((Wait-JobState $duplicateJobId) -ne 'completed') { throw 'The duplicate media job did not complete safely.' }
  $afterDuplicate = Get-SqlValue "SELECT processing_attempts || '|' || (SELECT count(*) FROM media_derivatives WHERE media_asset_id='$cleanId') FROM media_assets WHERE id='$cleanId';"
  if ($afterDuplicate -ne '1|2') { throw "Duplicate processing changed approved output: $afterDuplicate" }

  $pdfBytes = New-MinimalPdf
  $pdfUpload = Send-ProofUpload 'phase4-one-page.pdf' 'application/pdf' $pdfBytes $headers $webSession
  $pdfId = [string]$pdfUpload.mediaAssetId
  $pdfStatus = Wait-MediaStatus $pdfId @('approved','failed','rejected')
  $pdfRow = Get-SqlValue "SELECT processing_status || '|' || coalesce(scanner_result,'') || '|' || (SELECT count(*) FROM media_derivatives WHERE media_asset_id='$pdfId' AND derivative_kind='page' AND content_type='image/webp') FROM media_assets WHERE id='$pdfId';"
  if ($pdfStatus -ne 'approved' -or $pdfRow -ne 'approved|clean|1') {
    throw "The one-page PDF did not produce one safe page derivative: $pdfRow"
  }

  docker compose stop clamav | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not stop ClamAV for the retry proof.' }
  $scannerStopped = $true
  $retryUpload = Send-ProofUpload 'phase4-retry.png' 'image/png' $pngBytes $headers $webSession
  $retryId = [string]$retryUpload.mediaAssetId
  if ((Wait-MediaStatus $retryId @('failed','rejected','approved') 30) -ne 'failed') {
    throw 'The scanner outage did not fail closed before retry.'
  }
  if ((Get-SqlValue "SELECT failure_code FROM media_assets WHERE id='$retryId';") -ne 'scanner_unavailable') {
    throw 'The scanner outage did not record a safe failure code.'
  }
  docker compose start clamav | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not restart ClamAV for the retry proof.' }
  $scannerDeadline = (Get-Date).AddSeconds(60)
  do {
    $scannerHealth = (docker inspect --format '{{.State.Health.Status}}' geo-kurdistan-clamav-1 2>$null | Out-String).Trim()
    if ($scannerHealth -eq 'healthy') { break }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $scannerDeadline)
  if ($scannerHealth -ne 'healthy') { throw "ClamAV did not recover: $scannerHealth" }
  $scannerStopped = $false
  if ((Wait-MediaStatus $retryId @('approved','rejected') 150) -ne 'approved') {
    throw 'The failed media job did not recover on retry.'
  }
  $retryRow = Get-SqlValue "SELECT processing_attempts || '|' || scanner_result || '|' || (SELECT count(*) FROM media_derivatives WHERE media_asset_id='$retryId') FROM media_assets WHERE id='$retryId';"
  $retryParts = $retryRow.Split('|')
  if ([int]$retryParts[0] -lt 2 -or $retryParts[1] -ne 'clean' -or $retryParts[2] -ne '2') {
    throw "Retry did not converge to one clean derivative set: $retryRow"
  }

  # EICAR is a harmless antivirus test string. Pause the worker, confirm a valid same-size PNG,
  # then replay the still-valid PUT URL with EICAR. This isolates the worker's fail-closed scan path.
  $eicar = 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
  $unsafeBytes = [Text.Encoding]::ASCII.GetBytes($eicar)
  if ($unsafeBytes.Length -ne $pngBytes.Length) { throw 'The same-size antivirus fixture invariant changed.' }
  docker compose pause worker | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not pause the worker for the deterministic scan proof.' }
  $workerPaused = $true
  $unsafeUpload = Send-ProofUpload 'phase4-eicar-test.png' 'image/png' $pngBytes $headers $webSession
  Invoke-WebRequest -UseBasicParsing -Method Put -Uri $unsafeUpload.uploadUrl -ContentType 'image/png' -Body $unsafeBytes | Out-Null
  docker compose unpause worker | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not resume the worker for the antivirus proof.' }
  $workerPaused = $false
  $unsafeId = [string]$unsafeUpload.mediaAssetId
  $unsafeStatus = Wait-MediaStatus $unsafeId @('approved','failed','rejected')
  $unsafeRow = Get-SqlValue "SELECT processing_status || '|' || coalesce(failure_code,'') || '|' || coalesce(scanner_result,'') FROM media_assets WHERE id='$unsafeId';"
  if ($unsafeStatus -ne 'rejected' -or $unsafeRow -ne 'rejected|malware_detected|rejected') {
    throw "The antivirus test object was not rejected as expected: $unsafeRow"
  }

  # Confirmation failures must delete their quarantine object immediately.
  $invalidBody = @{
    filename = 'phase4-invalid.png'
    contentType = 'image/png'
    byteSize = $unsafeBytes.Length
    rightsStatement = 'Disposable Phase 4 rejection cleanup proof.'
  } | ConvertTo-Json
  $invalidUpload = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/media/uploads" -Headers $headers -WebSession $webSession -ContentType 'application/json' -Body $invalidBody
  $invalidId = [string]$invalidUpload.mediaAssetId
  $mediaAssetIds.Add($invalidId)
  Invoke-WebRequest -UseBasicParsing -Method Put -Uri $invalidUpload.uploadUrl -ContentType 'image/png' -Body $unsafeBytes | Out-Null
  try {
    Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/media/$invalidId/confirm" -Headers $headers -WebSession $webSession -ContentType 'application/json' -Body '{}' | Out-Null
    throw 'Magic-byte rejection unexpectedly succeeded.'
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw }
  }
  $invalidRow = Get-SqlValue "SELECT processing_status || '|' || failure_code || '|' || storage_key FROM media_assets WHERE id='$invalidId';"
  $invalidParts = $invalidRow.Split('|')
  if ($invalidParts[0] -ne 'rejected' -or $invalidParts[1] -ne 'magic_byte_mismatch' -or (Get-ProofObjectState $invalidParts[2]) -ne 'missing') {
    throw "Rejected upload cleanup was incomplete: $invalidRow"
  }

  # A signed upload that is never confirmed is archived and removed after its grace period.
  $abandonedBody = @{
    filename = 'phase4-abandoned.png'
    contentType = 'image/png'
    byteSize = $pngBytes.Length
    rightsStatement = 'Disposable Phase 4 expiry cleanup proof.'
  } | ConvertTo-Json
  $abandonedUpload = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/media/uploads" -Headers $headers -WebSession $webSession -ContentType 'application/json' -Body $abandonedBody
  $abandonedId = [string]$abandonedUpload.mediaAssetId
  $mediaAssetIds.Add($abandonedId)
  Invoke-WebRequest -UseBasicParsing -Method Put -Uri $abandonedUpload.uploadUrl -ContentType 'image/png' -Body $pngBytes | Out-Null
  $abandonedKey = Get-SqlValue "SELECT storage_key FROM media_assets WHERE id='$abandonedId';"
  Invoke-Sql "UPDATE media_assets SET created_at=now()-interval '2 hours' WHERE id='$abandonedId';"
  docker compose restart worker | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not restart the worker for the expired-upload cleanup proof.' }
  if ((Wait-MediaStatus $abandonedId @('archived') 90) -ne 'archived') { throw 'The expired pending upload was not archived.' }
  if ((Get-SqlValue "SELECT failure_code FROM media_assets WHERE id='$abandonedId';") -ne 'upload_expired' -or (Get-ProofObjectState $abandonedKey) -ne 'missing') {
    throw 'The expired pending upload object was not removed safely.'
  }

  Write-Output 'PHASE4_MEDIA_SIGNED_UPLOAD=passed'
  Write-Output 'PHASE4_MEDIA_METADATA_VALIDATION=passed'
  Write-Output 'PHASE4_MEDIA_MAGIC_BYTES=passed'
  Write-Output 'PHASE4_MEDIA_QUEUE=passed'
  Write-Output 'PHASE4_MEDIA_MALWARE_SCAN=passed'
  Write-Output 'PHASE4_MEDIA_DERIVATIVES=passed'
  Write-Output 'PHASE4_MEDIA_PDF_RENDER=passed'
  Write-Output 'PHASE4_MEDIA_IDEMPOTENCY=passed'
  Write-Output 'PHASE4_MEDIA_RETRY_RECOVERY=passed'
  Write-Output 'PHASE4_MEDIA_PRIVATE_VIEWER=passed'
  Write-Output 'PHASE4_MEDIA_REJECTED_OBJECT_CLEANUP=passed'
  Write-Output 'PHASE4_MEDIA_EXPIRED_UPLOAD_CLEANUP=passed'
}
finally {
  if ($workerPaused) { docker compose unpause worker | Out-Null }
  if ($scannerStopped) { docker compose start clamav | Out-Null }
  foreach ($mediaId in $mediaAssetIds) {
    $keys = Get-SqlValue "SELECT storage_key FROM media_assets WHERE id='$mediaId' UNION ALL SELECT storage_key FROM media_derivatives WHERE media_asset_id='$mediaId';"
    foreach ($key in ($keys -split "`r?`n")) { Remove-ProofObject $key.Trim() }
  }
  Invoke-Sql "DELETE FROM media_assets WHERE owner_user_id='$userId'; DELETE FROM user_sessions WHERE user_id='$userId'; DELETE FROM users WHERE id='$userId';"
  if ($mediaAssetIds.Count -gt 0) {
    $quotedIds = ($mediaAssetIds | ForEach-Object { "'$_'" }) -join ','
    Invoke-Sql "DELETE FROM pgboss.job WHERE name='media.process' AND data->>'mediaAssetId' IN ($quotedIds);"
  }
  $leftovers = [int](Get-SqlValue "SELECT count(*) FROM media_assets WHERE owner_user_id='$userId';")
  if ($leftovers -ne 0) { throw 'Media proof cleanup left database rows behind.' }
  Write-Output 'PHASE4_MEDIA_CLEANUP=passed'
}
