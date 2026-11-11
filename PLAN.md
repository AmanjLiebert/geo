# Geo-Kurdistan Delivery Plan

> **Authority:** This file owns current delivery order, status, priorities, and release gates. `MAP.md` owns product/data/security/architecture rules; `DESIGN.md` owns UI/UX; `MEMORY.md` owns the active formal task and status vocabulary; topic documents own detailed maintenance and operational procedures.

## 1. Current status

Geo-Kurdistan is an evolving product, not a finished production service.

Working foundations documented by source, tests, task records, and development rehearsals include:

- Next.js public experience and protected dashboard;
- NestJS modular API, PostgreSQL/PostGIS, Firebase-backed identity, opaque sessions, and fixed roles;
- configurable categories, record types, templates, translations, records, revisions, evidence, protected geography, media, and publication checks;
- teacher/admin scientific workflows for category and record creation, editing, readiness, publication/unpublication, archive, and restore;
- approved image/PDF processing foundations and public-safe derivative delivery;
- runtime public Explore categories, collections, records, and details from published PostgreSQL projections.

Not yet complete end to end:

- managed research authoring, review, publication, correction/archive, and public reading as one verified lifecycle;
- admin-maintained About, mission, ownership, contact, privacy, and terms replacing hardcoded public claims;
- approved news, invitation/activation, saved-record, search, and map workflows where current gates remain incomplete;
- production deployment, external monitoring, resource/load baselines, restore-tested recovery on the target environment, final privileged MFA decision, privacy/incident readiness, and launch verification;
- any optional AI capability.

Phases 1–4 passed development rehearsals, not production launch gates. The principal Phase 5 scientific dashboard and Phase 6 public scientific API/Explore flow are working foundations. The detailed historical plan and completion transcript are preserved in `docs/archive/documentation-consolidation-2026-10-31/PLAN.md`; authoritative evidence remains in architecture decisions, operations rehearsals, and immutable task folders.

## 2. Active task and authorization

`MEMORY.md` is the only active formal-task pointer. Its task, folder, status, implementer, reviewer, and gate are preserved unchanged. The currently recorded Stage A category-live-edit task is `COMPLETE`; its assignment, implementation report, and verification remain in `docs/agent-work/stage-a-category-live-edits/`.

No next feature is activated by this plan. The user authorizes the next bounded task and acceptance gate before implementation. Architecture, performance, documentation, or maintenance work may be authorized between product stages when it reduces measured risk without silently expanding product scope.

## 3. Ordered delivery program

Detailed safe-change, performance, testing, release, and definition-of-done rules live in `docs/maintenance/EVOLUTION_AND_MAINTENANCE_PLAN.md`.

### A. Baseline and protect the current core — next program priority

- Inventory supported category, record, evidence, location, media, publication, account, and public Explore behavior.
- Close verified correctness and usability gaps without redesigning data ownership.
- Establish browser-level teacher authoring/publication and signed-out public regression paths.
- Measure current API/database/worker/frontend/host behavior and prove backup/restore on a production-like environment.

**Gate:** the current core is reproducible, backed up, observable, access-tested, and safe to change. A local rehearsal is not a production recovery test.

### B. Complete research end to end

- Finish protected teacher research authoring with contributors, evidence, rights, media, documents, translations, review, publication, correction, and archive.
- Build the public research list/detail/online-reading experience using rights-aware delivery.
- Reuse owner-module services rather than copying record forms or tables. Research remains separate from geological records and References.

**Gate:** one real research publication completes the author-to-public lifecycle, including denial, correction, archive, and reader checks.

### C. Complete managed organization content

- Provide simple admin authoring for About, mission, publisher/ownership, contact, privacy, and terms.
- Preserve revisions, translations, effective/review dates, media, and publication state.
- Replace hardcoded public claims only after reviewed managed replacements are published.

**Gate:** essential organization information can be safely updated without a code deployment and historical revisions remain recoverable.

### D. Finish approved operational and visitor workflows

- Deliver news, invitation/activation, saved records, search, and maps as separate authorized tasks only where incomplete.
- Prefer PostgreSQL full-text/trigram and public-safe PostGIS capabilities before adding a separate search service.
- Each capability needs real data, permissions, accessible loading/empty/error states, public-safe projection, and no dead controls or mock claims.

**Gate per capability:** the bounded workflow is independently releasable and unfinished behavior remains absent or explicitly disabled.

### E. Decide whether AI is justified

- Document the user problem, reviewed data allowed for retrieval, accuracy/evaluation target, provider retention terms, cost ceiling, and non-AI fallback.
- No implementation follows automatically from this stage.
- If authorized, follow MAP security boundaries and maintenance resource/evaluation requirements: external provider first, permission-filtered cited retrieval, read-only tools, reproducible versions, limits, monitoring, and a global kill switch.

**Gate:** either a justified reversible enhancement with a non-AI path, or a documented decision not to add AI.

### F. Production readiness and launch

- Harden proxy/services, authentication and privileged MFA, secrets, dependencies, privacy, rate/cost limits, accessibility, and responsive critical paths.
- Run realistic load/soak tests, backup/media recovery, monitoring/alert, incident, deployment, smoke, rollback, and clean-server rebuild rehearsals.
- Complete OWASP ASVS Level 2–aligned verification plus threat review for uploads, restricted geography, account recovery, and any enabled AI.
- Run a teacher-led zero-record-to-first-public-record rehearsal on the target topology.

**Gate:** tested recovery objectives, health/alerts, role/access/media/security checks, owner-run operating instructions, and explicit launch sign-off.

## 4. Cross-stage product and release gates

These are delivery summaries; normative behavior remains in `MAP.md`, `DESIGN.md`, and the linked topic documents.

- **Categories:** teacher/admin category and subcategory content management is supported. New branches begin unpublished; used structure is archived rather than hard-deleted; stable identity, descendants, bindings, records, revisions, and public URLs are preserved. Custom record types/templates remain controlled maintenance.
- **Records:** drafts may be unclassified or incomplete. Publication requires allowed active structure, valid pinned template, reviewed English content, applicable evidence and geography checks, approved rights-cleared primary media, and an intentional authorized action. The author may publish a complete scientific record; the actor remains audited.
- **Published corrections:** editing a published record is an explicit audited unpublish-to-draft transition. Public visibility returns only after the corrected draft passes checks and is intentionally republished.
- **Scientific catalog:** the starter categories, type pairings, fields, evidence/location policies, and Kurdish/Arabic labels remain provisional until geology/language review. The authoritative proposal and maintenance workflow live in `docs/scientific-structure-maintenance.md`. Never edit an applied migration.
- **Media:** originals remain private; quarantine, validation, malware scanning, bounded processing, rights, approval, and safe derivative/viewer delivery guard publication. Browser viewing cannot guarantee DRM. Video is not production-ready merely because image/PDF processing passed; it requires an authorized schema/pipeline task with format, duration/size, processing, resource, seeking, rights, rejection, cleanup, recovery, and no-original-delivery gates.
- **Geography:** exact protected geometry never appears in public APIs, search, maps, URLs, page source, media metadata, logs, or AI retrieval. Public output uses approved public geometry or a less precise representation.
- **Translations:** current staff authoring is English-only. Additional locales are reviewed presentations of the same stable entity and need approved terminology, workflow, fallback, accessibility, and RTL behavior before public release.
- **Empty production:** idempotent production initialization may create roles, locales, categories, types, templates, permissions, and other approved configuration while creating zero geological records. Mock/showcase records never enter production bootstrap.
- **Security and privacy:** NestJS is authoritative; private operations deny by default and enforce object-level checks. Public signup cannot select a privileged role. Sessions, CSRF, reauthentication, revocation, safe audit, retention/privacy, dependency, abuse, and incident requirements are release gates appropriate to the capability.
- **Schema and data:** every schema change uses a reviewed forward migration and recovery plan. Incompatible changes use expand → migrate/backfill → verify → contract. No release silently destroys used content or history.
- **Operations:** only the reverse proxy is public. Services are bounded and observable; canonical state is not held in application memory/local disk. Off-server recovery copies, verified restore, health checks, previous application images, migration gating, monitoring, and forward recovery are required before real production content.
- **Critical release:** authorization, schema, media, publication, restricted geography, shared contract, infrastructure, or recovery changes require risk-proportionate tests, rollback/recovery evidence, independent review, and user approval before production release.

## 5. Evidence and authoritative detail

| Subject | Authoritative detail/evidence |
| --- | --- |
| Product, roles, data, lifecycle, security, architecture | `MAP.md` |
| UI/UX, accessibility, responsive and user-visible states | `DESIGN.md` |
| Active task and statuses | `MEMORY.md` |
| Safe changes, performance, tests, release/recovery, done | `docs/maintenance/EVOLUTION_AND_MAINTENANCE_PLAN.md` |
| Scientific catalog, pairings, templates and migrations | `docs/scientific-structure-maintenance.md` |
| Identity and foundation decisions | `docs/architecture/phase-1-decisions.md`, `docs/architecture/phase-2-identity.md` |
| Deployment and recovery procedures | `docs/operations/one-server-runbook.md`, `docs/operations/backup-and-restore.md` |
| Phase 3/4 development rehearsals | `docs/operations/phase3-rehearsal-2026-09-26.md`, `docs/operations/phase4-rehearsal-2026-09-26.md` |
| Formal implementation/review evidence | `docs/agent-work/<task>/` |
| Consolidation mapping and preserved baseline | `docs/maintenance/DOCUMENTATION_COVERAGE.md`, `docs/archive/documentation-consolidation-2026-10-31/` |

## 6. Explicitly deferred or prohibited by default

- General foundation-model training or a GPU/local foundation model on the application server.
- Kubernetes, premature microservices, Redis, a separate vector database, or a separate search service without measured need.
- Client-facing custom-role, custom-template, raw-audit-log, or technical-settings dashboards.
- Automatic news scraping/feeds without source allowlists, rights/provenance review, SSRF-safe fetching, deduplication, and human publication approval.
- AI-controlled authorization, publication, deletion, permission changes, canonical-data mutation, or restricted-data disclosure.
- Showcase/mock scientific data in production bootstrap.
- Speculative commerce or optional features without separate authorization and a complete operational gate.

## 7. Maintaining this plan

1. The user authorizes one bounded task and acceptance gate.
2. Update `MEMORY.md` and create a new task folder only for formal coordinated work.
3. The assignment names the relevant document sections; it does not require a full five-document read by default.
4. Update `PLAN.md` only for delivery order/status, `MAP.md` for approved behavior/architecture, `DESIGN.md` for UI rules, and topic documents for their procedures.
5. Record detailed commands/results in task or operations evidence, not in this roadmap.
6. Mark work `COMPLETE` only when the defined gate passes with truthful evidence; do not activate the next feature automatically.
