# Phase 5 Step 5B2 — Record readiness, review, publication, and unpublication

## Objective

Complete the protected geological-record lifecycle without weakening the existing independent-review, evidence, location, media, or category-publication rules.

## Authorized scope

- Provide one backend readiness result for the dashboard, with actionable section-level issues.
- Require complete English details, valid template data, a published category branch, verified evidence, valid public-location policy, and an approved rights-cleared primary image before review submission.
- Let a teacher or admin submit a complete draft for independent review.
- Let a different teacher or admin publish an in-review record, approving its English translation as part of that explicit action.
- Let a reviewer return an in-review record to draft, preserving all work.
- Let a teacher or admin unpublish a published record back to draft, preserving all work and history.
- Add a concise Review and publish section to the existing record workspace. Do not redesign unrelated sections.
- Keep publication and unpublication high-risk, CSRF-protected, permission-checked, transactional, and audited.

## Out of scope

- Public Explore integration.
- Custom record-type/template editing.
- New roles or permission bundles.
- Hard deletion, automatic publication, or changes to unrelated editorial/research workflows.

## Completion gate

- Incomplete drafts remain saveable but cannot enter review.
- A complete draft can enter review.
- The author cannot publish their own record.
- A different authorized user can publish after all checks pass.
- Returning for changes and unpublishing restore an editable draft without erasing content, media, evidence, locations, relationships, revisions, or audit history.
- Signed-out and visitor requests are denied; unsafe requests require valid CSRF; high-risk actions require recent authentication.
- Focused backend/frontend tests, lint, typecheck, builds, and diff checks pass.
