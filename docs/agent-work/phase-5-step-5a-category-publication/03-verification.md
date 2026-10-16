# Independent Verification — Phase 5 Step 5A

## Status

`CHANGES_REQUIRED`

## Reviewed commit

`3d4a9fe006e5686ed1479256a693a3371c8cc5a7`

## Scope and security review

The implementation is focused and the reported category/publication tests pass, but the publication boundary is not yet safe enough to accept.

1. **Publication does not use the dedicated high-risk policy.** `POST .../publish` and `POST .../unpublish` currently inherit only `MANAGE_SCIENTIFIC_CONTENT`. Both actions must explicitly require `PUBLISH_SCIENTIFIC_CONTENT` and use `@HighRiskAction()`, matching the existing record-publication boundary. Add HTTP/metadata coverage for the dedicated permission and recent privileged-auth requirement.
2. **Readiness is evaluated from unlocked parent and media rows.** `publishCategory()` locks only the category row, validates parent publication and media approval from joined snapshots, then later takes a media share lock without re-reading its state or confirming that a row exists. Lock and re-read the parent and selected media inside the same transaction before readiness is evaluated. Tests must prove a changed/invalid locked parent or media state blocks publication and leaves the draft/live projection unchanged.
3. **The frontend accepts malformed new contract fields.** `listManagedCategories()` treats `readiness` and `displayState` as optional and coerces malformed issue fields with `String(...)`. Require the new fields and strictly validate every issue as string `field`, `code`, and `message`; malformed responses must produce the existing safe dashboard error. Apply the same strict issue validation to `getCategoryReadiness()` and add rejection tests.

## Independent checks

- `backend: npm test -- src/scientific-content/category-publication.spec.ts src/scientific-content/records-http.spec.ts` — passed, 100 tests.
- `frontend: npm test -- --run src/lib/category-management-api.test.ts` — passed, 11 tests.
- Source review completed for the controller, service transaction, access-control policy, API parser, dashboard state helpers, and focused tests.
- Codebase-memory coverage was stale or unavailable for all changed files, so conclusions above were verified directly from current source.

## Browser smoke

Not repeated. The implementer reported it was not run because no local services were active. Browser verification remains part of the acceptance pass after corrections.

## Gate decision

Not accepted. Correct the three findings above, run only the affected backend/frontend tests and type checks, update `02-implementation-report.md`, and return one correction commit for review. Do not rerun full builds unless the correction changes routing, dependencies, or build configuration.

