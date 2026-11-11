# Geo-Kurdistan — Agent Rules

## 1. Agent Responsibilities
- **OpenCode:** Primary developer. Implements features, fixes bugs, and runs appropriate tests.
- **Codex:** Independent reviewer. Reviews OpenCode's Git changes when available, focusing on bugs, security, data integrity, and regressions.
- OpenCode may continue development while Codex is rate-limited. Critical changes remain `PENDING_REVIEW` until independently verified.
- Do not automatically deploy, push, merge, or modify production data without permission.

## 2. Source of Truth
- `PLAN.md` — Delivery order, scope, and completion criteria.
- `MAP.md` — Architecture, roles, data ownership, and workflows.
- `DESIGN.md` — UI/UX and accessibility standards.
- `MEMORY.md` — Active critical task and review status.
- Read only relevant sections when needed. Do not repeatedly load entire documents.
- `PLAN.md` controls scope; `MAP.md` controls system boundaries.

## 3. Task Complexity
**QUICK:** Styling, copy, isolated bugs, small UI fixes.
- Inspect only affected files.
- Make minimal changes and run focused checks.
- No handoff documents or full-project analysis.

**STANDARD:** Bounded features, API endpoints, dashboard workflows.
- Inspect relevant modules, contracts, and tests.
- Implement with focused verification.
- Check affected permissions, validation, and error states.

**CRITICAL:** Authentication, authorization, migrations, media security, publication rules, shared contracts, deployment architecture.
- Review relevant project documentation and security boundaries.
- Record implementation evidence and perform necessary tests.
- Require independent Codex review before production release.
- If Codex is unavailable, mark `PENDING_REVIEW`.
- Even small changes require critical safeguards when they touch sensitive boundaries.

## 4. Agent Coordination
- OpenCode handles implementation; Codex reviews the actual Git diff.
- Formal critical tasks use `docs/agent-work/<task>/` with assignment, implementation, and verification documents.
- `MEMORY.md` tracks formally coordinated critical work, not routine fixes.
- OpenCode must not self-approve critical work or expand task scope.
- Codex reports actionable findings; OpenCode fixes them.
- Do not reopen verified work without a concrete reason.

## 5. Architecture and Product
- Frontend: Next.js, React, TypeScript.
- Backend: NestJS modular monolith.
- Database: PostgreSQL with PostGIS; add pgvector only when needed.
- Store private media in object storage and metadata in PostgreSQL.
- Keep business rules, permissions, and database access behind NestJS.
- Roles: `visitor`, `teacher`, `admin`. Enforce authorization server-side.
- Categories and subcategories are managed through the dashboard, not hardcoded.
- Draft records may be unclassified; published records require valid categories and publication checks.
- Preserve scientific references, provenance, revisions, and audit history.
- Use versioned templates for category-specific scientific fields.
- Follow `MAP.md` for detailed behavior and ownership.

## 6. Engineering and Security
- Make small, focused, backward-compatible changes.
- Validate external input and deny unauthorized access by default.
- Use migrations for schema changes; never silently destroy existing data.
- Preserve media quarantine, validation, approval, and publication protections.
- Never expose secrets, private files, stack traces, or sensitive internal details.
- Preserve localization, RTL support, accessibility, and existing user data.
- Bound uploads, queries, retries, concurrency, and expensive processing.
- Do not introduce unnecessary dependencies, services, or abstractions.
- For important features, assess relevant contracts, data impact, permissions, tests, operational risks, and rollback needs.

## 7. UI/UX Rules
- Follow `DESIGN.md` and preserve the existing scientific visual identity.
- Do not introduce generic dashboard templates or unrelated redesigns.
- Do not expose debug information, development notes, fake statistics, or unfinished controls to users.
- Use concise, neutral access and error messages without revealing internal security mechanisms.
- Verify affected loading, empty, error, and success states.
- Keep public API responses minimal; backend authorization remains mandatory.

## 8. Efficiency and Verification
- Search narrowly; read only relevant source files and dependencies.
- Avoid repeated file reads, broad searches, unrelated formatting, and unnecessary documentation edits.
- Run focused tests first; do not repeatedly run successful tests without relevant changes.
- Run broader tests/builds when shared behavior, schema, security, storage, routing, or publication changes require them.
- Do not create handoff documents for QUICK or ordinary STANDARD tasks.
- Do not narrate every command or generate lengthy reports.
- Never claim tests passed unless executed.

## 9. Git and Completion
- Preserve clear Git diffs or commits for later Codex review.
- Review only the relevant commit range, expanding scope when a concrete risk requires it.
- QUICK: Report the fix and validation briefly.
- STANDARD: Report changed behavior, relevant files, tests, and remaining risks.
- CRITICAL: Report implementation, checks, risks, and independent review status.
- Stop when the requested task and necessary verification are complete.
- Never sacrifice correctness or security merely to reduce token usage.