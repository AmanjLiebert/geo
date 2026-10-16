# Geo-Kurdistan Delivery Plan

## Active delivery change — category-to-public-content sequence

The client approved dashboard management of categories and subcategories for both teachers and admins. This section supersedes earlier statements in this document that routine users cannot manage taxonomy. Existing seeded categories and all records remain intact. Record-type and scientific-field-template editing is still deferred; new branches use a shared General geological record type. Implement one numbered step, verify its gate, and stop before the next step:

1. **Create:** protected creation of unpublished categories/subcategories with English title, summary, description, optional private image, and parent; automatic General geological record pairing. Gate: teacher/admin create and list, visitor denied, existing structure unchanged.
2. **Edit:** draft revisions of content, image, and order with stable identity and safe hierarchy checks. Gate: public content does not change before publication.
3. **Archive/restore:** confirmed subtree archive, never hard delete; preserve records and history and hide archived branches publicly. Gate: populated and empty branches recover safely.
4. **Record entry:** general record form with details, evidence, protected location, relationships, and media under new branches. Gate: drafts reopen and specialist types remain available.
5. **Review/publish:** complete simple dashboard publication actions without bypassing independent review, evidence, media, or location policy. Saving incomplete drafts remains possible. A complete item stays unpublished until a teacher or admin explicitly publishes it; they can later unpublish it without erasing the work. Categories require an English title, summary, description, and approved rights-cleared image; records require their core English details, an approved rights-cleared image, and the evidence, location, and review checks applicable to their type. Gate: only complete, intentionally published content can become public.
6. **Real Explore:** replace mock geological collections/records in Explore and its detail pages with minimal published API projections; run Next.js dynamically on the existing server for new routes without rebuild. Gate: publish/edit/archive and empty states are reflected correctly.
7. **End-to-end handoff:** role, security, responsive, direct-link, archive/restore, and empty-state checks; remove misleading showcase claims on converted pages.

Phase 5 dashboard work remains active. Steps 1–4 passed their creation, draft-editing, archive/restore, record-entry, authorization, and preservation gates. Step 5A — category readiness and publication — is next; record review/publication follows as a separate focused task. Later steps require their own completion checks. “Visitor posts” means published geological records, not news or visitor submissions. New category creation supports two hierarchy levels initially. Existing records are not removed or silently reclassified.

## 1. Purpose

This is the single execution plan for Geo-Kurdistan. The existing Next.js frontend remains the approved visual and interaction baseline; this plan does not authorize a redesign.

The next goal is a secure, maintainable production foundation that teachers can populate and manage even when the geological taxonomy evolves. The production database may begin with approved categories, record types, scientific templates, permissions, and locales while containing zero geological records.

This document governs both planning and separately authorized implementation. Each phase advances only after its completion evidence is recorded.

Current execution status: **The Phase 1 foundation, Phase 2 identity, Phase 3 configurable scientific-content, and Phase 4 evidence/publishing/media gates passed their development rehearsals by 2026-09-28. Phase 5 — the protected administration dashboard — is now the active authorized implementation phase.** The Phase 4 live proofs cover policy enforcement, geographic privacy, independent review, approved-media publication, a separate private primary-media bucket, signed upload, metadata and magic-byte checks, ClamAV scanning, image and PDF derivatives, failed-job recovery, duplicate-job idempotency, rejected-object deletion, abandoned-upload expiry, short-lived inline viewing, and cleanup without retained mock content or test objects. Public visitor delivery remains a Phase 6 integration concern. Production-server rebuild, production domain and quota configuration, external monitoring, and the final privileged-account MFA decision remain launch requirements.

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
| Administration | Teachers and admins manage categories/subcategories and scientific content. Admins additionally manage simple operations. Neither routine role edits custom templates, role definitions, or technical settings in the dashboard |
| Visitor accounts | Registered visitors can sign in, sign out, and save or remove geological records from a private watch-later list |
| Protected content | Images, videos, and research documents are viewable through controlled online delivery; originals and direct storage URLs remain private and no download or bulk-export action is offered |
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
| Record type | What kind of object or evidence is being recorded? | Unit profile, occurrence, specimen |
| Template version | Which scientific fields and validation rules apply? | Fossil Occurrence Template v2 |

Rules:

1. A category may have a parent, so the same model supports categories and subcategories.
2. A category may allow multiple record types through an explicit category-to-record-type configuration.
3. Each allowed category/record-type combination selects an active template version.
4. `recordsAllowed` decides whether records may attach directly to a category or must use a descendant.
5. A record stores the category it actually belongs to, its record type, and the template version used to validate it.
6. Draft records may be unclassified. Published records require an active publishable category, allowed record type, valid template version, and required evidence.
7. Teachers and admins choose existing scientific structure inside the record form; category/subcategory creation uses a separate simple dashboard screen.
8. The normal creation path is: **Add record → category → subcategory when required → record type → generated form**. The system selects the active template automatically.
9. Teachers and admins manage category/subcategory content through validated, audited dashboard workflows. Custom record types, templates, and field definitions remain controlled maintenance.
10. Missing scientific structure is recorded as a request for later reviewed maintenance instead of being invented during data entry.
11. Labels are translatable; identifiers and stable keys are not derived from translated text.
12. Archiving or moving scientific structure must not erase records, revisions, translations, or history.

Example:

```text
Fossils                                      recordsAllowed: false
└── Invertebrate body fossils                recordsAllowed: true
    ├── Fossil occurrence                    template: Fossil Occurrence v2
    └── Fossil specimen                      template: Fossil Specimen v1

Stratigraphy and geological units           recordsAllowed: false
└── Lithostratigraphic units                 recordsAllowed: true
    └── Geologic unit profile                template: Geologic Unit Profile v1
```

Record type is not a substitute for subcategory. Subcategories organize the subject; record types describe the nature of the stored evidence.

### Proposed starter taxonomy and allowed record types — scientific review required

This is a **proposed starter menu**, not a claim of final geological approval. Its structure is seeded by a versioned backend migration so teachers can use it in development, but the scientific names, pairings, fields, evidence policies, and Kurdish/Arabic translations need geology-reviewer approval before production publication. It keeps the first dashboard manageable while representing kinds of material documented in the Kurdistan Region. For this starter menu, all six top-level categories are collection headings (`recordsAllowed: false`) and the listed subcategories accept records (`recordsAllowed: true`). The platform still supports direct records on a parent category if a later reviewed structure needs them. A teacher must explicitly select the subcategory; the interface must not silently choose the first child.

| Category | Subcategory | Allowed record types | Characteristic information in the type-specific form |
| --- | --- | --- | --- |
| Stratigraphy and geological units | Lithostratigraphic units | Geologic unit profile; Unit occurrence | Formal/source name and rank, age, lithology, defining source; for an occurrence, exposure and observed contact/location |
| Stratigraphy and geological units | Stratigraphic sections | Measured section | Section locality, measured thickness, interval/layer descriptions, measurement method, source |
| Rocks and minerals | Sedimentary rocks | Rock material profile; Rock specimen; Outcrop observation | Rock name, texture/composition and identification basis; specimen provenance or outcrop location when applicable |
| Rocks and minerals | Igneous and metamorphic rocks | Rock material profile; Rock specimen; Outcrop observation | Rock name, texture/composition, metamorphic or igneous interpretation and identification basis |
| Rocks and minerals | Minerals | Mineral profile; Mineral specimen; Mineral occurrence | Mineral identification and evidence; specimen collection details or occurrence host rock and locality when applicable |
| Fossils | Invertebrate body fossils | Fossil occurrence; Fossil specimen | Identification and confidence, host unit and age, locality policy; specimen repository/catalogue when applicable |
| Fossils | Vertebrate body fossils | Fossil occurrence; Fossil specimen | Same fossil evidence, with extra location-sensitivity review before public display |
| Fossils | Microfossils | Fossil occurrence; Fossil specimen | Assemblage/taxon, sampled interval and preparation or slide details, host unit and age |
| Fossils | Trace fossils | Fossil occurrence; Fossil specimen | Trace identification, host bed/unit, interpretation and documentation of the observed or collected material |
| Structural geology | Folds | Mapped structural feature; Structural measurement | Feature geometry, orientation, observed versus interpreted status, source; measurement method and values when applicable |
| Structural geology | Faults and shear zones | Mapped structural feature; Structural measurement | Fault/shear evidence, geometry, sense of movement and confidence where known; measurement values when applicable |
| Structural geology | Joints and fractures | Mapped structural feature; Structural measurement | Fracture set, orientation, spacing/condition and observation locality, where measured |
| Hydrogeology | Springs | Water-point profile; Water observation | Site and public-location policy, aquifer/host unit if known; dated discharge or chemistry observation with method and units |
| Hydrogeology | Wells | Water-point profile; Water observation | Site, well construction/interval if known, aquifer; dated level or quality observation with method and units |
| Hydrogeology | Aquifers | Aquifer profile | Named/defined aquifer, constituent units, extent, hydraulic evidence and supporting source |
| Surface geology and landforms | Quaternary and other surficial deposits | Surficial unit profile; Outcrop observation | Deposit material, landform/context, relative or measured age, mapped extent or exposure, source |
| Surface geology and landforms | Karst and erosional landforms | Landform profile; Outcrop observation | Feature type, morphology, host rock, process interpretation, public-location policy and source |

These are **permitted category/type pairings**, not one record for every row and not a claim that each feature exists at a particular Kurdistan locality. Reused types such as `Outcrop observation` may share a stable type identity but use a different approved template for each allowed pairing. The type describes what one record represents: a named scientific entity, a specific observed occurrence, a held specimen, or a dated measurement. Do not create a vague `General Reference` geological record merely to store a citation; external works belong in References, and managed publications belong in Research. Geological maps belong to Map Layers with source, scale, coordinate system, rights, and version; they are not a generic record type. Cross-disciplinary facts are linked rather than copied (for example, a fossil occurrence may link to a geologic unit, specimen, section, and reference).

Before production publication, geology reviewers must confirm the seeded scientific menu and its evidence and location policies. Teachers and admins may add category/subcategory drafts through the dashboard; custom type/template corrections still use reviewed maintenance. Never edit the already-applied starter migration. Production may still start with **zero geological records**. Images and videos are attachable to every type. At least one approved, rights-cleared image is required for category and record publication; video and any additional image requirements remain type/evidence-policy decisions. Drafts may omit them.

Maintenance contract: stable keys and template versions preserve meaning and must not be renamed or overwritten. Category/subcategory content is managed in validated, audited dashboard workflows; custom type and template changes require reviewed migrations. Archive instead of hard-deleting used structure, preserve records and history, and reject hierarchy cycles. Public URLs must remain stable when labels change. Each delivery gate is tested before the next workflow is added.

The subject areas are grounded in the [Iraq Geological Survey map and formation overview](https://ibgm-iq.org/ibgm/index.php/ibgm/article/view/263), [Kurdistan biostratigraphy and fossil evidence](https://ibgm-iq.org/ibgm/index.php/ibgm/article/view/476), [Kurdistan folds and fractures study](https://ibgm-iq.org/ibgm/index.php/ibgm/article/view/497), [Kurdistan mineral-resource survey](https://ibgm-iq.org/ibgm/index.php/ibgm/article/view/241), [Kurdistan spring/aquifer research](https://www.mdpi.com/94668), and [Kurdistan geomorphology study](https://ibgm-iq.org/ibgm/index.php/ibgm/article/view/394). The **menu and pairings are our design proposal**, not a taxonomy published or endorsed by those sources.

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

- Initial authoring uses English (`en`) only. Kurdish and Arabic locales can be configured later after language scope, terminology, and review workflow are approved; they do not create duplicate geological records.
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

- Scientific profile (for example, a geologic unit or mineral profile): at least one traceable scientific or institutional source.
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

- Original images, videos, and research documents remain private in object storage; public pages never expose permanent storage keys or direct original-file URLs.
- Every geological record may have images and videos attached. Drafts may have neither; publication-time media requirements are defined by record type and evidence policy, not a universal requirement to attach both.
- The application provides online image, video, and document viewers using approved derivatives, video playback renditions, document pages/tiles, or short-lived authorized delivery as appropriate.
- Viewer responses use short-lived access, inline disposition, strict caching rules, rate limits, and rights checks. Video playback supports seeking through authorized byte-range or segment requests without exposing an unrestricted original-file endpoint. The interface does not provide a download button or bulk-export action.
- Teachers and admins upload and manage files through protected workflows, but routine roles receive no unrestricted original-file export capability.
- Resized or watermarked public image derivatives may be used when rights policy requires them.
- This policy prevents authorized UI/API paths from offering original-file downloads and deters ordinary saving; it cannot prevent screenshots, screen recording, or copying content already delivered to a user's device. Do not claim DRM or absolute download prevention.

Video is **not** part of the completed Phase 4 image/PDF processing rehearsal. Before video upload or playback is enabled, add a reviewed schema migration and a bounded media pipeline: narrow accepted formats/codecs and size/duration limits; private upload and quarantine; signature, metadata, malware, and rights checks; retry-safe processing into approved playback renditions and poster frames; worker CPU/disk/concurrency limits; cleanup and recovery; and publication approval of the resulting asset. Test staff-only upload/management, public/private viewing decisions, range or segment access, rejection, and the absence of direct original-file delivery. Keep video unavailable in production until this gate passes.

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

Implementation status: Firebase Authentication is selected and configured for Google/phone identity proof. NestJS owns internal users, fixed role bundles, invitations, opaque PostgreSQL sessions, CSRF, recent-auth enforcement, and audit events. The account route and real-provider flows have passed local browser checks for visitor, teacher, and admin, and the expanded API/PostgreSQL authorization rehearsal passes. The Phase 2 gate is complete for the currently implemented identity surface. Object-level allow/deny tests remain mandatory for each saved-record, draft, restricted-location, and protected-file endpoint when those resources are introduced in Phases 3 and 4. Production-domain configuration and the final launch checklist remain pending.

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

Anonymous browsing is public access, not a fourth role. Category/subcategory management is available to teachers and admins; custom record types, templates, role definitions, raw audit logs, and technical security settings are not routine dashboard capabilities.

Completion gate:

- Every non-public endpoint has tested allow and deny cases.
- Object-level authorization tests prevent identifier changes from exposing another user's private saved list, drafts, restricted locations, or protected files.
- Visitor signup cannot assign or escalate to teacher or admin.
- The three role bundles are seeded and tested; no client-facing permission editor exists.
- No writable content endpoint exists without authenticated role and object-level authorization checks.

### Phase 3 — Configurable scientific content foundation

Implementation status: complete for the backend foundation. The production-style seed contains zero geological records and invents no permanent taxonomy. Temporary live fixtures proved category → record type → generated template selection, unclassified/classified drafts, translations, validation, revisions, archive/restore, private saved-record ownership, structure requests, and non-mutating template migration previews. Active templates and deprecated versions pinned by records are protected against mutation at the database layer. The repeatable evidence is recorded in `docs/operations/phase3-rehearsal-2026-09-26.md`.

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

Implementation status: complete for the development gate. Five forward migrations establish structured evidence, exact/public PostGIS separation, public-safe location views, private media metadata and derivatives, typed content relationships, research, news, managed pages, organization identity, revisions, and database-enforced independent review/publication rules. Protected APIs cover the corresponding teacher/admin workflows, while missing object storage or malware scanning fails closed. The PostgreSQL worker performs ClamAV scanning, bounded image processing, bounded PDF page rendering, deterministic derivative writes, retry-safe claims, and periodic cleanup of expired unconfirmed uploads. A separate private primary-media bucket passes real signed upload, metadata, size, magic-byte, quarantine, clean/infected processing, transient scanner-outage recovery, duplicate-job idempotency, immediate rejected-object deletion, abandoned-upload expiry, approved-attachment publication, controlled viewing, and cleanup checks. The repeatable live evidence is recorded in `docs/operations/phase4-rehearsal-2026-09-26.md`.

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
4. English title, summary, and description with review status on the saved record. The database keeps versioned translation support, but Kurdish/Arabic authoring and locale switching are deferred until the client approves that scope.
5. Evidence, references, location visibility, media, and relationship editors. Image/document workflows use the existing protected media foundation; video upload/management is enabled only after the separate video pipeline and security gate above passes.
6. Review, publication, archive, record history, and restore flows; template migration remains a controlled maintenance operation rather than a routine client screen.
7. News, scheduled publication, managed pages, and organization-profile editors.
8. A simple admin account screen for inviting teachers, activating or disabling users, and assigning only `visitor`, `teacher`, or `admin` through protected actions.
9. Admin-only news, managed-page, organization-profile, and optional future shop navigation, kept separate from the teacher's scientific workflow.

Dashboard rules:

- Current dashboard authoring is English-only; do not add a language picker or imply that Kurdish/Arabic content is ready. Preserve locale-neutral identifiers and the existing translation model for a later reviewed expansion.
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
- Add online-only image, video, and research viewers with no download controls, private originals, protected delivery, and clear access/rights states. Video viewing depends on the separate video pipeline and security gate above; do not expose a video control before it is usable and authorized.
- Add zero-record, zero-location, untranslated, loading, unavailable, and error states.
- Implement locale routing, direction changes, translation fallback, and server-side cache/revalidation.
- Define cache keys and invalidation for locale, publication revision, and public visibility; never publicly cache dashboard, user-specific, draft, or restricted-location responses.
- Ensure public location responses use only authorized public geometry.
- Preserve SEO metadata, accessibility, responsiveness, and the existing visual system.

Completion gate:

- Public pages read only published, authorized API data.
- News and managed pages expose only published revisions and verified public media/source links.
- A signed-in visitor can privately save and remove a published record, and cannot read another user's saved list.
- Images, videos, and research documents open in controlled online viewers without exposing original storage URLs or a download action; video is included only after its separate processing and security gate passes.
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
- Client-facing custom-template, custom-role, raw-audit-log, or technical-settings dashboards; category/subcategory management is in scope.
- Automated news scraping or feed ingestion before source rights, allowlists, SSRF protection, deduplication, provenance, and editorial review exist.
- Allowing AI to publish or mutate administrative data autonomously.
- Permanent category-specific code when configuration and templates are sufficient.
- Importing showcase mock records into the production database.

## 16. Next authorized work

Local completion evidence recorded on 2026-09-26:

1. Migrations and the idempotent configuration/role seed pass against PostgreSQL/PostGIS.
2. Firebase Google and phone providers, authorized localhost, the backend service account, and all three role flows pass local real-provider checks.
3. Initial-admin invitation and role switching were exercised against the real API.
4. Visitor signup, invitation matching, sign-in/out, session revocation, role/status changes, CSRF denial, and allow/deny cases passed the local integration/security rehearsal.
5. The complete Compose topology is healthy, the durable job proof is processed by the real worker, and encrypted backup/checksum/clean restore passes with restored identity counts matching the source.

Additional completion evidence recorded on 2026-09-26:

1. The private, encrypted Backblaze B2 recovery repository was initialized and received snapshot `eb4ae4ea`.
2. That off-server snapshot restored successfully into a disposable database; checksum, PostGIS, platform settings, and identity-table counts matched the source.
3. A second isolated Compose project rebuilt the database, migrations, seed, API, worker, frontend, and reverse proxy from the off-server snapshot in 60.6 seconds.
4. The rebuilt API reported ready, its real worker completed queue proof job `ddbbf580-4260-42e7-8052-2c1a43e76bd6`, and only `127.0.0.1:18080` was published for the isolated rehearsal.
5. The isolated containers, network, and volumes were removed after verification; the normal development stack remained healthy.

Phase 3 completion evidence recorded on 2026-09-26:

1. Four Phase 3 forward migrations establish taxonomy, record types, category/type allowances, versioned templates and fields, record drafts, translations, revisions, saved records, content audit events, and structure requests; the complete six-migration chain passes from a blank disposable database.
2. The production-style seed remains at zero geological records and does not invent permanent taxonomy.
3. Forty backend tests pass across 18 files; formatting, typecheck, lint, build, Compose migration, and live readiness pass.
4. A temporary teacher completed category → record type → generated form, unclassified/classified draft creation, translation, failed-and-passed validation, revision, archive, and restore through the protected API.
5. A visitor was denied teacher routes; saved-record ownership was isolated between signed-in users.
6. A template-v2 migration preview validated a pinned record without changing it, and PostgreSQL rejected mutation of a deprecated template field still pinned by a record.
7. The temporary structure, users, sessions, records, translations, revisions, saved rows, requests, and audit rows were removed; the live scientific collection returned to its intended empty state.

Phase 4 is complete for its development gate. Its policy/data/API foundation, publication rehearsal, real private-bucket workflow, scanning, image/PDF derivatives, failed-job recovery, duplicate-job idempotency, approved-media publication, cleanup, and short-lived controlled viewing pass together. Phase 5 is authorized and active. Keep the recovery bucket separate; public file delivery and public-page integration remain Phase 6 work and must use only approved derivatives through the backend policy boundary.

Still required before production launch, but not before Phase 4 development:

1. Repeat the documented rebuild on the selected production Linux server and record recovery time against the approved objective.
2. Configure the production domain, Firebase authorized domain, quotas/cost controls, external monitoring and alert ownership, and the privileged-account MFA policy.
3. Run the later staging, security, privacy, accessibility, performance, zero-record initialization, and teacher-led first-record gates in their assigned phases.
