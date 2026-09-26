# Phase 3 scientific-content rehearsal — 2026-09-26

## Result

The configurable scientific-content foundation passed its local migration, authorization, API-lifecycle, template-safety, and cleanup rehearsal.

No permanent geological category, record type, template, or geological record was invented or seeded. The production-style seed remains structurally ready and scientifically empty until reviewed structure migrations are approved.

## Implemented foundation

- Hierarchical categories and translated labels with `recordsAllowed` behavior.
- Record types, translated labels, and explicit category/type allowances.
- Versioned record templates, stable field keys, translated field labels, validation rules, and immutable active/used versions.
- Classified and unclassified drafts with JSONB scientific attributes pinned to one template version.
- Kurdish/English/Arabic-capable record translations using validated BCP 47 locale identifiers rather than duplicate records.
- Immutable record revision snapshots and safe content audit events.
- Archive and restore-to-draft lifecycle; no publication endpoint exists in Phase 3.
- Private saved-record relation with a unique user/record pair and user-scoped reads.
- Non-mutating template migration previews.
- Scientific structure requests for cases the reviewed taxonomy cannot yet represent.

## Automated verification

- Backend format, typecheck, lint, build: passed.
- Backend tests: 40 passed across 18 test files.
- Migration SQL unit coverage includes the content foundation, active/used template immutability, and structure requests.
- Production dependency installation during image build reported zero known vulnerabilities.

## Live PostgreSQL and API evidence

- Six total forward migrations—including four for Phase 3—applied successfully through the normal migration container.
- The complete six-migration chain also passed from a blank disposable PostgreSQL database; it produced zero categories, records, and structure requests, and the database was dropped afterward.
- Empty initialization after cleanup: zero categories, record types, template versions, scientific records, saved records, and structure requests.
- Requests without a session receive `401`; a signed-in visitor receives `403` for teacher draft routes.
- A temporary teacher successfully loaded category → record type → generated template.
- Both unclassified and classified draft creation passed.
- Translation creation passed.
- Validation correctly failed when a required scientific field was missing and passed after correction.
- Three automatic revision snapshots existed before archive/restore actions.
- Archive and restore-to-draft passed.
- A version-2 field mapping preview inspected the pinned record, reported it valid, and returned `recordsChanged: false`.
- A missing-structure request was stored as `pending` without modifying canonical taxonomy.
- Mutation of a deprecated template field still pinned by a record was rejected by PostgreSQL.
- A visitor could save a temporary published fixture, while a different signed-in user could not see that visitor's saved list.
- All temporary sessions, users, structure, records, translations, revisions, requests, saved rows, and audit events were removed after the proof.

The repeatable proof is `ops/rehearsal/phase3-api-proof.ps1`.

## Deliberately unavailable

- Record publication and public projection.
- Evidence/reference policies.
- Geographic visibility and protected geometry.
- Private media/document delivery.
- Research, news, and managed-page workflows.

Those controls belong to Phase 4 and publication must remain unavailable until they pass together.
