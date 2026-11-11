# Phase 6 / Step 6F — Owner publication and published-record correction

## Objective

Correct the scientific-record workflow so a teacher or administrator may publish a record they authored, while preserving every substantive readiness, authorization, revision, and audit safeguard. Make the path for correcting a published record obvious and honest.

## Authorized scope

- Scientific records only. Do not change independent-review policy for research, news, or managed pages.
- Remove author/publisher separation from record readiness, record publication service logic, and PostgreSQL enforcement through a forward migration.
- Keep classification, active/published category, template validation, complete English details, verified evidence, public-safe location, approved primary image, rights, and alt-text requirements.
- Keep teacher/admin authorization, recent-authentication and CSRF controls, row locking, revisions, and audit events.
- Allow the record owner to see and use Publish while the record is in review.
- Replace the published-state **Unpublish** presentation with **Edit published record**. Confirm that public visibility is temporarily removed, then use the existing audited published-to-draft transition and reopen the editor.
- Keep visitors and unauthorized users denied.

## Completion gate

1. An author can submit and publish their own complete scientific record.
2. Missing readiness requirements still prevent publication.
3. PostgreSQL accepts same-author publication but continues enforcing all non-review record publication invariants.
4. A published record clearly offers **Edit published record** and becomes an editable draft only after confirmation and a successful server transition.
5. Failed transitions leave the record published and read-only.
6. Focused backend/frontend tests, type checks, lint, migration checks, and builds pass.

## Boundaries

- No hard deletion or history rewriting.
- No direct editing of a live published projection in this task; corrections use the explicit audited return-to-draft workflow.
- No changes to research, news, managed-page, category, authentication, or public API policy beyond what is required for scientific-record visibility after the existing transition.
- Do not access or modify secrets or environment files.
