# Geo-Kurdistan evolution and maintenance plan

## Purpose

This guide turns the remaining product work into a system that can evolve safely. It complements `PLAN.md` (delivery order), `MAP.md` (ownership and boundaries), and `DESIGN.md` (user experience). It does not activate a feature by itself.

## 1. Architecture strategy

Keep the current modular monolith. One Next.js application, one NestJS application, PostgreSQL/PostGIS, a durable worker, ClamAV, private object storage, and a reverse proxy are appropriate for the current team and traffic. Do not introduce microservices, Kubernetes, a second database, or a local AI model merely to prepare for hypothetical scale.

Each capability has one owner:

| Capability | Canonical owner | Reused services |
| --- | --- | --- |
| Categories, record types, templates, records | Scientific Content | Identity, evidence, geography, media, publication |
| Research publications | Research | Identity, evidence, media, relationships, review/publication |
| About, mission, ownership, contact, privacy, terms | Site Content | Translations, revisions, media, publication |
| Geological news | Editorial/Publishing | Identity, translations, sources, media, scheduling |
| Search and public discovery | Discovery | Public-safe projections from owner modules |
| Optional AI/RAG | Intelligence adapter | Permission-filtered reviewed projections and external inference |

Frontend components render and collect input; they do not own business rules. NestJS owns validation, authorization, lifecycle rules, and transactions. PostgreSQL owns canonical structured state. The worker owns slow, bounded, retryable processing. Object storage remains private and contains files, not business permissions.

## 2. Safe change contract

Every assignment states:

1. the user outcome and non-goals;
2. the owner module and affected API contracts;
3. schema/data impact and migration/recovery method;
4. permission matrix and object-level checks;
5. public/private projection impact;
6. resource and external-service impact;
7. focused tests and milestone gate;
8. rollout, feature flag, monitoring, and rollback path.

Use backwards-compatible additions by default. For incompatible data changes, use **expand → migrate/backfill → verify → contract** in separate releases. Never rename/drop a used column and change all callers in one irreversible deployment. Archive business content instead of hard-deleting it. Preserve stable IDs, revisions, references, rights, and audit history.

Incomplete or provider-dependent features remain absent from production UI or behind an explicit server-side feature flag that defaults off. A disabled optional feature must fail closed and leave core authoring/browsing functional.

## 3. Ordered product workstreams

### Stage A — stabilize the working core

- Inventory supported category, record, evidence, location, media, review, publication, and Explore behavior.
- Close correctness and HCI gaps without redesigning data ownership.
- Create one browser-level critical path for teacher authoring/publication and one signed-out public path.
- Establish production-like backup/restore and current resource measurements.

**Usable result:** the existing 40% is dependable and becomes a safe regression baseline.

### Stage B — research

- Finish the protected research list/editor using the existing Research owner module.
- Reuse evidence, contributor, media, relationship, review, and publication patterns through services—not copied forms or tables.
- Build the public research list/detail/online-reading experience with rights-aware document delivery.

**Usable result:** one research publication can move from draft to public correction/archive safely.

### Stage C — managed organization pages

- Provide simple admin authoring for About, mission, ownership/publisher, contact, privacy, and terms.
- Preserve revisions, effective dates, locale-ready content, and publication status.
- Replace public hardcoded claims only after their managed replacements are published.

**Usable result:** the organization can update essential pages without a code deployment.

### Stage D — approved operational and visitor work

- Finish only approved news, user activation/invitation, saved records, search, and map workflows.
- Deliver each as a separate task with real data, authorization, accessibility, empty/error states, and a public or operational outcome.

**Usable result:** each completed capability is independently deployable; unfinished work stays hidden.

### Stage E — AI decision gate

Before implementation, document the user problem, data allowed for retrieval, required accuracy, provider/data-retention terms, cost ceiling, and a non-AI fallback. “Add AI” is not an adequate outcome.

If approved:

- use an external model API first behind an application-owned provider interface;
- keep a global kill switch and per-feature flag;
- retrieve only reviewed content the current user may access;
- require citations and safe rendering;
- set request timeouts, token/output limits, concurrency limits, rate limits, retry limits, and monthly cost alerts;
- log operational metadata without prompts containing protected or personal content;
- keep AI read-only: no publish, delete, permission, role, or canonical-data mutations.

Do not run a foundation model or GPU workload on the application server. A future self-hosted model requires a separate capacity/security review and separate deployment boundary.

**Usable result:** either a justified, reversible AI enhancement with a non-AI path, or a documented decision not to add AI.

### Stage F — production hardening

- Accessibility and responsive critical-path audit.
- OWASP ASVS Level 2-aligned security verification and dependency review.
- Backup/restore rehearsal for PostgreSQL and irreplaceable media.
- Load and soak tests against realistic data volume.
- Monitoring, alerts, log retention, incident steps, deployment and rollback rehearsal.

**Usable result:** an operable release rather than a developer-only demonstration.

## 4. Performance and resource policy

Performance work starts with measurements. Record a baseline before optimizing and repeat it after material changes.

### Application budgets

- Public list APIs are paginated, bounded, minimally projected, indexed, and protected from N+1 queries.
- Dashboard lists are paginated or incrementally loaded; no endpoint returns an unbounded hierarchy, record set, relationship set, or audit history.
- API requests do not buffer large files. Direct signed uploads remain private; processing happens in the worker.
- Worker jobs are idempotent, have bounded input sizes, concurrency, memory, retries, and timeouts, and expose failed/dead states.
- Image delivery uses approved derivatives with size limits and cacheable public URLs controlled by the backend/proxy. Originals remain private.
- Private/dashboard responses use `private, no-store`; only public immutable or safely invalidated projections are cached.
- Database connections, external requests, and AI calls have explicit pool/concurrency ceilings.

### Measurement gates

For each milestone, capture:

| Area | Evidence |
| --- | --- |
| Web/API | p50/p95 latency, error rate, payload size, slow endpoints |
| PostgreSQL | slow queries, query count per critical request, index use, pool saturation |
| Worker/media | queue depth, processing duration, retries/failures, peak memory |
| Host | idle and test-load RAM/CPU/disk, container restarts, disk growth |
| Frontend | production bundle/build result, route load behavior, image weight, accessibility |
| External/AI | latency, timeout/rate-limit rate, request count, token/cost budget |

The first production target is a stable CPU-only server. Reserve headroom for the OS, proxy, PostgreSQL, API, frontend, worker, and malware scanner; do not size the server from container limits alone. If load exceeds capacity, optimize queries, payloads, caching, images, and job concurrency first; scale the server second; split a measured bottleneck last.

## 5. Testing and release gates

Use risk-proportionate layers:

- **Domain/unit:** validation, lifecycle, readiness, projection, formatting.
- **HTTP/integration:** authentication, permission matrix, object ownership, CSRF, status codes, DTO boundaries, transaction outcomes.
- **Migration:** clean apply, existing-data upgrade, constraints/indexes, recovery notes.
- **Frontend:** API shape validation, state handling, accessibility, responsive components.
- **End to end:** teacher draft → evidence/location/media → publish/correct; signed-out visitor read; archive/restore; denied requests.
- **Operations:** backup restore, worker failure/retry, storage denial, provider outage, deployment smoke and rollback.

Implementation uses focused tests. Run full relevant suites/builds once before a milestone or release, and whenever a shared contract, dependency, routing/build configuration, schema, authorization, storage, or publication rule changes.

## 6. OpenCode and Codex operating model

### Codex owns planning and acceptance

1. Select the next smallest plan gate.
2. Create a dedicated `docs/agent-work/<task>/` folder.
3. Write `01-assignment.md` with scope, non-goals, affected boundaries, risks, resource budget, and exact checks.
4. Activate only that task in `MEMORY.md`.
5. After handoff, inspect the real diff and relevant source; never approve from the report alone.
6. Record evidence and disposition in `03-verification.md`.

### OpenCode owns implementation

1. Read `AGENTS.md`, `PLAN.md`, `MAP.md`, `DESIGN.md`, `MEMORY.md`, and the active assignment.
2. Implement only the authorized scope and preserve unrelated work.
3. Run focused checks first; avoid repeated full builds unless required by the assignment.
4. Write concise truthful evidence in `02-implementation-report.md`, including changed files, commands/results, unrun checks, risks, and commit hash.
5. Stop. Do not activate another task, self-approve, deploy, merge, push, or access secrets.

Codex may return `CHANGES_REQUIRED`; OpenCode corrects the same task. A new task starts only after the previous gate is verified complete.

## 7. Release and recovery flow

1. Focused feature branch and reviewed commit.
2. Automated checks and Codex verification.
3. Deploy to a separate test/staging environment using non-production credentials/data.
4. Create and verify an off-server backup before a production data migration.
5. Apply migrations as a distinct step; then deploy application containers.
6. Run health, auth, teacher critical-path, visitor critical-path, worker, and storage smoke tests.
7. Monitor errors, latency, resource saturation, and queue failures.
8. Roll back application images/configuration when safe. Database changes use the documented recovery/forward-fix plan; never improvise destructive rollback on live data.

## 8. Definition of done

A task is not done because it builds or looks correct. It is done only when:

- its user outcome and non-goals are satisfied;
- authorization and public/private projections are tested;
- schema/data changes are migrated and recoverable;
- loading, empty, error, offline/session, and narrow-screen states are appropriate;
- resource impact is bounded and measured where material;
- logs/metrics make failure diagnosable without leaking sensitive data;
- deployment and rollback implications are documented;
- visible copy is production-suitable and unfinished behavior is hidden;
- Codex records independent verification and closes the active gate.
