# Agent Work Handoffs

Each delegated task lives in its own folder so assignments, implementation claims, and independent verification never become one nested report.

Required files:

- `01-assignment.md` — scope, exclusions, acceptance gate, and required checks. Owned by the assigning/reviewing agent.
- `02-implementation-report.md` — exact changes, commit, checks run, failures, and limitations. Owned by the implementation agent.
- `03-verification.md` — independent diff review, security review, focused test results, live smoke result, and final decision. Owned by the reviewing agent.

When a task is complete, keep its folder unchanged as the audit-friendly handoff record. Create a new folder for the next task and update only the active-task pointer in `MEMORY.md`.
