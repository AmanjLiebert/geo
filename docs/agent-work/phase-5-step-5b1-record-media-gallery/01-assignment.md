# Assignment — Phase 5 Step 5B1: Record Media Gallery

## Status

`READY_FOR_IMPLEMENTATION`

## Objective

Extend the existing private record-media system into a safe gallery where one scientific record can contain multiple images, supported videos, and PDFs. Each attachment has its own presentation metadata and display order, and at most one approved image can be selected as the primary image used by the later record-publication gate.

This task establishes media behavior only. Record readiness, independent review, publication, unpublication, and public Explore delivery belong to later tasks.

## Starting point and branch

- The assignment starts from accepted Step 5A fixes at commit `ed307ec`.
- Work only on `feature/phase5-step5b1-record-media-gallery`; do not create or switch branches.
- Do not merge, push, deploy, or rebuild the user's running Docker services.
- Report the final local commit for independent Codex review.

## Read before changing code

1. `AGENTS.md`
2. `PLAN.md` — active delivery sequence and media/publication rules
3. `MAP.md` — record/media ownership and publication boundaries
4. `DESIGN.md`
5. `MEMORY.md`
6. This assignment in full

## Existing behavior to reuse

- `media_assets`, `media_derivatives`, and `record_media` already own private uploads, rights metadata, processing state, record attachment, and display position.
- The upload flow already uses private object storage, signed upload, metadata checks, magic-byte checks, ClamAV processing, safe derivatives, short-lived inline viewing, and audit events.
- `assertRecordEditable` already protects record mutations and archived category branches.
- Images and PDFs already work. Preserve them and migrate existing `record_media` rows safely.
- Do not introduce a second storage bucket, attachment table, upload workflow, or weaker approval path.

## Authorized scope

### Schema and migration

- Add a reviewed migration extending `record_media` with attachment-owned presentation metadata:
  - optional `caption`, maximum 160 characters;
  - optional `description`, maximum 2,000 characters;
  - optional image `alt_text`, maximum 500 characters;
  - existing `position` remains the display order;
  - `is_primary` marks the record's primary image.
- Enforce at most one primary attachment per record with a database constraint or partial unique index.
- Only image assets may become primary; enforce this transactionally in NestJS because media kind is owned by `media_assets`.
- Migration up/down tests must demonstrate existing rows and relationships are preserved.

### Backend attachment operations

- Extend the protected record-attachment API so teachers and admins can:
  - list all attachments in deterministic display order;
  - attach newly uploaded media with its own metadata;
  - update caption, description, alt text, purpose, and position;
  - select or replace the primary image atomically;
  - reorder attachments with strict bounded integer validation;
  - detach an attachment from an editable draft with confirmation semantics, without deleting the underlying media asset or audit history.
- Every mutation must require authentication, the existing scientific-content permission, CSRF protection, ownership/object access, and an editable record under an active category branch.
- Deny signed-out users and visitors. Reject mutations for in-review, published, or archived records and records under archived category branches.
- Validate all UUIDs, request shapes, text limits, positions, MIME types, file sizes, and state transitions at the API boundary.
- Return minimal projections with no storage keys, internal bucket details, permanent URLs, SQL, or unnecessary user identifiers.
- Write concise audit events for metadata changes, primary-image changes, reordering, and detach operations.

### Supported video processing

- Add MP4 and WebM only through the existing private upload and processing pipeline.
- Use a conservative configurable size limit with a safe upper bound.
- Require declared MIME validation plus trusted container/magic-byte detection, malware scanning, and successful processing before approval or viewing.
- Serve approved videos only through authorized, short-lived inline viewing. Keep storage private, omit download controls, and use inline content disposition.
- Never claim that browser-viewable media is impossible to copy.
- Do not approve, expose, or attach an unvalidated video merely to satisfy the UI. If secure processing needs unavailable tooling such as FFmpeg, implement only the safely supported foundation and report the exact blocker rather than bypassing controls.

### Dashboard

- Extend the existing record-editor media section without redesigning the dashboard.
- Repeated uploads must produce a visible multi-attachment gallery.
- Show each attachment's filename, media type, processing state, caption, description, alt text where applicable, purpose, rights summary, and primary state.
- Provide accessible controls to edit metadata, choose one primary image, reorder, detach with confirmation, refresh processing state, and view approved media inline.
- Preserve entered metadata on request failure and display production-safe errors.
- Keep controls keyboard accessible, mobile usable, and consistent with `DESIGN.md`.

## Publication handoff contract

- This task may expose a reusable query/helper that determines whether a record has an approved, rights-cleared primary image with useful alt text.
- Do not add Submit for review, Approve, Publish, Unpublish, or public visitor actions. Step 5B2 will consume the media contract after this task is accepted.
- Drafts may retain incomplete, processing, rejected, or non-primary attachments; those states must remain honest and will block later publication where applicable.

## Required focused tests

- Multiple attachments coexist on one record and retain independent metadata.
- Existing image/PDF attachment behavior and rows survive the migration.
- Only one primary attachment exists per record, and non-images cannot be primary.
- Replacement of the primary image is atomic under row locking/concurrency.
- Invalid metadata, malformed UUIDs, unsupported MIME types, oversized files, and unsafe positions are rejected.
- Video never reaches approved/viewable state without the established validation and scanning path.
- Signed-out requests return `401`; visitors return `403`; teacher/admin draft operations succeed.
- In-review, published, archived, cross-owner, and archived-category mutations are rejected.
- Detach preserves the media asset and writes an audit event.
- List/API projections omit storage keys and other internal data.
- Frontend validators reject malformed attachment responses and gallery controls preserve failure state.

## Explicit exclusions

- No record review, publication, unpublication, public API, or Explore conversion.
- No category, record-type, template, translation-language, evidence, relationship, or location redesign.
- No hard deletion of records, media assets, derivatives, revisions, or audit history.
- No public bucket, permanent signed URL, raw original-file delivery, fake processing result, or weakened ownership rule.
- No production-facing phase narration, infrastructure text, mock claims, or unavailable controls.
- No secrets, environment-file reads, deployment, merge, or remote push.

## Acceptance gate

1. One draft record safely holds multiple independent attachments.
2. Every attachment retains its own validated metadata and deterministic order.
3. Exactly zero or one primary image exists; selecting another replaces it atomically.
4. Images, PDFs, and safely supported videos use the existing private validation/processing boundary.
5. Unauthorized, cross-owner, non-editable-record, and archived-category mutations fail closed.
6. Existing media data remains intact and API responses expose no storage details.
7. The dashboard gallery is accessible, mobile usable, honest about processing state, and preserves failed input.
8. No Step 5B2 or public Explore behavior is introduced.

## Efficient verification before handoff

- Run focused migration, media-service, HTTP authorization, worker, API-validator, and gallery tests first.
- Run affected backend/frontend type checks and lint after focused tests are stable.
- Run each affected production build once, plus formatting and `git diff --check`.
- Do not run unrelated full suites repeatedly during correction loops.
- Report live browser testing as not run if no authenticated browser is already available; do not rebuild Docker solely for a smoke test.

## Implementation handoff

Write only `02-implementation-report.md`. Do not edit `01-assignment.md`, `03-verification.md`, `MEMORY.md`, `PLAN.md`, or `MAP.md`.

Set the report status to `IMPLEMENTED_AWAITING_REVIEW`, not `COMPLETE`. Include the branch and commit, migration behavior, exact media state transitions, changed APIs and projections, authorization/ownership evidence, video-processing result or blocker, exact verification commands/results, browser-smoke status, known limitations, and focused reviewer concerns.
