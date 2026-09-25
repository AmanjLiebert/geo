# Geo-Kurdistan Delivery Plan

## 1. Purpose

This is the single execution plan for Geo-Kurdistan. The existing Next.js frontend remains the approved visual and interaction baseline; this plan does not authorize a redesign.

The next goal is a secure, maintainable production foundation that teachers can populate and manage even when the geological taxonomy evolves. The production database may begin with approved categories, record types, scientific templates, permissions, and locales while containing zero geological records.

This document is planning only. Backend implementation begins only when it is requested separately.

Current execution status: **Phase 2 identity code is active.** The Phase 1 foundation passes local code checks but still requires its Docker/PostgreSQL/queue/backup/restore rehearsal before production sign-off. Firebase identity exchange, internal three-role authorization, revocable sessions, invitations, account controls, and the visitor account screen now exist at code level; Phase 2 remains incomplete until they pass real-provider and PostgreSQL integration/security tests.

## 2. Decisions already made

| Area | Decision |
| --- | --- |
| Frontend | Preserve the existing Next.js, React, and TypeScript application |
| Backend | NestJS modular monolith |
| Database | PostgreSQL; PostGIS for geographic data |
| Taxonomy | Configurable hierarchical categories stored as managed data |
| Record types | A category may allow multiple record types, each with an appropriate scientific template |
| Variable fields | Versioned templates with stable field identifiers and validated attributes |
| Languages | One scientific record with separate reviewed translations; no duplicate record per language |
| Evidence | Structured references and evidence requirements determined by record type |
| Research | Separate research module that shares platform services with records |
| Publishing | Geological news is a separate managed publishing module with translations, sources, revisions, scheduling, and editorial review |
| Site content | About, ownership/publisher identity, contact, privacy, and terms are managed, translated, revisioned pages rather than hardcoded application text |
| Geography | Exact geometry is protected separately from its public representation |
| Media | Private object storage with ownership, rights, and metadata in PostgreSQL |
| Authentication | Managed identity provider supporting Google and phone sign-in; anonymous browsing remains available |
| Authorization | NestJS is the authority; exactly three fixed role bundles (`visitor`, `teacher`, `admin`), deny by default, with object-level checks |
| Administration | Teachers manage all scientific content. Admins have the same scientific capabilities plus simple operational management. No routine role edits taxonomy, templates, role definitions, or technical settings in the dashboard |
| Visitor accounts | Registered visitors can sign in, sign out, and save or remove geological records from a private watch-later list |
| Protected content | Images and research documents are viewable through controlled online delivery; originals and direct storage URLs remain private and no download action is offered |
| AI | External model API first, behind a provider interface; application-owned RAG and evaluation layer |
| Deployment | One paid compute server initially, running one frontend, one backend, one PostgreSQL database, and one worker behind a reverse proxy; no microservices initially |
| Operations | Off-server backups, external identity, private object storage, and optional CDN/WAF remain separate trust and recovery boundaries even when compute uses one server |
| Security standard | Use OWASP ASVS Level 2 as the production verification baseline, supplemented by threat modelling for restricted geography, uploads, and AI |

Non-negotiable safeguards apply in every phase:

- No writable content endpoint is available before authentication and authorization are enforced.
- No real or irreplaceable content enters an environment until automated backups exist and a restore has been tested.
- Security, authorization, accessibility, observability, and testing are continuous work.
- Every schema change uses a reviewed migration with recovery instructions.
- Production access is least-privilege and separated from development access.
- Public responses never contain restricted geometry, private media locations, drafts, or unpublished translations.
- A build with known critical production dependency vulnerabilities is not deployable.
- Database backups and irreplaceable media copies must leave the application server; a backup stored only on that server is not a recovery copy.
- AI never authorizes, publishes, deletes, or mutates canonical content autonomously.

## 3. Scientific organization model

Category, record type, and template answer different questions:

| Concept | Question answered | Example |
| --- | --- | --- |
| Category | What scientific subject does this belong to? | Fossils |
| Subcategory | Which narrower subject branch? | Invertebrate fossils |
| Record type | What kind of object or evidence is being recorded? | Occurrence, specimen, general reference |
| Template version | Which scientific fields and validation rules apply? | Fossil Occurrence Template v2 |

Rules:

1. A category may have a parent, so the same model supports categories and subcategories.
2. A category may allow multiple record types through an explicit category-to-record-type configuration.
3. Each allowed category/record-type combination selects an active template version.
4. `recordsAllowed` decides whether records may attach directly to a category or must use a descendant.
5. A record stores the category it actually belongs to, its record type, and the template version used to validate it.
6. Draft records may be unclassified. Published records require an active publishable category, allowed record type, valid template version, and required evidence.
7. Teachers and admins choose existing scientific structure while editing; they do not create categories, record types, templates, or fields inside the record form.
8. The normal creation path is: **Add record → category → subcategory when required → record type → generated form**. The system selects the active template automatically.
9. Taxonomy, record types, and templates are centrally prepared and changed only through reviewed, versioned maintenance and database migrations; they are not exposed as ordinary dashboard management.
10. Missing scientific structure is recorded as a request for later reviewed maintenance instead of being invented during data entry.
11. Labels are translatable; identifiers and stable keys are not derived from translated text.
12. Archiving or moving scientific structure must not erase records, revisions, translations, or history.

Example:

```text
Fossils                                      recordsAllowed: false
└── Invertebrate fossils                     recordsAllowed: true
    ├── General Reference                    template: Fossil Reference v1
    ├── Fossil Occurrence                    template: Fossil Occurrence v2
    └── Physical Specimen                    template: Fossil Specimen v1

Geological formations                       recordsAllowed: true
└── Formation Reference                      template: Formation Reference v1
```

Record type is not a substitute for subcategory. Subcategories organize the subject; record types describe the nature of the stored evidence.

## 4. Record and template strategy

Use a hybrid record model:

- Normal columns for shared, searchable facts such as stable identity, status, slug, category, record type, template version, ownership, and timestamps.
- Translation entities for title, summary, description, and other narrative fields.
- Validated structured attributes for category- and record-type-specific facts such as hardness, crystal system, lithology, fossil group, collection number, or preservation type.
- Explicit relations for locations, formations, research, media, evidence, and related records.
- Immutable revisions and audit events for significant changes.

Do not create one table per provisional category. Do not put every possible scientific field into one enormous record table.

### Template change policy

1. A published template version is immutable.
2. Changes begin by cloning the current version into a draft version.
3. Field definitions use stable identifiers; changing a translated label does not change the identifier.
4. Adding an optional field is normally compatible.
5. Adding a required field needs a default, an explicit migration, or manual completion before affected records can adopt the new version.
6. Changing data type or meaning creates a new field and an explicit migration mapping.
7. Removing a used field means deprecating it; historical values remain readable.
8. Existing published records remain pinned to their original template version until deliberately migrated.
9. Template migration provides a dry run showing affected, valid, and invalid records.
10. Migrating and republishing are separate reviewed actions; migration never silently republishes content.

## 5. Multilingual strategy

One geological entity has one stable record identity and any number of translations.

- Initial supported locales are configured data, expected to include English, Arabic, and the confirmed Kurdish locale or locales.
- Use BCP 47 language tags and store source language explicitly.
- Record, category, record-type, field-label, relationship-label, and research translations are separate from scientific identifiers.
- Each translation has its own draft, review, and publication status, translator, reviewer, and timestamps.
- Scientific values, measurements, coordinates, references, media, and relationships are shared rather than copied between languages.
- Public routes use a documented fallback policy and never present an unreviewed translation as approved.
- Layouts support right-to-left and left-to-right content, including mixed-script scientific text.

## 6. Evidence and publication policy

References are structured sources. Evidence links explain which claim, field, occurrence, specimen, or interpretation a source supports.

A reference may contain authors, title, publication or institution, year, identifier such as DOI or catalogue number, pages or figure, URL or document, source type, rights, verification status, and reviewer notes.

Minimum evidence is configured by record type:

- General reference: at least one traceable scientific or institutional source.
- Occurrence: observer, observation date, protected location information, field notes or image evidence, and reviewer/source attribution.
- Physical specimen: institution or collection, catalogue number when available, collector/provenance, locality policy, scale image, and identification authority.
- Formation or formal unit: authoritative stratigraphic source and review of name, rank, age, and geographic use.
- Map-derived claim: map source, edition/date, scale or resolution, coordinate reference system, and rights.

Publication validation must report missing evidence clearly. High-impact or disputed claims may require an independent reviewer rather than approval by the author.

## 7. Research and geographical policy

### Research

Research publications remain separate from geological records and ordinary references.

- An external work used only as a citation may exist as a reference.
- A work with its own page, authors, abstract, document, reader, translations, rights, or relationships is a research publication.
- A reference may point to a managed research publication.
- Research shares translations, media, revisions, review, publication, references, relationships, and permissions with the rest of the platform.
- Research remains a module inside the NestJS monolith, not a separate service.

### Online-only media and research access

- Original images and research documents remain private in object storage; public pages never expose permanent storage keys or direct original-file URLs.
- The application provides an online image/document viewer using public-safe derivatives, page images/tiles, or short-lived authorized delivery as appropriate.
- Viewer responses use short-lived access, inline disposition, strict caching rules, rate limits, and rights checks. The interface does not provide a download button or bulk-export action.
- Teachers and admins upload and manage files through protected workflows, but routine roles receive no unrestricted original-file export capability.
- Resized or watermarked public image derivatives may be used when rights policy requires them.
- This policy deters ordinary downloading and prevents accidental original-file exposure; it cannot guarantee prevention of screenshots or copying content already rendered on a user's device.

### Geography

- Exact geometry is protected data and is never exposed merely because a public map exists.
- Every place or record location has a visibility level: `PUBLIC`, `APPROXIMATE`, `RESTRICTED`, or `EMBARGOED`.
- Public geometry is stored or generated separately as a generalized point, area, region-only label, or hidden representation.
- Sensitivity reason, authorized role or user access, public precision, owner, and embargo date are recorded.
- Geological map layers store source, licence, format, coordinate reference system, scale/resolution, geographic extent, version/date, and visibility.
- Access to restricted geometry is authorized and audited.

## 8. Empty production initialization

The system must support a useful but scientifically empty production database.

Production initialization creates only configuration and approved structure:

- The three fixed role bundles: `visitor`, `teacher`, and `admin`.
- Supported locales and workflow statuses.
- Categories and subcategories.
- Record types and allowed category/record-type combinations.
- Versioned scientific templates and field definitions.
- Relationship, reference, evidence, and geographic visibility types.
- One controlled initial admin account or invitation.

Initial production counts may be:

```text
Geological records:       0
Research publications:   0
Uploaded media:           0
Public locations:         0
Saved records:            0
```

Rules:

- Production seeds are idempotent and contain no mock geological records.
- Test fixtures and the existing frontend mock data remain isolated from production seeds.
- Teachers populate real data through the protected dashboard.
- Public pages and dashboard lists treat zero records as a normal state with clear empty-state guidance.
- Counts are calculated from real data, including zero; they are not hardcoded.

## 9. Production deployment and operations

The first production release targets one paid Linux compute server without coupling the application permanently to one machine.

```text
Internet
   │
CDN / basic WAF / DDoS filtering
   │
HTTPS reverse proxy
   ├── Next.js frontend
   └── NestJS API
          ├── PostgreSQL + PostGIS
          └── Background worker
                  ├── media/document processing
                  ├── scheduled publication
                  └── later AI ingestion

External trust and recovery boundaries
├── managed identity provider
├── private object storage
├── encrypted off-server database/media backups
└── external AI provider, only when enabled
```

Rules:

1. Only the reverse proxy exposes public HTTP ports. PostgreSQL, the API's internal port, and worker controls remain on a private host network.
2. Frontend, API, worker, and database run as separate non-root processes or containers with independent health checks and resource limits.
3. Production uses TLS, strict request/body limits, trusted-proxy configuration, security headers, and rate limits at both edge and application layers.
4. Secrets are injected at deployment time, never built into frontend bundles, container images, logs, or the repository.
5. Public pages and immutable assets may be cached. Dashboard, user-specific, draft, and restricted-location responses are private and non-cacheable.
6. Application instances remain stateless: sessions, uploads, jobs, and canonical data do not depend on local process memory or an application's writable filesystem.
7. Use a PostgreSQL-backed durable job queue initially to avoid requiring Redis on the first server. Jobs are idempotent, bounded, observable, and safe to retry.
8. Define and approve recovery point and recovery time objectives before real content is accepted.
9. The single server is an accepted availability risk, not high availability. Recovery depends on tested off-server backups and a documented rebuild procedure.
10. Scaling begins with measurement, database indexes, connection pooling, bounded pagination, caching, and vertical capacity. Move the database, worker, or stateless application instances only after measured need.
11. Production deployment supports atomic release, health verification, database migration gating, and rollback to the previous application version without rolling back committed data migrations blindly.

Paying for one compute server does not make external SMS, object storage, off-server backup, domain, email, monitoring, or AI API usage free. Those operating costs must be estimated and capped before enabling the related feature.

## 10. Security, privacy, and abuse baseline

- Treat OWASP ASVS Level 2 as the minimum production verification checklist and maintain a small threat model for public browsing, staff administration, uploads, exact geography, identity recovery, and AI.
- Visitor registration is allowed only after its verification, recovery, privacy, and abuse controls are ready. Teacher and admin accounts use controlled invitations or explicit admin promotion; public signup can never select a privileged role.
- Privileged accounts require multi-factor authentication when the chosen provider supports it, short-lived privileged sessions, reauthentication for high-risk actions, revocation, and recovery procedures.
- If browser authentication uses cookies, they are `Secure`, `HttpOnly`, appropriately `SameSite`, rotated after authentication, and protected against CSRF.
- Every resource lookup performs object-level permission and visibility checks. Knowing or changing an identifier must never bypass authorization.
- Rich text is sanitized with an allowlist. External URLs are validated against SSRF and unsafe-scheme rules before the server fetches anything.
- Uploads use allowlisted types, signature/magic-byte verification, size and expansion limits, generated storage keys, quarantine, safe processing, rights metadata, and malware scanning where practical.
- Authentication, failed authorization, privileged actions, restricted-location access, publication, migration, exports, and configuration changes produce safe audit events. Tokens, secrets, exact restricted coordinates, and unnecessary personal data are never written to logs.
- Define personal-data inventory, retention, export, correction, account disablement/deletion, legal ownership, privacy notice, and incident-response responsibilities before public accounts launch.
- Dependency and container-image scanning run in continuous integration. Critical production vulnerabilities block deployment until fixed or explicitly risk-accepted with a documented temporary mitigation.
- Rate limits are action-aware: login, OTP, registration, watch-list changes, search, uploads, protected viewing, publication, and AI receive separate limits, budgets, and abuse alerts.

## 11. News, managed pages, and ownership information

Geological news is editorial content, not a geological record or research publication. About and ownership information are managed site content, not hardcoded scientific data.

`publishing` owns:

- News articles, translations, authorship, topics/tags, source links, cover media, revisions, scheduling, review, publication, expiry, and archive state.
- Admin-only capabilities for creating, reviewing, scheduling, publishing, and archiving news.
- Manual, reviewed authoring at launch. Automated feeds, scraping, or AI-assisted ingestion remain disabled until source allowlists, rights review, SSRF protection, deduplication, provenance, and editorial approval exist.

`site-content` owns:

- Revisioned and translated managed pages such as About Geo-Kurdistan, mission, contact, privacy, and terms.
- The organization/publisher profile: stable legal and display names, ownership statement, logo/media, contact channels, address when appropriate, and social links.
- SEO metadata and publication state without exposing global security configuration.

Both modules reuse translations, media, revisions, audit, review, publication, and permissions. They do not reuse geological templates merely to avoid creating the correct content model.

## 12. AI and RAG operational policy

- Use an external model API first. Do not run a foundation model on the application/database server.
- AI is optional and removable through provider configuration and a global kill switch; the rest of the platform works when the provider is unavailable.
- Version providers, models, prompts, embedding models, chunking rules, evaluations, and ingestion runs so results can be reproduced and safely re-indexed.
- Ingest only approved, appropriately licensed, provenance-tracked content. Hash and scan documents; treat uploaded or imported text as untrusted data that may contain indirect prompt injection.
- Apply permission, publication, locale, rights, and geographic visibility filters before retrieval, not after generation.
- AI receives read-only, least-privilege tools. Model output never becomes authorization and cannot directly publish, delete, change permissions, reveal restricted geometry, or mutate canonical records.
- Require accessible citations, sanitize rendered output, and fail with an evidence-limited response when reliable sources are insufficient.
- Set per-user and global request, token, concurrency, retry, and monetary budgets. Record cost, latency, provider errors, safety signals, and evaluation outcomes without logging unnecessary personal or restricted data.
- Content archival, rights withdrawal, permission changes, and deletion trigger traceable removal or re-indexing of affected chunks and embeddings.
- Release requires adversarial tests for direct and indirect prompt injection, poisoned documents, cross-user leakage, citation mismatch, multilingual quality, denial-of-wallet, and provider failure.

## 13. Delivery dependencies

```text
Phase 0  Planning agreement
   ↓
Phase 1  Backend and database foundation
   ↓
Phase 2  Identity, three roles, and secure sessions
   ↓
Phase 3  Taxonomy, record types, templates, translations, records, saved records, revisions
   ↓
Phase 4  Evidence, geography, media, research, publishing, site content, publication
   ↓
Phase 5  Protected administration dashboard
   ↓
Phase 6  Public frontend API migration
   ├────────────► Phase 7  Search and discovery
   └────────────► Phase 8  AI and RAG, after reviewed content exists
All required phases ─────► Phase 9  Production launch readiness
```

Later phases may be designed early, but implementation must not bypass their dependencies.

## 14. Delivery phases

### Phase 0 — Planning agreement

Tasks:

- Keep the existing frontend and design system as the baseline.
- Record the agreed scientific, permission, translation, evidence, research, geographic, and empty-database rules.
- Record the single-server deployment, recovery, security, publishing, site-content, and AI operating boundaries.
- Patch known critical production dependencies and establish a clean production dependency-audit baseline.
- Ensure `PLAN.md`, `MAP.md`, and `DESIGN.md` agree before implementation.

Completion gate:

- All agreed planning decisions are explicit and have an owning module and delivery phase.
- The existing frontend has no known critical production dependency vulnerability.
- No backend implementation has begun as part of this planning change.

### Phase 1 — Backend and database foundation

Tasks:

- Create the NestJS application in `backend/` only after implementation is separately authorized.
- Add environment validation, structured logging, request validation, error handling, health endpoints, API versioning, and OpenAPI.
- Connect PostgreSQL through one selected data-access tool.
- Validate the selected data-access tool against PostGIS, JSONB structured attributes, transactions, migrations, and connection pooling before committing to it.
- Establish forward-only migrations, idempotent seed support, and separate development/test configuration.
- Define the one-server Linux service topology: reverse proxy, private network, non-root frontend/API/database/worker processes, persistent volumes, health checks, and resource limits.
- Select a PostgreSQL-backed durable job queue and prove idempotent retry with one foundation job before adding another broker.
- Add secret injection, trusted-proxy handling, request/body limits, dependency scanning, and an atomic deployment/rollback procedure.
- Establish automated tests and continuous build, lint, migration, and test checks.
- Define recovery point/recovery time objectives and the off-server backup, restore, and server-rebuild process before any environment receives valuable real content.

Completion gate:

- A clean environment can start the reverse proxy, frontend, API, database, and worker from documented instructions while exposing only intended public ports.
- Health checks, a migration, configuration-only seed, durable job retry, tests, dependency audit, and API documentation work.
- A database backup leaves the server and is restored into a clean environment successfully.
- No production secret or mock geological record exists in the production seed.

### Phase 2 — Identity, three-role authorization, and visitor accounts

Implementation status: Firebase Authentication is selected for Google/phone identity proof. NestJS owns internal users, fixed role bundles, invitations, opaque PostgreSQL sessions, CSRF, recent-auth enforcement, and audit events. The static frontend has an account route for Google/phone verification. Provider configuration and full database/browser authorization rehearsal remain pending.

Tasks:

- Select a managed identity provider supporting Google and phone verification.
- Verify provider tokens in NestJS and link external identities to internal users.
- Support visitor registration, verification, sign-in, sign-out, recovery, and account disablement only after the associated privacy and abuse controls are complete.
- Create teacher and admin identities through controlled invitations or explicit admin promotion. Public registration always creates a visitor.
- Implement exactly three fixed role bundles. Do not build a client-facing custom permission or role editor.
- Install a global deny-by-default authorization guard; mark public endpoints explicitly.
- Add initial-admin setup, privileged-account MFA where supported, high-risk reauthentication, secure session handling, CSRF protection when cookie-based, session revocation, action-aware rate limiting, security headers, and authorization tests.
- Add automatic audit events for identity and role changes; retain them for security and recovery without exposing a complex audit-log dashboard.

Initial roles:

- `visitor` — browses published content and, when signed in, saves or removes geological records from a private watch-later list.
- `teacher` — has visitor capabilities and can create, edit, translate, validate, review, publish, archive, and restore geological records and research, including their evidence, locations, relationships, and media.
- `admin` — has every teacher capability plus simple operational management for teacher/visitor accounts, news, managed site pages and organization information, and an optional future shop.

Anonymous browsing is public access, not a fourth role. Taxonomy, record types, templates, role definitions, raw audit logs, and technical security settings are not routine dashboard capabilities for any of the three roles.

Completion gate:

- Every non-public endpoint has tested allow and deny cases.
- Object-level authorization tests prevent identifier changes from exposing another user's private saved list, drafts, restricted locations, or protected files.
- Visitor signup cannot assign or escalate to teacher or admin.
- The three role bundles are seeded and tested; no client-facing permission editor exists.
- No writable content endpoint exists without authenticated role and object-level authorization checks.

### Phase 3 — Configurable scientific content foundation

Build these modules:

1. `taxonomy` — centrally maintained categories, hierarchy, translations, ordering, and structure requests.
2. `record-types` — type definitions and category/type allowances.
3. `templates` — immutable versions, stable field definitions, translations, validation, deprecation, and migration previews.
4. `records` — shared fields, structured attributes, translations, ownership, and draft lifecycle.
5. `revisions` — immutable content snapshots and restoration metadata.
6. `audit` — important scientific and administrative actions.

Tasks:

- Implement the zero-record production initialization described above.
- Permit teachers and admins to create unclassified or classified drafts using the approved structure.
- After the record entity exists, add the private saved-record/watch-later relation with a unique user/record pair and no effect on the geological record itself.
- Keep publication disabled until Phase 4 evidence and location policies are enforceable.

Completion gate:

- The system can initialize categories, record types, and active templates with zero geological records.
- An authorized teacher can create, translate, validate, revise, and archive a draft without bypassing permissions.
- Template upgrades can be previewed without changing existing published or draft values.

### Phase 4 — Evidence, geography, media, research, publishing, site content, and publication

Tasks:

- Add structured references and claim/field-level evidence links.
- Configure minimum evidence policies by record type.
- Add exact and public geographic representations, visibility policy, PostGIS geometry, and map-layer metadata.
- Add private uploads using signed operations, allowlisted types, magic-byte verification, strict file/expansion limits, generated storage keys, quarantine, safe processing, rights, ownership, and processing status.
- Add typed record-to-record and record-to-research relationships.
- Add the research publication, document, author/contributor, translation, rights, and dashboard APIs.
- Add geological news with translations, sources, authorship, tags, revisions, scheduling, review, publication, expiry, and archive state.
- Add managed About, ownership/publisher, contact, privacy, and terms pages plus an organization profile.
- Add background jobs for image processing, document extraction, and safe retry/cleanup.
- Enable review and publication only after all permission, translation, evidence, media, and geographic checks pass.

Completion gate:

- A record can be published without exposing restricted data and with evidence appropriate to its record type.
- A managed research publication can be linked as content and cited as evidence.
- Admins can publish reviewed news and managed pages without receiving taxonomy or global-security configuration interfaces.
- Failed jobs retry without duplicating results.

### Phase 5 — Protected administration dashboard

Build in this order:

1. Sign-in and protected dashboard shell.
2. Role-appropriate record, research, news, and managed-page lists with real empty states.
3. One obvious **Add record** flow: category → subcategory when required → record type → generated template form.
4. Translation workspace with locale-specific review status.
5. Evidence, references, location visibility, media, and relationship editors.
6. Review, publication, archive, record history, and restore flows; template migration remains a controlled maintenance operation rather than a routine client screen.
7. News, scheduled publication, managed pages, and organization-profile editors.
8. A simple admin account screen for inviting teachers, activating or disabling users, and assigning only `visitor`, `teacher`, or `admin` through protected actions.
9. Admin-only news, managed-page, organization-profile, and optional future shop navigation, kept separate from the teacher's scientific workflow.

Dashboard rules:

- Never place unrestricted category creation inside the record form.
- Do not display templates, schema versions, role definitions, audit logs, or technical settings unless a specific recovery or maintenance task requires them outside the routine client dashboard.
- Warn before leaving unsaved work; autosave only drafts and show save state.
- Use archive/restore for business content; avoid permanent deletion in normal workflows.
- Display validation and missing evidence beside the relevant field and in a page summary.
- Show teachers the generated scientific fields and plain-language validation; do not make them choose or understand template versions.

Completion gate:

- Teachers can populate an initially empty collection without direct database access.
- Teachers and admins can complete the same simple scientific record workflow without changing scientific structure.
- Admins can perform the agreed operational tasks without a complex system-administration area.
- Taxonomy and template maintenance remains versioned, tested, auditable, and outside routine dashboard use.
- News and ownership/site pages follow review, revision, translation, and publication permissions rather than bypassing them as static text.

### Phase 6 — Connect the public frontend

Tasks:

- Preserve the established public design and working page components.
- Remove static-export-only assumptions when dynamic production behavior begins.
- Generate a typed API client from the backend contract or maintain an equivalently checked boundary.
- Replace local repository implementations route by route.
- Connect public news, About, ownership/publisher, contact, privacy, and terms routes to published managed content.
- Connect visitor registration, sign-in, sign-out, and the private saved-record/watch-later page.
- Add online-only image and research viewers with no download controls, private originals, protected delivery, and clear access/rights states.
- Add zero-record, zero-location, untranslated, loading, unavailable, and error states.
- Implement locale routing, direction changes, translation fallback, and server-side cache/revalidation.
- Define cache keys and invalidation for locale, publication revision, and public visibility; never publicly cache dashboard, user-specific, draft, or restricted-location responses.
- Ensure public location responses use only authorized public geometry.
- Preserve SEO metadata, accessibility, responsiveness, and the existing visual system.

Completion gate:

- Public pages read only published, authorized API data.
- News and managed pages expose only published revisions and verified public media/source links.
- A signed-in visitor can privately save and remove a published record, and cannot read another user's saved list.
- Images and research documents open in the controlled online viewer without exposing original storage URLs or a download action.
- An empty collection renders correctly without fake records or failures.
- Drafts, restricted coordinates, private media, and unpublished translations cannot be reached publicly.
- Frontend tests, lint, and production build pass.

### Phase 7 — Search and discovery

Tasks:

- Start with PostgreSQL full-text and trigram search.
- Search shared scientific values and only published translations available to the requested locale/fallback policy.
- Add filters from active templates and explicit relations.
- Add geographic search using public PostGIS geometry only.
- Measure query performance and add indexes based on real queries.
- Introduce a separate search service only if measured requirements exceed PostgreSQL.

Completion gate:

- Search returns only authorized published content, respects languages and location visibility, and meets measured performance targets.

### Phase 8 — AI and RAG

Do not begin until enough reviewed content, references, translations, and evaluation examples exist.

Tasks:

- Define an AI provider interface for generation, streaming, and embeddings.
- Ingest only approved, versioned records and appropriately licensed research documents.
- Store canonical documents, checksums, chunks, language, permissions, rights, source links, ingestion version, and deletion/re-index state in the application.
- Use pgvector initially for embeddings.
- Combine structured database tools with document retrieval.
- Enforce content, locale, geographic, and user permissions before retrieval.
- Require citations and build a geology-expert evaluation set before release.
- Log quality and safety signals without automatically training on user conversations.
- Add provider/model/prompt/embedding versioning, per-user and global cost/token/concurrency limits, timeouts, bounded retries, outage fallback, and a global kill switch.
- Scan and quarantine untrusted documents, separate instructions from retrieved content, sanitize model output, and test prompt injection, poisoned retrieval, cross-user leakage, denial-of-wallet, and unsafe tool requests.
- Keep AI tools read-only and least-privilege; AI cannot publish, delete, change permissions, or reveal restricted geometry.

Completion gate:

- Answers are evaluated, cite accessible evidence, respect all permissions, and fail safely when evidence is insufficient.
- Archival, rights withdrawal, permission changes, and deletion remove or re-index affected chunks and embeddings predictably.
- AI remains unavailable without degrading core public browsing or editorial workflows.

### Phase 9 — Production readiness

Tasks:

- Automated encrypted database backups and point-in-time recovery.
- Object-storage versioning and a second recovery copy.
- Documented recovery objectives, off-server server-rebuild instructions, and monthly restore tests.
- Hardened Linux host, key-only restricted administration, firewall/private service network, non-root processes, TLS reverse proxy, security headers, request limits, and operating-system patch procedure.
- Monitoring, alerts, error tracking, performance budgets, and incident procedures.
- OWASP ASVS Level 2 verification plus dependency, secret, session, CSRF, SSRF, upload, authorization, privacy, caching, and geographic-disclosure security reviews.
- Capacity and abuse tests for public reads, search, login/OTP, uploads, publication, exports, worker backpressure, and AI budgets where enabled.
- Staging deployment, zero-record initialization rehearsal, content-import rehearsal, and launch checklist.

Completion gate:

- A restore rehearsal succeeds.
- A complete rebuild on a clean server from versioned configuration and off-server backups succeeds within the approved recovery objective.
- Zero-record initialization and teacher-led first-record creation succeed in staging.
- Critical alerts reach an owner.
- Security, privacy, accessibility, performance, and content checks pass.

## 15. Work intentionally delayed

- Training a foundation model.
- Microservices or Kubernetes.
- A separate vector database before pgvector is measured.
- Redis before a measured workload requires it; the initial durable queue uses PostgreSQL.
- Complex commerce, payments, premium accounts, or orders.
- Visitor self-registration before verification, recovery, privacy, rate-limit, and abuse controls exist.
- Client-facing taxonomy, template, custom-role, raw-audit-log, or technical-settings dashboards.
- Automated news scraping or feed ingestion before source rights, allowlists, SSRF protection, deduplication, provenance, and editorial review exist.
- Allowing AI to publish or mutate administrative data autonomously.
- Permanent category-specific code when configuration and templates are sufficient.
- Importing showcase mock records into the production database.

## 16. Next authorized work

Complete the Phase 1 operational rehearsal and Phase 2 identity integration/security gate:

1. Run both migrations and the configuration/role seed against PostgreSQL/PostGIS.
2. Configure Firebase Google and phone providers, authorized domains, quotas, and the backend service account.
3. Create and accept the one-time initial-admin invitation.
4. Exercise visitor signup, invitation matching, sign-in/out, reauthentication, session revocation, role/status changes, CSRF denial, and allow/deny cases against the real API.
5. Run the complete Compose topology, durable job proof, encrypted off-server backup, and clean restore rehearsal.

Do not start Phase 3 scientific content endpoints or dashboard record forms until these gates pass.
