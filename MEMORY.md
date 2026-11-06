# Geo-Kurdistan Agent Coordination

This file is the small, durable index for delegated work. It is not a combined progress report and must not accumulate implementation details.

## Active task

| Field | Value |
| --- | --- |
| Task | Authentication session reliability and usable protected actions |
| Task folder | `docs/agent-work/auth-session-reliability/` |
| Status | `BLOCKED` |
| Implementer | OpenCode |
| Reviewer | Codex |
| Plan gate | A valid user survives an ordinary Docker stop/start without signing in again; temporary API unavailability is not mislabeled as sign-out; authorized record editing is not interrupted by five-minute identity confirmation; retained authentication, CSRF, permission, publication, revision, and audit boundaries pass independent review. |

## Required file order

1. Implementer reads `01-assignment.md` and the repository source-of-truth documents named there.
2. Implementer changes only the authorized scope, runs focused checks, and writes `02-implementation-report.md`.
3. Reviewer inspects the actual diff and writes independent results in `03-verification.md`.
4. Only the reviewer changes this task to `COMPLETE`, `CHANGES_REQUIRED`, or `BLOCKED`.
5. A new task receives a new folder. Do not append the next phase to these files.

## Status meanings

- `READY_FOR_IMPLEMENTATION`: assignment is ready; implementation has not been accepted.
- `IMPLEMENTED_AWAITING_REVIEW`: implementer reports completion; independent review is pending.
- `CHANGES_REQUIRED`: reviewer found specific corrections.
- `BLOCKED`: work cannot continue without an external decision or dependency.
- `COMPLETE`: reviewer verified the plan gate and recorded evidence.

## Working boundaries

- One active task at a time.
- One agent edits the implementation at a time; do not make overlapping changes in the same files.
- Use a dedicated branch and report the exact commit hash.
- During implementation, run focused tests first. Run the broader phase gate once before handoff.
- During correction rounds, run only affected tests and type checks. Do not repeat full suites or production builds that already passed unless the correction changes dependencies, build configuration, routing/export behavior, or the reviewer explicitly requests them.
- Do not rebuild unaffected services or rehearse database recovery when the task has no schema/data change.
- Schema, authorization, storage, publication, or destructive-data work still requires the stronger checks appropriate to its risk.
- Reports must state commands and outcomes truthfully. “Not run” is acceptable; invented or inferred pass results are not.
- No agent may read, print, copy, change, or commit `.env` files, service-account keys, Backblaze credentials, production data, or other secrets.
- No deployment, merge to the main branch, migration against a shared database, or remote push unless the user separately authorizes it.

## Report size rule

Keep each report short and task-specific. Link to files and commits instead of pasting large diffs or repeating older phase history.
