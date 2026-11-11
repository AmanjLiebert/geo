# Geo-Kurdistan — Agent Rules

## Authority

- **OpenCode implements; Codex independently reviews critical work.** The user authorizes priorities, releases, destructive actions, deploy/push/merge, shared-database or production-data changes, and paid external operations.
- `PLAN.md` owns delivery order/status/gates; `MAP.md` owns product, roles, data, security, and architecture; `DESIGN.md` owns UI/UX; `MEMORY.md` owns the active formal task and statuses. Topic documents own maintenance and operations.
- Read only the documents and sections named by the assignment. Code/tests describe current implementation; docs describe intent. Report disagreements instead of silently changing either.
- Do not activate the next planned feature without user authorization.

## Task risk

- **QUICK:** isolated styling, copy, or low-risk bug. Inspect affected files, make the smallest change, run focused checks, and create no handoff documents.
- **STANDARD:** bounded feature, endpoint, or workflow. Inspect the owner module, affected contract, relevant MAP/DESIGN/PLAN sections, permissions, and tests.
- **CRITICAL:** auth, schema/data migration, media security, publication, restricted geography, shared contracts, deployment/recovery, or destructive data. Define scope, non-goals, permissions, rollback/recovery, and verification first. A small patch touching these boundaries remains CRITICAL.

## Formal work

- Critical tasks use `docs/agent-work/<task>/` with `01-assignment.md`, `02-implementation-report.md`, and `03-verification.md`; follow `docs/agent-work/README.md`.
- `MEMORY.md` is the only active-task pointer and owns status names, including `IMPLEMENTED_AWAITING_REVIEW`.
- OpenCode implements only authorized scope, records truthful evidence, and stops; it cannot self-approve or activate another task.
- Codex reviews the actual diff and affected source. Critical work remains `IMPLEMENTED_AWAITING_REVIEW` and unreleasable until independent verification passes.
- Completed task records are immutable audit history; never rewrite them to imply checks or independence that did not occur.

## Safety

- Preserve unrelated and uncommitted work. Use recoverable Git state for significant changes; never overwrite user changes.
- Follow MAP boundaries. Validate external input, deny private operations by default, and preserve object authorization, scientific identity, translations, evidence, revisions, audit history, media quarantine/approval, and restricted locations.
- Schema changes require reviewed migrations, preserved data, and recovery. Never silently hard-delete used business data.
- Never inspect, print, copy, modify, or commit real secrets, `.env` contents, keys, credentials, or private production data without an explicitly authorized operational need.
- Never expose secrets, private identifiers, stack traces, restricted coordinates, storage keys, or unfinished/debug behavior.
- Preserve localization/RTL readiness, accessibility, visual identity, and user data. Avoid unrelated redesigns, dependencies, services, and abstractions.

## Execution and verification

- Search narrowly; read affected source, dependencies, and relevant document sections. Expand only for a concrete dependency or risk.
- Avoid unrelated refactors, formatting churn, broad dumps/searches, unnecessary docs, and repeated successful checks when assumptions did not change.
- Run focused tests first. Run broader suites/builds for affected shared contracts, dependencies, schema, auth, storage, routing, publication, deployment/recovery, or milestone/release gates.
- Verify affected loading, empty, error, success, session/offline, accessibility, responsive, permission-denial, and public-safety states in proportion to risk.
- Never claim an unrun check passed. Report changed behavior, files, checks, risks, and—when critical—review status; stop when the authorized task and required verification are complete.
