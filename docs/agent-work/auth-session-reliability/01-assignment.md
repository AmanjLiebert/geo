# Authentication session reliability and usable protected actions

Status: `READY_FOR_IMPLEMENTATION`

Risk: CRITICAL (authentication persistence, recent-identity policy, and record publication lifecycle)

## Problem and evidence

- A Docker stop/start does not delete server sessions: PostgreSQL uses the named `postgres_data` volume, startup does not revoke sessions, and a read-only aggregate check after the reported restart found an active unrevoked session still present.
- The frontend `AuthProvider` converts every `/api/v1/auth/me` failure—including a temporary connection or 5xx failure while Docker services are starting—into `user = null` and never retries. This falsely renders the signed-out UI although the cookie and database session remain valid.
- Ordinary server sessions default to 24 hours.
- Recent identity confirmation defaults to five minutes, and record `unpublish` is marked high-risk. Therefore **Edit published record** starts an unpublish request and asks a signed-in teacher/admin to confirm identity after only five minutes.

## Authorized scope

- Preserve a valid session across Docker/backend restarts; a transient authentication-service outage must never be represented as a confirmed sign-out.
- Give `AuthProvider` an explicit unavailable/reconnecting state, bounded automatic retry, and a manual retry path. Only an actual 401 may establish the signed-out state.
- Keep an already-known user during transient refresh failures; do not expose stale protected content after an actual 401.
- Update account navigation, account page, and dashboard shell so loading, unavailable/reconnecting, signed-out, visitor-denied, and authenticated states are distinct and accessible.
- Increase the default opaque server-session lifetime from 24 hours to 14 days, preserving absolute expiry, revocation, disabled-user denial, secure HTTP-only cookie handling, CSRF, and database-backed token hashing.
- Increase the default recent-identity window from five minutes to one hour.
- Remove the recent-identity requirement from record `unpublish` used by **Edit published record**. Keep `PUBLISH_SCIENTIFIC_CONTENT`, `MANAGE_SCIENTIFIC_CONTENT`, CSRF, record-state validation, revision creation, and audit recording unchanged.
- Keep recent identity confirmation on record publication, translation review, permission/security operations, restricted-location operations, and every other existing high-risk endpoint.
- Add focused backend/frontend tests and perform a local Docker restart smoke test without removing volumes.

## Non-goals

- No role, permission bundle, invitation, MFA, identity-provider, schema, migration, record data, or production-data change.
- No removal of CSRF, session revocation, disabled-account checks, publication readiness, audit events, or object authorization.
- No automatic publication retry after identity confirmation and no broad redesign of the account or dashboard UI.
- No `docker compose down -v`, volume deletion, shared-database operation, deployment, push, or merge.
- Do not modify or include the unrelated uncommitted category-image/navigation work already present in the worktree.

## Recovery

- Reverting the task commit restores the previous frontend state model, 24-hour session default, five-minute recent-authentication default, and record-unpublish annotation.
- No stored session or record row requires migration. Existing sessions retain their original absolute expiry; only newly created sessions use the new default.
- If the longer defaults create an operational concern, restore the previous environment values without changing stored content.

## Verification plan

Backend focused checks:

- newly created sessions receive the configured 14-day expiry;
- expired, revoked, missing, and disabled-user sessions remain denied;
- record publish still requires recent identity;
- record unpublish allows an authorized stale session but still rejects missing permission, missing/invalid CSRF, signed-out requests, visitors, and invalid record state;
- unpublish still writes its revision and audit event;
- environment validation accepts the new defaults and retains safe bounds.

Frontend focused checks:

- 401 becomes signed out;
- network/5xx failure becomes unavailable/reconnecting, not signed out;
- a transient failure followed by success restores the same authenticated user without a new login;
- bounded retry stops safely and manual retry works;
- a known authenticated user is not cleared by a transient refresh failure but is cleared by a later 401;
- dashboard/account/navigation render distinct loading, unavailable, signed-out, visitor, and authenticated states;
- timers/listeners are cleaned up and accessible status text is announced.

Broader checks:

- affected backend and frontend Vitest suites;
- backend/frontend type checks and affected-file lint/format checks;
- production builds because authentication context is a shared frontend contract;
- `git diff --check`;
- local smoke: sign in, confirm `/auth/me`, stop Docker without `-v`, start Docker, observe reconnecting state during startup, and confirm the same session returns after health without signing in again;
- local smoke: wait beyond five minutes and confirm **Edit published record** succeeds for an authorized teacher/admin without identity confirmation, while **Publish** still requests confirmation after the configured recent-auth window.

## Acceptance gate

The task passes only when a valid signed-in user survives an ordinary Docker stop/start without a new login, temporary API unavailability is never mislabeled as signed out, an authorized teacher/admin can edit a published record without a five-minute identity-confirmation interruption, and all retained authentication, CSRF, permission, publication, revision, and audit boundaries are independently verified.

Implementation stops at `IMPLEMENTED_AWAITING_REVIEW`. OpenCode records exact commits and checks in `02-implementation-report.md`; Codex alone records the independent decision in `03-verification.md`.
