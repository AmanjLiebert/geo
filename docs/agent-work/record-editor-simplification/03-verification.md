# Teacher record editor simplification — independent verification

Status: `CHANGES_REQUIRED`

Reviewed range: `5541c48..730ac55`

Reviewer: Codex, from the assignment, actual diff, affected source, contracts, and tests rather than the implementation report.

## Decision

The public-data safety boundaries are preserved, but the editor does not pass the acceptance gate. Required/optional completion summaries are not authoritative, manual slug editing has a disclosure-state defect, and the four-stage tab interface does not implement the required keyboard interaction model. The implementation remains unreleasable pending corrections and a new independent review.

## Findings

1. **High — stage summaries can report the wrong work as complete or incomplete.** `record-editor.tsx` counts every active scientific field, including optional fields, so a record with all required facts complete can still appear partially complete. It also counts every attached source and file without considering source verification, primary-image status, approval, processing, rights, or alternative text. For example, an unverified source plus a PDF can produce `1 source · 1 file` even though both required Evidence tasks remain unmet. This conflicts with the required `Complete`/missing-required-items summaries and can misdirect teachers before the authoritative Review stage.
2. **High — the advanced slug editor collapses during valid edits.** `record-template-form.tsx` binds the native `<details>` `open` property to `Boolean(slugError)`. Expanding the disclosure is not represented in React state; typing a valid slug causes a render with `open={false}`, closing the disclosure while the teacher is editing. The new static-markup test does not exercise this interaction.
3. **High — the workspace tabs lack keyboard tab behavior.** `record-workspace-nav.tsx` gives every `role="tab"` button the default tab stop and implements only click selection. There is no roving `tabIndex`, Arrow Up/Down (or Left/Right at the responsive layout), Home, or End handling. The focused test explicitly expects no `tabindex="-1"`, so it preserves rather than detects the accessibility defect. This does not satisfy the assignment's keyboard-operation gate.
4. **Medium — the Optional-stage description and content disagree for extra files.** The navigation says Optional contains “extra files,” but `RecordMedia` is mounted only in Evidence, where all existing attachments and their maintenance controls appear alongside the required main-image task. Optional summaries also exclude media. This leaves optional attachment administration competing with the launch-critical Evidence path instead of being represented consistently by the Optional stage.

## Security and preservation review

- Restricted coordinates: passed source review. The public adapter renders only `geometry` for `public`/`approximate` DTO values, validates Point coordinates and bounds, and ignores an injected `exactGeometry`. The backend public query reads `public_record_locations`, excludes `exact_geometry` and sensitivity fields, and returns only the approved projection. Exact and public points remain separate in authoring; exact points are reused only for fully public visibility.
- Media privacy: passed source review. Existing authorized preview/upload APIs and short-lived private delivery were not replaced; the public adapter still uses only the approved public image endpoint and does not expose storage keys. Additional attachments are labelled private/not currently public.
- Evidence: passed source review. Verification permissions and controls remain in the existing evidence path, and the public query still filters references to `verification_status = 'verified'`.
- Publication: passed source review for authority boundaries. Review continues to consume backend readiness and existing transition APIs; no client-side publication bypass was introduced.
- Optional data: existing template attributes are merged before submission, saved optional values reopen their disclosure, and locations, relationships, evidence, and attachments are not deleted or rewritten by this change. The summary/UI defects above still require correction.

## Independent checks

- Focused Vitest: `7` files, `56` tests passed.
- Full frontend Vitest: `29` files, `322` tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm run build`: passed with the existing Atkinson Hyperlegible Next fallback-font warning.
- `git diff --check 5541c48..730ac55`: passed.
- Frontend-only Docker rebuild/restart: passed; the recreated frontend became healthy and `http://localhost/` returned HTTP `200`.
- Authenticated desktop/narrow-width browser smoke: not run. An authenticated Chrome dashboard window was available, but the computer-use safety layer stopped before interaction because it could not determine the current browser URL with enough confidence. No browser state was changed. Responsive, RTL, focus, disclosure, and end-to-end create/edit/read-only/review behavior therefore remain unverified live.

No backend source change or schema/data migration was present in the implementation range, so no backend suite or recovery rehearsal was required by the assignment.
