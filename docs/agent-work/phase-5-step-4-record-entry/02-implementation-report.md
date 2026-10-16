# Implementation Report — Phase 5 Step 4

## Status

`IMPLEMENTED_AWAITING_REVIEW`

## Branch and commit

- Branch: `feature/phase5-step4-record-entry`
- Commit: `f41e5a1066e1fc8175107830a9998baba67280fe`

## Changed files

### Backend

- `backend/src/scientific-content/record-invariants.ts`:
  - Added reusable helper `assertCategoryBranchActive` and `assertRecordEditable` (with optional `FOR UPDATE` lock) to enforce both record lifecycle status (`draft`/`in_review`, not `archived` or `published`) and category active branch status (`c.status = 'active' AND (p.id IS NULL OR p.status = 'active')`).
  - Eliminates duplicated SQL across `scientific-content`, `publishing`, and `media` services.
- `backend/src/scientific-content/records.service.ts`:
  - Updated `assertEditable` to invoke `assertCategoryBranchActive`.
  - Enforced active category branch invariant across translation mutations (`upsertTranslation`, `reviewTranslation`) and submission (`submitForReview`).
  - Separated `assertEditableLifecycle` for `update` so reclassification of already-classified drafts returns 400 Bad Request, while drafts preserving category enforce active branch (returning 409 Conflict if category or parent is archived).
- `backend/src/publishing/scientific-trust.service.ts`:
  - Updated `assertRecordEditable` to delegate directly to `assertRecordEditableInvariant(executor, id, { lock: true })`, ensuring evidence, location, and relationship mutations fail closed if the record's category or parent category is archived.
- `backend/src/media/media.service.ts`:
  - Updated `attachToRecord` to call `assertRecordEditable(manager, recordId, { lock: true })`, preventing media attachments to records under archived categories or parents.

### Frontend

- `frontend/src/components/dashboard/record-editor/record-editor-utils.ts`:
  - Added `isRecordCategoryArchived(recordCategoryId, activeCategories)` function to reliably detect archived category state, fixing the empty categories response edge case where `categories.length > 0` previously prevented detection.
  - Added `isRecordEditorReadOnly(recordStatus, isCategoryArchived)`.
- `frontend/src/components/dashboard/record-editor/record-editor.tsx`:
  - Early detection in `loadData` when a record belongs to an archived category, stopping unnecessary template fetches.
  - When `isReadOnly` is active (due to archived category branch or non-editable record status), hides all mutation sections (`RecordStructureSelector`, `RecordTemplateForm`, `RecordEnglishDetails`, `RecordEvidence`, `RecordLocations`, `RecordRelationships`, `RecordMedia`).
  - Renders a clean, accessible, non-disclosing notice with a "Return to records list" action button.

### Tests

- `backend/src/scientific-content/record-invariants.spec.ts`: Added unit tests for invariant checks (unclassified pass-through, active branch pass-through, missing record 404, archived record 409, published record 409, archived category 409, archived parent 409, and category restoration).
- `backend/src/scientific-content/records.service.spec.ts`: Added unit tests for translation upsert rejection when category or parent is archived, and restoration.
- `backend/src/publishing/scientific-trust.service.spec.ts`: Added unit tests for evidence addition rejection when category or parent is archived, and restoration.
- `backend/src/media/media-attachments.service.spec.ts`: Added unit tests for media attachment rejection when category or parent is archived, and restoration.
- `backend/src/scientific-content/records-http.spec.ts`: Added HTTP integration tests verifying 409 Conflict across all 6 mutation endpoints under archived categories (`PATCH /records/:id`, `PUT /records/:id/translations/en`, `POST /records/:id/evidence`, `POST /records/:id/locations`, `POST /records/:id/relationships`, `POST /media/records/:recordId/attachments`).
- `frontend/src/components/dashboard/record-editor/record-editor-utils.test.ts`: Added unit tests for `isRecordCategoryArchived` (including empty categories list edge case) and `isRecordEditorReadOnly`.

## Behavior delivered

- Enforced the active category-tree invariant across all record mutations reachable from the editor: attribute updates, English translation/details, evidence, protected locations, relationships, and media attachments.
- Centralized verification in `assertRecordEditable` / `assertCategoryBranchActive` within `record-invariants.ts`, avoiding code and SQL duplication across `scientific-content`, `publishing`, and `media` services while preserving transaction row locks (`FOR UPDATE`).
- Rendered the frontend record editor as strictly read-only when the category or parent is archived, removing active mutation controls (`RecordStructureSelector`, `RecordTemplateForm`, `RecordEnglishDetails`, `RecordEvidence`, `RecordLocations`, `RecordRelationships`, `RecordMedia`) and providing clear navigation back to the records list.
- Fixed the empty categories response edge case in the frontend record editor where `categories.length > 0` previously prevented archived-category detection.
- Ensured restoring an archived category or parent immediately restores editability across all record sections.
- Preserved existing data and structure, with zero changes to Phase 5 Step 5.

## Verification performed

| Command or check | Result | Notes |
| --- | --- | --- |
| `npm test` (backend) | Passed (41 test files, 252 tests passed) | `npm test` runs full Vitest suite in backend. |
| `backend: npm test -- --run src/scientific-content/records.service.spec.ts src/scientific-content/records-http.spec.ts src/scientific-content/record-invariants.spec.ts src/publishing/scientific-trust.service.spec.ts src/media/media-attachments.service.spec.ts` | Passed (5 test files, 126 tests passed) | All invariant and mutation rejection/restoration tests pass. |
| `npm test` (frontend) | Passed (12 test files, 143 tests passed) | `npm test` runs full Vitest suite in frontend. |
| `frontend: npm test -- --run src/components/dashboard/record-editor/record-editor-utils.test.ts` | Passed (1 test file, 35 tests passed) | Includes new unit tests for `isRecordCategoryArchived` and `isRecordEditorReadOnly`. |
| `npm run lint` (backend) | Passed (0 errors, 0 warnings) | ESLint check across all backend TypeScript sources. |
| `npm run lint` (frontend) | Passed (0 errors, 0 warnings) | ESLint check across all frontend sources. |
| `npm run typecheck` (backend) | Passed | `tsc --noEmit` exited 0. |
| `npx tsc --noEmit` (frontend) | Passed | TypeScript typecheck exited 0. |
| `npm run build` (backend) | Passed | `nest build` completed successfully. |
| `npm run build` (frontend) | Passed | Next.js 16 Turbopack production build completed successfully (129 static routes). |
| `git diff --check` | Passed | No whitespace errors or conflicts detected. |
| Local browser smoke test | Not run | Headless development environment without running graphical display. Verified via unit and HTTP integration suites. |

## Schema and migration impact

- **No new database schema migrations added.**
- Existing relational tables and constraints fully support invariant enforcement using category status and parent status.

## Security and data-preservation notes

- **Authorization boundary**: Category tree invariants are validated at the service boundary using transactional row locking (`FOR UPDATE` on `scientific_records`). UI hiding is purely for user experience and does not substitute for backend enforcement.
- **Fail-closed**: Any mutation attempt on records under an archived category or archived parent is rejected with `409 Conflict`.
- **Safe copy**: Error messages and UI notices are concise, accessible, and do not expose stack traces, database details, or privileged internal identifiers.

## Known limitations or unverified behavior

- Live browser smoke testing was not performed; automated HTTP integration and component tests were used in the headless environment.
- Phase 5 Step 5 (batch operations, publication workflows, etc.) was not begun, remaining strictly within the authorized scope.

## Reviewer focus

- `backend/src/scientific-content/record-invariants.ts`: Reusable category branch check and record lifecycle verification with row locking.
- `backend/src/scientific-content/records-http.spec.ts`: End-to-end HTTP tests verifying rejection across all 6 mutation endpoints under archived categories.
- `frontend/src/components/dashboard/record-editor/record-editor.tsx`: Suppression of mutation panels when `isReadOnly` is active and clean back-navigation.
