# Verification

Status: `COMPLETE`

## Gate result

The Phase 6 Step 6F gate passes.

- Service and HTTP-boundary behavior permits a record owner to publish a complete in-review scientific record and records the actor in revisions and audit history.
- Missing readiness requirements still block publication.
- The migration permits same-owner publication while retaining classification, published-category, verified-evidence, location-policy, approved-media, rights, and alt-text database enforcement.
- Research, news, and managed-page independent-review enforcement remains installed.
- The published editor is read-only until **Edit published record** is confirmed; the existing server transition returns it to draft, where it is editable and no longer publicly projected until republished.
- A failed transition does not reload the record as draft, so the published read-only state remains.

## Evidence

- Backend: 50 test files / 375 tests passed; lint, typecheck, format, and build passed.
- Frontend: 21 test files / 191 tests passed; lint, typecheck, and build passed.
- Local migration rehearsal: one migration applied; API and frontend healthy; `/health/ready` returned 200.
- Live database assertions confirmed the intended trigger/function state without resetting data.
- Live signed-in click-through remains a short user smoke test because the available browser session was signed out and authentication was not automated.

