# Implementation report

Status: `IMPLEMENTED_AWAITING_REVIEW`

## Delivered

- Scientific-record owners may complete the review step and publish their own record.
- The forward migration removes only the record-specific independent-review database checks; category, evidence, location, approved-media, rights, alt-text, authorization, CSRF, locking, revision, and audit controls remain.
- Published records now present **Edit published record**. Confirmation explains that the public record is hidden until it is published again, while its content and history are preserved.
- Research, news, managed pages, authentication, and public API policy were not changed.

## Verification run

- Backend focused tests: 21 passed.
- Backend full suite: 50 files, 375 tests passed.
- Frontend full suite: 21 files, 191 tests passed.
- Backend and frontend lint, type checks, format check, and production builds passed.
- Local Docker images built, one migration applied, API/frontend became healthy, and readiness returned HTTP 200.
- Live database inspection confirmed the new migration, removal of only the record translation independent-review trigger, and preservation of the equivalent research/news/managed-page triggers.
- Browser interaction was limited to a signed-out session; login was not automated.

