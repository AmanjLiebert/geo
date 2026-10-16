# Implementation Report — Phase 5 Step 4

## Status

`IMPLEMENTED_AWAITING_REVIEW`

## Branch and commit

- Branch: `feature/phase5-step4-record-entry`
- Commit: `42296499e8dfcd7c80f98c30c4322a89e46d6189`

## Changed files

### Backend

- `backend/src/scientific-content/records.service.ts`:
  - Added parent category active check `(p.id IS NULL OR p.status = 'active')` to `resolveClassification` query to ensure categories under archived parents fail closed.
  - Added check in `update` verifying category and parent category remain active before allowing updates to existing drafts.
- `backend/src/scientific-content/scientific-structure.service.ts`:
  - Added active parent verification to `listCategories` when `includeArchived = false`.
  - Joined parent category in `listRecordTypes` and `getActiveTemplate` queries to fail closed if parent branch is archived.

### Frontend

- `frontend/src/components/dashboard/record-editor/record-structure-selector.tsx`:
  - Fixed category attachment radio rendering so attachment choices only show when `activeRootNode.allowsDirectRecords` is true.
  - Corrected checked state calculation for subcategory selection.
- `frontend/src/components/dashboard/record-editor/record-template-form.tsx`:
  - Added helpful non-disclosing notice for record types with empty attribute definitions (General geological records), clarifying that common sections (details, sources, protected locations, relationships, media) provide the primary structure.
- `frontend/src/components/dashboard/record-editor/record-editor.tsx`:
  - Added archived category detection to display an accessible non-disclosing warning and prevent submission if the draft's category is archived.
- `frontend/vitest.config.ts`:
  - Added `@/` path alias mapping to `./src` for Vitest tests.

### Tests and documentation

- `AGENTS.md`: Handoff workflow documentation.
- `backend/src/scientific-content/category-archive.spec.ts`: Resolved unused parameter in query mock.
- `backend/src/scientific-content/records.service.spec.ts`: Added unit tests for General geological draft creation and reopening, rejection of records under archived categories, and rejection of updates to records under archived categories.
- `backend/src/scientific-content/records-http.spec.ts`: Added HTTP integration tests for teacher/admin draft creation, draft reopening, visitor/unauthenticated 403/401 denial, and UUID parameter validation.
- `frontend/src/components/dashboard/record-editor/record-editor-utils.test.ts`: Added unit tests covering General record template empty-state notice and structure selector branch options.

## Behavior delivered

- Enabled teachers and admins to select any active managed category or subcategory and create a General geological draft with valid empty attributes.
- Ensured newly saved drafts can be reopened via the edit interface with preserved classification (`categoryId`, `recordTypeId`, `templateVersionId`).
- Ensured existing specialist record types and versioned templates continue to work unaltered.
- Enforced fail-closed behavior on archived category subtrees at the API boundary: creation and modification of records under archived categories or parents are rejected with safe 4xx responses.
- Enforced strict authorization: unauthenticated callers receive 401 Unauthorized, and unauthorized users (e.g. `visitor`) receive 403 Forbidden on record creation and modification endpoints.

## Verification performed

| Command or manual check | Result | Notes |
| --- | --- | --- |
| `npm run test` (backend) | Passed (40 test files, 237 tests passed) | Includes new unit and HTTP integration tests in `records.service.spec.ts` and `records-http.spec.ts`. |
| `npm run test` (frontend) | Passed (12 test files, 136 tests passed) | Includes new unit tests in `record-editor-utils.test.ts`. |
| `npm run lint` (backend) | Passed (0 errors, 0 warnings) | ESLint check across all backend TypeScript sources. |
| `npm run lint` (frontend) | Passed (0 errors, 0 warnings) | ESLint check across all frontend sources. |
| `npm run build` (backend) | Passed | `nest build` completed successfully. |
| `npm run build` (frontend) | Passed | `next build` (Next.js 16 Turbopack) completed successfully, generating 129 static routes. |
| `git diff --check` | Passed | No whitespace errors or conflicts detected. |
| Local browser smoke test | Not run | Headless development environment without running graphical display. Verified via unit and HTTP integration suites. |

## Schema and migration impact

- **No new database schema migrations added.**
- Existing relational tables (`categories`, `category_record_types`, `record_types`, `template_versions`, `scientific_records`, and audit/revision triggers) fully accommodate the dynamic assignment of managed categories to the General geological record type and drafts with empty JSONB attributes.

## Security and data-preservation notes

- Input validation: `categoryId` and `recordTypeId` are validated via DTOs and verified against active categories in PostgreSQL.
- Fail closed: Any category with an archived status or an archived parent is rejected from record creation and updates.
- Authorization: Enforced at the NestJS `AccessGuard` boundary, requiring `scientific-records:write` permission (granted to `teacher` and `admin` roles, denied to `visitor` and unauthenticated requests).
- Safe copy: Error messages and UI notices are concise, accessible, and do not expose stack traces, database details, or privileged internal identifiers.

## Known limitations or unverified behavior

- Public exploration integration (Explore catalog browsing of newly published items under managed categories) is deferred to subsequent steps as specified in `PLAN.md`.
- Live browser smoke testing was not performed directly in a graphical browser due to the headless CLI environment; HTTP controller integration tests and React component unit tests were used as substitutes.

## Reviewer focus

- Verify that `records.service.ts` joins against parent categories to ensure that if a parent category is archived, child subcategories cannot be used for new record creation or draft updates.
- Verify `record-structure-selector.tsx` attachment choices when switching between categories that allow direct record attachment vs subcategory-only categories.
