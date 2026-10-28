# Verification

## Result

`PASS_PENDING_LIVE_DEPLOYMENT`

## Independent checks

- Confirmed that the demo route is gated by two explicit variables and rejects a non-demo database.
- Confirmed that production is still the default and that the existing worker, ClamAV processor,
  and worker entrypoint have no diff.
- Confirmed signature/type checks remain in the upload confirmation path before demo processing.
- Confirmed Sharp is limited to one processing job at a time, uses bounded cache/concurrency, fully
  decodes accepted input, enforces the pixel ceiling, and re-encodes metadata-free WebP.
- Confirmed the private original is deleted before the database approval transaction and that
  failed validation cannot execute the approval update.
- Confirmed media viewing requires `processing_status = 'approved'` and serves derivative rows,
  not the original quarantine key.
- Confirmed existing authorization tests deny visitors and allow teachers, and existing
  publication tests require approved primary media with rights and alternative text.
- Confirmed the frontend accepts `approved` immediately only in the demo image build; the production
  confirmation contract remains `quarantined`.
- Confirmed the Render Blueprint does not create a worker or ClamAV service and references a
  separately named demo database.
- Confirmed the Free-plan Blueprint does not rely on Render's paid-only pre-deploy command; the
  demo-gated Docker startup fails closed if migration or seeding fails.
- Confirmed browser API calls remain same-origin through a Next.js rewrite, so deployment does not
  weaken session cookies to `SameSite=None` or require third-party cookie support.

## Commands

- Backend: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` — passed.
- Frontend: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` — passed.
- Focused security/publication suites — 155 backend tests passed.
- Focused frontend upload-contract suites — 29 tests passed.
- `git diff --check` — passed.

## Gate not yet claimable

The repository-side implementation is accepted. The overall task remains open until a real Render
demo uses the separate B2/Firebase/PostgreSQL credentials and passes the signed-in teacher upload
and signed-out visitor display scenario. No deployment or credential access was performed during
this review.
