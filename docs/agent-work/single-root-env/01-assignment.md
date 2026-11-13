# Single root environment file

User authorized Codex implementation directly, overriding the usual implementer assignment. Risk: CRITICAL (deployment/configuration).

Scope: root `.env` for API, worker, backend maintenance commands and Next.js dev/build/start; preserve injected environment precedence and Docker operation without a mounted `.env`. Extend the root example and document VPS setup.

Non-goals: auth/role changes, data/schema changes, external services, automatic deployment or reading/modifying real credentials. Firebase service-account JSON remains a protected separate file. No public export of server secrets.

Recovery: revert this code/configuration change; preserve original private files so operators can restore their previous setup. No database migration is introduced.

Verification: synthetic environment-file precedence/missing-file/error tests; PM2 configuration inspection; backend tests/typecheck/build; frontend tests/typecheck/build using synthetic settings in an isolated copy without real environment files. Independent review remains required; no self-approval.
