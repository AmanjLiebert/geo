# Implementation report

Status: `IMPLEMENTED_AWAITING_REVIEW`

## Delivered

- Added one protected record-readiness contract with section-level issues for details, classification, evidence, location, media, and independent review.
- Enforced complete English details, valid template fields, a published active category branch, verified evidence, valid location policy, and exactly one approved rights-cleared primary image before review or publication.
- Added transactional submit-for-review, return-for-changes, independent publish, and non-destructive unpublish operations with permission, CSRF, recent-authentication, revision, and audit protections.
- Added a database publication trigger so records cannot bypass the core published-category, independent-review, English-translation, and primary-image invariants.
- Added a dashboard Review and publish section, reviewer-only source verification, honest read-only states, actionable checklist links, and publish/unpublish controls.

## Main files

- `backend/src/scientific-content/records.service.ts`
- `backend/src/scientific-content/records.controller.ts`
- `backend/src/publishing/scientific-trust.service.ts`
- `backend/src/database/migrations/1792305600000-record-publication-readiness.ts`
- `frontend/src/components/dashboard/record-editor/record-review-panel.tsx`
- `frontend/src/lib/record-publication-api.ts`

## Implementer checks

- Backend: 46 test files, 351 tests passed; lint, typecheck, format check, and production build passed.
- Frontend: 19 test files, 183 tests passed; lint, typecheck, and production build passed.
- Local containers rebuilt successfully; API, worker, frontend, database, proxy, and media scanner reported healthy.
- `git diff --check` passed.
