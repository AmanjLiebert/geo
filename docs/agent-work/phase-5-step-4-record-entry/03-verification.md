# Independent Verification — Phase 5 Step 4

## Status

`CHANGES_REQUIRED`

## Diff and scope review

- Reviewed commit `42296499e8dfcd7c80f98c30c4322a89e46d6189` against its parent.
- The commit remains within Phase 5 step 4 and does not add a schema migration.
- Category/record-type/template selection now fails closed when the selected category or its immediate parent is archived.
- The structure-selector rendering correction and empty-template guidance are consistent with the authorized scope.

## Authorization and input-boundary review

- The records controller remains protected by `MANAGE_SCIENTIFIC_CONTENT`; the added HTTP checks independently passed for teacher/admin allow and visitor/signed-out deny behavior.
- Core record creation and attribute updates validate an active category branch in `RecordsService`.
- **Blocking gap:** an archived category branch does not prevent all edits to its records. The frontend displays the archived-category warning and blocks only `handleFormSubmit`, while it continues to render `RecordEnglishDetails`, `RecordEvidence`, `RecordLocations`, `RecordRelationships`, and `RecordMedia`. The corresponding backend mutation paths check record status but not category/parent status:
  - `RecordsService.upsertTranslation()` calls `assertEditable()`, which only enforces record lifecycle state.
  - `ScientificTrustService.assertRecordEditable()` selects only record status/template version, so evidence, location, and relationship mutations remain possible.
  - `MediaService.attachToRecord()` checks only record status and media state.
- Because UI visibility is not an authorization boundary, hiding or disabling these panels alone is insufficient. Every mutation path available from this editor must fail closed when the record's category or parent is archived, preferably through one reusable backend invariant with focused tests.

## Data integrity and compatibility review

- Existing specialist record types are not rewritten by this commit.
- The General geological record test confirms empty template attributes and pinned classification can be saved/reloaded through `RecordsService` mocks.
- No evidence was found that existing records, templates, or category mappings are deleted or reclassified.
- The incomplete archived-branch invariant permits supporting record data to change while the interface says the record cannot be edited; this must be corrected before the phase gate can pass.

## Independent automated checks

| Command | Result | Notes |
| --- | --- | --- |
| `backend: npm test -- --run src/scientific-content/records.service.spec.ts src/scientific-content/records-http.spec.ts` | PASS | 2 files, 96 tests |
| `frontend: npm test -- --run src/components/dashboard/record-editor/record-editor-utils.test.ts` | PASS | 1 file, 28 tests |
| `backend: npm run typecheck` | PASS | `tsc --noEmit` |
| `frontend: npx tsc --noEmit` | PASS | Frontend has no `typecheck` npm script |
| `git show --check --oneline HEAD` | PASS | No whitespace errors in commit |

## Browser smoke test

- Not run because the static/backend review already found a blocking authorization/lifecycle inconsistency. Run the live create → reopen → archive category → denied edits → restore → editable-again scenario after correction.

## Findings requiring correction

1. Enforce the active category-tree invariant for every record mutation reachable from the editor: English translation/details, evidence, location, relationships, and media attachment, as well as the existing attributes update.
2. Do not duplicate slightly different SQL across services. Add or reuse one clear invariant/helper appropriate to the current modular boundaries, keeping transaction locking where mutation safety requires it.
3. Add focused service/HTTP tests proving that a draft under an archived category and under an archived parent cannot mutate any of those supporting sections. Confirm restoration makes those mutations available again.
4. When the branch is archived, render the editor as read-only: show the neutral warning and do not render active mutation controls. Fix the edge case where the categories response is empty, which currently makes `categories.length > 0` prevent archived-state detection.
5. Preserve all existing data and do not start Phase 5 step 5.

## Gate decision

`CHANGES_REQUIRED`

The core classification work and focused tests pass, but the archived-category lifecycle rule is inconsistent across supporting record mutations. Phase 5 step 4 is not complete until the correction is independently verified.
