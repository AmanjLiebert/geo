# Phase 4 backend rehearsal — 2026-09-26 to 2026-09-27

## Result

Phase 4 is complete for its development gate. Its policy-controlled backend foundation and the full private-media pipeline pass together. A separate private primary-media bucket and bucket-restricted application key are configured; the recovery bucket remains separate. Phase 5 dashboard work is authorized, while public visitor delivery remains assigned to Phase 6.

## Implemented

- Structured scientific references and record/claim/field evidence links.
- Per-record-type minimum verified-reference and required-evidence-kind policies.
- Independent reference, translation, record, research, news, and managed-page review.
- Exact and public PostGIS geometry stored separately with `public`, `approximate`, `restricted`, and `embargoed` policies.
- A public-safe location view that cannot return exact restricted geometry.
- Geological map-layer provenance, licence, CRS, scale/resolution, version, and visibility metadata.
- Private-media metadata, generated quarantine keys, allowlisted types, declared size limits, magic-byte verification, rights metadata, short-lived signed upload operations, and short-lived inline derivative viewing.
- Private ClamAV scanning with no host port, fail-closed scanner outages, deterministic image derivatives, bounded PDF page rendering, and PostgreSQL-backed retryable processing jobs.
- Typed record-to-record and record-to-research relationships.
- Separate research publications, translations, contributors, documents/media, rights, revisions, review, publication, and archive lifecycle.
- Admin-only geological news, managed pages, and organization identity with translations, sources, revisions, review, and publication lifecycle.
- PostgreSQL publication triggers that deny incomplete or self-reviewed publication even if application code is bypassed.
- Idempotent, scientifically empty configuration seed with zero records, research publications, media, locations, and news.

## Verification

- Backend formatting, typecheck, lint, build, and 51 tests across 26 files pass.
- Production dependency audit reports zero vulnerabilities.
- A clean disposable PostgreSQL/PostGIS database applied all 11 migrations and returned `11|0|0|0|0|0`: eleven schema migrations with zero scientific records, research publications, media assets, record locations, and news articles.
- The protected live API rehearsal used disposable visitor, teacher-author, teacher-reviewer, admin-author, and admin-reviewer identities.
- Visitor access to scientific management was denied and teacher access to admin editorial management was denied.
- Translator self-review and author self-publication were denied.
- A separately reviewed record with a verified source and required evidence published successfully.
- Restricted exact geometry was available to an authorized teacher and absent from the public representation.
- Reviewed research, news, and an About page published through their independent workflows.
- A real short-lived signed upload to the separate private media bucket passed size, content-type, asset-metadata, and PNG magic-byte verification before entering quarantine.
- A clean PNG passed ClamAV, produced deterministic display and thumbnail WebP derivatives, and was served through 120-second signed inline/no-store viewer URLs without exposing storage keys.
- A one-page PDF passed ClamAV and produced one WebP page derivative through Poppler and Sharp.
- A magic-byte rejection deleted its quarantine object before recording rejection.
- A signed upload left unconfirmed beyond the one-hour grace period was deleted and archived by the worker startup sweep; the same sweep runs every fifteen minutes.
- The harmless EICAR antivirus fixture was rejected and its quarantined original was deleted.
- A forced scanner outage failed closed as `scanner_unavailable`; after scanner recovery, the durable job retried and converged to exactly one display and one thumbnail derivative set.
- Re-enqueuing an already approved asset completed as a no-op without incrementing processing attempts or duplicating derivatives.
- A reviewed record with an approved media attachment published successfully.
- The media proof removed all temporary originals, derivatives, rows, sessions, and users after completion.
- All temporary records, structure, users, sessions, evidence, locations, research, news, pages, revisions, and relationships were removed afterward.
- The production-style scientific collection returned to zero records.

Repeat the non-media proof with:

```powershell
pwsh -ExecutionPolicy Bypass -File .\ops\rehearsal\phase4-api-proof.ps1
```

Expected markers:

```text
PHASE4_POLICY_PROOF=passed
PHASE4_RESTRICTED_GEOMETRY=passed
PHASE4_INDEPENDENT_REVIEW=passed
PHASE4_APPROVED_MEDIA_PUBLICATION=passed
PHASE4_RESEARCH_EDITORIAL=passed
PHASE4_MEDIA_STORAGE=run-phase4-media-storage-proof-separately
```

With the separate private primary-media bucket configured, repeat the real storage proof with:

```powershell
pwsh -ExecutionPolicy Bypass -File .\ops\rehearsal\phase4-media-storage-proof.ps1
```

Expected markers:

```text
PHASE4_MEDIA_SIGNED_UPLOAD=passed
PHASE4_MEDIA_METADATA_VALIDATION=passed
PHASE4_MEDIA_MAGIC_BYTES=passed
PHASE4_MEDIA_QUEUE=passed
PHASE4_MEDIA_MALWARE_SCAN=passed
PHASE4_MEDIA_DERIVATIVES=passed
PHASE4_MEDIA_PDF_RENDER=passed
PHASE4_MEDIA_IDEMPOTENCY=passed
PHASE4_MEDIA_RETRY_RECOVERY=passed
PHASE4_MEDIA_PRIVATE_VIEWER=passed
PHASE4_MEDIA_REJECTED_OBJECT_CLEANUP=passed
PHASE4_MEDIA_EXPIRED_UPLOAD_CLEANUP=passed
PHASE4_MEDIA_CLEANUP=passed
```

## Gate result

The Phase 4 development gate passes and Phase 5 may begin. Continue to keep `gk-prod-recovery-amanj-2026` recovery-only and `gk-primary-media-amanj-2026` private. Phase 6 must connect public pages through backend publication, rights, locale, and visibility policy; it must not expose original object keys or permanent original-file URLs.
