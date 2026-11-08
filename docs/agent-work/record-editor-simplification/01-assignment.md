# Teacher record editor simplification

Status: `READY_FOR_IMPLEMENTATION`

Risk: CRITICAL (restricted geography presentation, scientific evidence, private media, and publication readiness)

## Required reading

Read only these product-document sections before implementation:

- `DESIGN.md`: **Dashboard information architecture**, **Evidence and scientific trust**, and **Dashboard collection and editor ergonomics**.
- `MAP.md`: **Record creation map**, **Evidence and publication map**, and **Geographic privacy map**.
- The current record-editor source, public record adapter, affected API validators, and focused tests named by the implementation.

Use the cognitive principles supplied by the user: keep visible choices within a small chunk, favor recognition over recall, reveal advanced choices only when relevant, make the next action visible, and show immediate state/feedback.

## Problem and evidence

- The workspace presents seven equal navigation destinations even though location, relationships, and additional files are optional. Teachers cannot distinguish publication requirements from enrichment.
- The location form opens automatically when empty and can expose label, region, two exact-coordinate inputs, visibility, a second public-coordinate pair, numeric precision, sensitivity reason, and embargo date in one flow.
- The source flow gives equal prominence to new/saved-source modes, detailed citation administration, claim/field targeting, and verification although the common task is to connect one source to the whole record.
- The scientific form exposes the technical URL slug and all optional template fields beside required scientific facts.
- The media section mixes the required main-image task with optional documents, videos, ordering, and metadata maintenance.
- The public adapter already receives public-safe location geometry and verified structured references, but it reduces locations to a label/region and omits useful citation context. It must never substitute exact protected geometry.
- Related-item authoring and additional-file authoring are visible even though the current public record experience does not present those capabilities. They should not compete with launch-critical work.

## Authorized scope

### One four-stage teacher workflow

Replace the seven equal workspace destinations with four recognizable stages:

1. **Record** — English title/summary/description and template-generated scientific facts.
2. **Evidence** — the required verified source and required main image.
3. **Optional** — location, related items, and additional files, collapsed until requested or already populated.
4. **Review** — one readiness checklist with direct repair actions.

Each stage shows a concise state such as `Complete`, `2 required items missing`, `Optional · not added`, or an existing item count. Do not present optional work as incomplete. Preserve the record as one workspace and preserve readable summaries in non-editable states.

### Record and scientific facts

- Keep the existing clean title, summary, and description fields.
- Keep required template fields visible and first.
- Put optional template fields behind one clearly labelled disclosure, while retaining their saved values and field-level validation.
- Generate and retain the slug automatically. Move manual slug editing under an advanced disclosure; do not ask ordinary teachers to create a URL identifier.
- Preserve classification display, template selection, validation, revisions, save/error states, and change-classification rules.

### Sources

- Make the common path one compact **Add source** form: source type, title, author or organization, and a link or identifier.
- Default the evidence target to the whole record without showing a separate target panel.
- Move publication, year, pages/figure, rights, field-specific targeting, and supporting notes under **More citation details**.
- Keep **Use a saved source** as a secondary action, not an equal first decision.
- Preserve structured references, verification permissions/status, record-type evidence policies, and all existing saved evidence.
- Do not fabricate automatic DOI/ISBN metadata lookup or add an external service.

### Main image and optional files

- In Evidence, present one obvious **Add main image** task using the existing protected upload, scanning, approval, description/alternative-text, rights, and primary-image rules.
- Use the existing plain-language description for initial caption/purpose/alternative text as already intended by `DESIGN.md`.
- Put additional images, documents, videos, ordering, credit, and licence corrections under Optional/advanced management.
- Clearly state when an additional attachment is private or not presented on the current public record page. Do not imply it is publicly visible.
- Preserve existing attachments and all private-media authorization and short-lived preview behavior.

### Optional location

- Do not open a location form until the teacher chooses **Add location**.
- Start with a short explanation that location is optional unless the readiness response explicitly says otherwise.
- Present visibility as recognizable choices in plain language: **Show exact point**, **Show general area**, and **Keep private**. Keep embargo under advanced options.
- Reuse exact coordinates for a public exact point; never ask for the same point twice.
- Ask for a separate public point and simple precision only for a general-area choice.
- Show sensitivity reason only for a private/generalized/embargoed choice. Offer concise common reasons plus an `Other` explanation while still submitting a truthful reason required by the existing policy.
- Keep manual latitude/longitude available, but visually group the pair as one location decision rather than two unrelated questions.
- Do not change the location schema, exact/public geometry separation, permission checks, audit policy, or public-safe database view.

### Optional relationships

- Remove Related Items from primary navigation.
- When there are no relationships, keep authoring behind Optional and do not load candidate records/research until the teacher opens it.
- When relationships already exist, show their count and readable summary without losing the ability to manage them.
- Do not delete or rewrite existing relationships.
- State honestly that related items are not yet presented on the current public record page; do not add a public related-items contract in this task.

### Public record parity for retained core information

- Present every verified reference already returned by the public record API as a concise citation with progressively disclosed source type, authorship, year, publication, identifier, pages/figure, URL, evidence kind, and rights when present.
- Present public-safe location label, region, visibility meaning, approved public coordinates, and precision when returned.
- Use only the public API `geometry` derived from `public_record_locations`. Never read, infer, serialize, log, cache, or render exact protected geometry for restricted, embargoed, region-only, or hidden locations.
- A map dependency or external tile service is not authorized. Use a readable location block and coordinate presentation now; a map can be a later task.
- Preserve intentional empty states when no public location or verified source exists.

### Review

- Make the checklist explain the actual four core requirements: complete record details, required scientific facts, required verified evidence, and approved main image.
- Location, relationships, and additional files must show as optional unless the authoritative readiness response reports a concrete issue for an existing value.
- Keep direct repair actions and use the same plain-language labels as the destination.
- Preserve submit-for-review, publish, return-for-changes, edit-published-record, permission, recent-identity, revision, and audit behavior.

## Non-goals

- No database schema, migration, seed, category, template, record-type policy, permission, authentication, audit, revision, lifecycle, or production-data change.
- No deletion or lossy rewriting of existing locations, references, evidence links, relationships, media, translations, or attributes.
- No new map, citation-lookup, geocoding, AI, storage, or external service and no new dependency.
- No public related-items API and no public multi-file gallery in this task.
- No redesign of the Records collection page, dashboard sidebar, category management, research editor, or public Explore collection navigation.
- Do not modify the completed authentication task records or the preserved category-image commit.
- No deployment, push, merge, shared-database action, or destructive command.

## Permissions and security invariants

- Existing frontend visibility is not an authorization boundary; all protected operations continue through their current backend permission and object-authorization checks.
- Private media URLs remain authorized, short-lived, non-cacheable, and storage keys remain undisclosed.
- Exact and public geography remain separate. Public rendering consumes only the established public projection.
- Evidence verification remains permission-controlled, and unverified references remain excluded from public presentation.
- Publication continues to use authoritative backend validation/readiness; the UI must not invent readiness.

## Recovery

- Reverting the implementation commit restores the current seven-section editor and public adapter.
- No migration or stored-data transformation is authorized, so rollback requires no data recovery.
- Existing optional content must remain intact while hidden/collapsed and reappear after rollback.

## Verification plan

Focused frontend checks must cover:

- four-stage navigation, small visible choice set, completion summaries, keyboard/touch operation, and direct repair navigation;
- required versus optional scientific fields, advanced slug editing, value preservation, and validation/error focus;
- minimal new-source path, saved-source secondary path, default whole-record targeting, advanced citation fields, and verification permissions;
- main-image-first upload, existing-media correction, optional additional-file disclosure, processing/error states, and private-preview safety;
- location closed by default, exact/general/private/embargo conditional fields, public-point reuse, validation, read-only summaries, and no protected-coordinate leakage;
- relationships do not fetch candidates before Optional is opened and existing relationships remain manageable;
- public citation presentation and public-safe location presentation, including a test whose exact and public coordinates differ and which proves only public coordinates render;
- empty, loading, network/server error, unauthorized, forbidden, read-only, draft, in-review, published, archived, narrow-width, RTL, keyboard, 44-pixel target, and reduced-motion states in proportion to affected components.

Broader checks:

- all affected frontend Vitest suites, followed by the full frontend suite;
- frontend type-check and lint;
- production build because the editor workspace and public-record adapter are shared route behavior;
- `git diff --check`;
- live desktop and narrow-width smoke through create/edit/read-only/review and the public record page using non-sensitive test fixtures only;
- Docker rebuild/restart of the frontend only if the local stack is already running.

No backend suite is required if backend source/contracts remain unchanged. Any necessary backend change is out of scope: stop, record the blocker, and request a separately reviewed scope expansion.

## Acceptance gate

The task passes only when a teacher can understand the editor as four stages, complete the required record/source/main-image path without encountering optional administration, add location information through conditional plain-language choices, reach every existing optional value without data loss, and see retained core public information presented accurately without any protected-coordinate or private-media disclosure.

Implementation stops at `IMPLEMENTED_AWAITING_REVIEW`. OpenCode records exact commits and truthful checks in `02-implementation-report.md`; Codex alone reviews the actual diff, reruns independent checks, and records the decision in `03-verification.md`.

## User-authorized evidence-policy amendment — 2026-11-08

The user explicitly removed reference verification from the product workflow. A source created or attached by an authorized teacher or admin must immediately satisfy the record evidence policy and may appear with a published record. There is no second-person source approval, verification queue, verification status, or verification action in the teacher interface.

Teachers and admins may edit saved source metadata. Updates remain validated, permission-protected, and audited for every record that reuses the source. Existing references and evidence links are preserved. Location privacy, media approval, record lifecycle, CSRF, role authorization, revision, and audit controls are unchanged.

This amendment requires a forward migration that replaces the database publication trigger without rewriting existing reference rows. Rollback restores the former verified-reference trigger. No shared database migration, deployment, merge, or push is authorized by this assignment.
