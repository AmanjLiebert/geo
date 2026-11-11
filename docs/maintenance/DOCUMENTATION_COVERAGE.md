# Documentation consolidation coverage

This ledger records the documentation-only consolidation performed on 2026-10-31. It is an audit aid, not a second product specification. Current authority remains with the destination documents below.

## Preserved baseline

Exact pre-consolidation copies are stored in `docs/archive/documentation-consolidation-2026-10-31/`. The archive contains the five root documents plus every linked document changed by the consolidation. `MEMORY.md` and its task/status history were not edited.

No application code, schema, runtime configuration, task evidence, operations rehearsal, or production data is changed by this consolidation.

## Ownership after consolidation

| Requirement family | Authoritative destination |
| --- | --- |
| Agent roles, risk classification, safety and efficient execution | `AGENTS.md` |
| Active formal task and status vocabulary | `MEMORY.md` |
| Current delivery order, status, priorities and gates | `PLAN.md` |
| Product concepts, roles, data, lifecycle, security and architecture | `MAP.md` |
| Visual language, interaction, accessibility, responsive and user-visible states | `DESIGN.md` |
| Assignment/report/review file contract | `docs/agent-work/README.md` |
| Safe-change contract, performance, testing, release/recovery flow and definition of done | `docs/maintenance/EVOLUTION_AND_MAINTENANCE_PLAN.md` |
| Provisional scientific catalog, pairings, templates and controlled migrations | `docs/scientific-structure-maintenance.md` |
| Exact deployment, backup and restore procedures | `docs/operations/` runbooks |
| Implemented foundation and identity decisions | `docs/architecture/` decision records |
| Historical implementation and verification evidence | immutable `docs/agent-work/<task>/` folders and operations rehearsals |

## Relocation and removal matrix

| Pre-consolidation source | Requirement or content | Current authoritative location | Treatment and proof of coverage |
| --- | --- | --- | --- |
| `AGENTS.md` §1, §3, §4, §8, §9 | Agent responsibilities, task risk, review, checks and reporting | `AGENTS.md` | Retained and compacted; status names now link to and match `MEMORY.md` |
| `AGENTS.md` §2 | Root source-of-truth roles | `AGENTS.md` authority section | Retained with topic-document routing and section-specific reads |
| `AGENTS.md` §5–§7 | Architecture, product, security and UI summaries | `MAP.md`, `DESIGN.md`; short safety boundary remains in `AGENTS.md` | Detailed duplicates removed only where the destination already contains the normative rule |
| `PLAN.md` “Active evolution and maintenance program” | Ordered remaining work and gates | `PLAN.md` §3; maintenance plan §3 | Current order retained in PLAN; safe execution outcomes remain in maintenance policy |
| `PLAN.md` “Active delivery change” | Category-to-public sequence and completion status | `PLAN.md` §1–§2 and §4; `docs/agent-work/phase-*`, `stage-a-category-live-edits/` | Current behavior/gates retained; completed task narrative remains in immutable task evidence and baseline archive |
| `PLAN.md` §1–§2 | Purpose and major product decisions | `PLAN.md` §1–§4; `MAP.md` | Status/gates retained in PLAN; stable behavior/architecture remains in MAP |
| `PLAN.md` §3 | Category/type/template model | `MAP.md` §§4, 7, 8; `docs/scientific-structure-maintenance.md` | Conceptual invariants already existed in MAP; detailed catalog and pairings copied to scientific maintenance before removal from PLAN |
| `PLAN.md` starter taxonomy table and sources | Seventeen subcategories, allowed types, characteristic evidence and source caveat | `docs/scientific-structure-maintenance.md` “Provisional starter catalog and pairings” | Relocated in full, including provisional status, source links, zero-record validity and approval gate |
| `PLAN.md` §4 | Record/template strategy and version lifecycle | `MAP.md` §§4, 7, 8; scientific maintenance workflow | Retained: stable keys, pinned versions, immutable published templates, migration preview, archive/no-hard-delete |
| `PLAN.md` §5 | Translation model and English-first status | `MAP.md` §9; `DESIGN.md` multilingual section; `PLAN.md` §4 gate | Data/lifecycle, presentation, and delivery status remain separately authoritative |
| `PLAN.md` §6 | Evidence and publication | `MAP.md` §10; `PLAN.md` §4 gates | Normative evidence/publication checks remain in MAP; release summary retained in PLAN |
| `PLAN.md` §7 | Research, controlled media delivery and geography | `MAP.md` §§12–13; `DESIGN.md`; `PLAN.md` §§3–4 | Product/security rules remain in MAP; user-visible behavior remains in DESIGN; incomplete status remains in PLAN |
| `PLAN.md` video production gate | Video formats, limits, processing, resources, seeking, rights, cleanup and original-file restrictions | `PLAN.md` §4 media gate plus MAP media boundaries | Retained explicitly because image/PDF completion does not prove video readiness |
| `PLAN.md` §8 | Empty production initialization | `MAP.md` §14; `PLAN.md` §4 | Idempotent configuration-only initialization and zero-record behavior retained |
| `PLAN.md` §9 | Deployment topology and operational rules | `MAP.md` §3; maintenance plan §§4, 7; operations runbooks; `PLAN.md` §4/F gate | Architecture, resource/release policy, exact procedure and delivery status each have one owner |
| `PLAN.md` §10 | Security, privacy and abuse baseline | `MAP.md` §5 and security boundary; identity decision; maintenance test gates; `PLAN.md` §4 | Normative boundary and release gate retained; no security control discarded |
| `PLAN.md` §11 | News, site content and organization ownership | `MAP.md` publishing/site-content sections; `PLAN.md` Stage C/D | Ownership and lifecycle remain in MAP; remaining work/order remains in PLAN |
| `PLAN.md` §12 | AI/RAG policy | `MAP.md` AI boundaries; maintenance plan Stage E/resource policy; `DESIGN.md` AI states; `PLAN.md` Stage E | Canonical security, evaluation/resource, UI and activation responsibilities separated without removing safeguards |
| `PLAN.md` §§13–14 | Old phase dependency diagram and phase narratives | `PLAN.md` §3 current program; task/operations evidence; baseline archive | Current dependencies/gates retained; completed transcripts archived because they are historical evidence, not active requirements |
| `PLAN.md` §15 | Intentionally delayed work | `PLAN.md` §6 | Retained and clarified |
| `PLAN.md` §16 | Next work, proof IDs and completion transcripts | `PLAN.md` §§1–3; immutable task/operations evidence; baseline archive | Current status retained; detailed historical commands/counts remain in their evidence sources and exact archive |
| `MAP.md` approved-change preamble | Category drafts, archive/restore and public source | `MAP.md` current category-management section and canonical lifecycle/permissions | Merged; stale “later” wording removed after source verification |
| `MAP.md` permission table | Category management vs controlled type/template maintenance | `MAP.md` §5 | Contradiction resolved: teacher/admin category/subcategory management is allowed; custom types/templates/migrations are not routine UI |
| `MAP.md` record lifecycle | Public visibility during correction | `MAP.md` §§10–11 | Contradiction resolved to implemented audited unpublish-to-draft behavior; history remains preserved |
| `MAP.md` repository map | Static current tree and “future backend” wording | `README.md`, repository, compact MAP navigation section | Stale tree removed; current applications and ownership retained |
| `DESIGN.md` approved-change preamble | Category management and public Explore state | `DESIGN.md` current experience section | Updated from future to current behavior; all visual/accessibility requirements remain |
| Maintenance plan “40%” | Progress estimate | `PLAN.md` concrete current-status list | Removed as unstable; capability-based status retained |
| Maintenance plan mandatory five-file read | Agent context-loading rule | `AGENTS.md`; maintenance operating model; active assignment | Replaced by assignment-specific section reads without weakening critical review scope |
| `README.md` phase/local-data statements | Repository entry-point status | `README.md` | Updated to current NestJS/public API implementation; unfinished routes remain qualified |

## Contradiction resolutions

1. `IMPLEMENTED_AWAITING_REVIEW` is the only pending-review status; `PENDING_REVIEW` is retired from active instructions.
2. Teachers/admins manage category/subcategory content; custom record types, templates, field definitions, stable-key corrections, and schema migrations remain controlled maintenance.
3. Editing a published record uses the implemented explicit audited unpublish-to-draft transition and temporarily removes public visibility.
4. Public Explore currently reads published database content through public-safe APIs.
5. Future critical tasks require distinct implementer and reviewer. Existing completed task records are not rewritten to imply independence that did not occur.

## Removal rule

A requirement may be removed from an active document only when this ledger identifies its authoritative destination or demonstrates that it was stale historical/status text. The dated archive is recovery evidence, not an active source of product truth.
