# Independent Verification — Phase 5 Step 5A

## Status

`COMPLETE`

## Reviewed commit

`3d4a9fe006e5686ed1479256a693a3371c8cc5a7`

Correction commit: `54a2706f5704b3c95f77cd33a77e46cb38735bcf`

## Scope and security review

The implementation is focused and the publication boundary is now accepted.

1. **Publication does not use the dedicated high-risk policy.** `POST .../publish` and `POST .../unpublish` currently inherit only `MANAGE_SCIENTIFIC_CONTENT`. Both actions must explicitly require `PUBLISH_SCIENTIFIC_CONTENT` and use `@HighRiskAction()`, matching the existing record-publication boundary. Add HTTP/metadata coverage for the dedicated permission and recent privileged-auth requirement.
2. **Readiness is evaluated from unlocked parent and media rows.** `publishCategory()` locks only the category row, validates parent publication and media approval from joined snapshots, then later takes a media share lock without re-reading its state or confirming that a row exists. Lock and re-read the parent and selected media inside the same transaction before readiness is evaluated. Tests must prove a changed/invalid locked parent or media state blocks publication and leaves the draft/live projection unchanged.
3. **The frontend accepts malformed new contract fields.** `listManagedCategories()` treats `readiness` and `displayState` as optional and coerces malformed issue fields with `String(...)`. Require the new fields and strictly validate every issue as string `field`, `code`, and `message`; malformed responses must produce the existing safe dashboard error. Apply the same strict issue validation to `getCategoryReadiness()` and add rejection tests.

All three findings were corrected in `54a2706`:

- Publish/unpublish explicitly require the dedicated publication permission and high-risk recent authentication.
- Parent and media state are locked and re-read in the publication transaction before readiness evaluation.
- The frontend strictly validates readiness, display state, unpublished-change state, and issue fields.

## Independent checks

- `backend: npm test -- src/scientific-content/category-publication.spec.ts src/scientific-content/records-http.spec.ts` — passed, 107 tests.
- `frontend: npm test -- --run src/lib/category-management-api.test.ts` — passed, 16 tests.
- Backend and frontend TypeScript checks — passed.
- Backend and frontend lint — passed with no errors.
- `git diff --check` — passed.
- Source review completed for the controller, service transaction, access-control policy, API parser, dashboard state helpers, and focused tests.
- Codebase-memory coverage was stale or unavailable for all changed files, so conclusions above were verified directly from current source.

## Browser smoke

Not run because local services were not active. No UI layout or routing behavior changed in the correction.

## Gate decision

Accepted. Phase 5 Step 5A meets its category-readiness and publication gate. The working tree must remain clean before the next separately assigned task begins.

