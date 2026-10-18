# Geo-Kurdistan System Map

## Approved category-management change

Teachers and admins can manage category/subcategory drafts through protected NestJS endpoints. PostgreSQL retains stable category identity, unpublished state, private image association, and automatic history. Existing seeded structure is preserved. New categories receive the shared General geological record pairing; custom scientific templates remain a separate controlled concern. Public discovery later reads only published, active structure and records from NestJS, never dashboard data or mock files. The ordered gates are in `PLAN.md`; the earlier migration-only dashboard prohibition below is superseded for categories/subcategories, not for arbitrary template editing.

Category edits are stored as private draft revisions with append-only history. The live category row, English translation, image, display order, stable ID, and slug remain unchanged until an explicit later publication action. Parent movement is not available in this editing gate, so existing two-level relationships cannot accidentally form cycles.

Archive and restore operate on an entire category subtree. The dashboard previews and confirms affected category and record counts, the backend rechecks those counts transactionally, descendants are archived before their parent and restored after their parent, and neither records nor type bindings are deleted. Normal scientific-structure queries continue to hide archived branches; the protected management projection includes them so authorized users can restore them.

This document defines system boundaries, data ownership, permissions, and workflows. Use `PLAN.md` for delivery order. The existing frontend and its visual design remain the baseline.

## 1. System map

```text
Anonymous/registered visitors                  Teachers and admins
          │                                             │
          └──────────────────┬──────────────────────────┘
                             ▼
                CDN / WAF / HTTPS reverse proxy
                             │
                             ▼
                 Next.js web application
                 ├── Public website
                 └── Protected dashboard
                             │ HTTPS / typed API
                             ▼
                    NestJS application
        ┌────────────────────┼───────────────────────────┐
        │                    │                           │
        ▼                    ▼                           ▼
   PostgreSQL          Object storage             Background worker
   ├── PostGIS         ├── Private originals      ├── Durable PostgreSQL queue
   ├── durable jobs    ├── Private derivatives    ├── Media processing
   └── pgvector*       └── Research documents     ├── Document extraction
                                                  ├── Scheduled publishing
                                                  └── AI ingestion*

External trust and recovery boundaries
├── Firebase Authentication — Google and verified phone sign-in
├── Encrypted off-server database and media recovery copies
└── External AI providers* — generation and embeddings

* Added only in the phase that requires it.
```

The production database may contain configuration, taxonomy, record types, templates, news/site-content structure, and permissions while containing zero geological records. One paid compute server is the initial deployment boundary, but identity, object storage, backups, and optional AI remain external service or recovery boundaries.

## 2. Responsibility map

| Part | Owns | Must not own |
| --- | --- | --- |
| CDN / reverse proxy | TLS termination, public routing, coarse request limits, static/public caching, origin protection | Application authorization, private-response caching, canonical data |
| Next.js | Rendering, interaction, accessibility, locale/direction, route metadata, dashboard forms | Final authorization, raw database access, private geometry, secret keys |
| NestJS | Business rules, validation, role/object checks, publication, public data projection, API contracts, audit events | Visual presentation |
| PostgreSQL | Durable structured data, translations, relations, revisions, permissions, exact/public spatial data, initial durable job queue | Original media files, public network exposure |
| Object storage | Private originals, processed derivatives, research documents | Business authorization without backend checks |
| Worker | Slow, retryable, idempotent processing | User-facing authorization decisions |
| Off-server recovery store | Encrypted database backups, WAL/archive data, media recovery copy, retention | Serving as the primary database or only copy of secrets |
| Firebase Authentication | Login verification, account recovery, Google/phone identity | Application roles, account status, invitations, sessions, and scientific permissions |
| AI provider | Model inference | Canonical content, access decisions, autonomous publishing |

## 3. Backend module map

```text
App
├── Platform
│   ├── Configuration
│   ├── Database, migrations, and seeds
│   ├── Durable jobs and scheduling
│   ├── Logging and errors
│   ├── Health and metrics
│   └── API documentation
├── Identity and Access
│   ├── Users and external identities
│   ├── Three fixed roles and permissions
│   ├── Sessions and privileged access
│   ├── Saved records / watch-later
│   └── Authorization policies
├── Scientific Content
│   ├── Taxonomy
│   ├── Record types
│   ├── Templates and field definitions
│   ├── Records and translations
│   ├── Revisions
│   └── Relationships
├── Evidence
│   ├── References
│   ├── Evidence links
│   └── Publication requirements
├── Research
│   ├── Publications and contributors
│   ├── Documents and rights
│   └── Publication translations
├── Publishing
│   ├── Geological news and topics
│   ├── Sources, authorship, translations, and revisions
│   └── Scheduling, review, publication, expiry, and archive
├── Site Content
│   ├── Managed pages and translations
│   ├── Organization / publisher profile
│   └── Contact, privacy, terms, and SEO metadata
├── Geography
│   ├── Regions and places
│   ├── Exact and public geometry
│   ├── Visibility policies
│   └── Map layers
├── Media
│   ├── Uploads
│   ├── Assets and rights
│   └── Processing jobs
├── Editorial
│   ├── Review and publication
│   ├── Structure requests
│   ├── Template migrations
│   └── Automatic audit history
├── Discovery
│   ├── Search
│   └── Public queries
└── Intelligence (later)
    ├── Provider adapters
    ├── Ingestion
    ├── Retrieval
    ├── Conversations
    └── Evaluations
```

Module direction:

- Every non-public API request passes identity, role, and object-level checks before business actions.
- Public routes are explicitly marked; absence of a rule means denial.
- Taxonomy, record types, templates, languages, and permissions can exist without records.
- Records depend on approved scientific structure; taxonomy and templates do not depend on records.
- Evidence policies depend on record type and are enforced before publication.
- Research is a separate content module but reuses translations, media, review, references, and permissions.
- News and managed pages reuse editorial services but remain separate from geological records and research publications.
- Public geography is projected from approved public representations, never directly from protected geometry.
- Intelligence reads approved content through authorized application services and receives only read-only, permission-filtered tools.

### One-server production topology

```text
Linux host
├── reverse proxy          public 80/443 only; redirects to HTTPS
├── Next.js                private application port; stateless
├── NestJS                 private API port; authoritative validation/authz
├── worker                 no public port; bounded concurrent jobs
├── ClamAV                 private scanner port only; no host exposure
└── PostgreSQL + PostGIS   private database port; persistent encrypted volume

Outside the host
├── DNS/CDN/WAF            optional edge protection and public caching
├── identity provider      authentication and recovery
├── object storage         private originals and processed derivatives
└── recovery storage       encrypted database/WAL and media copies
```

- Services run as separate non-root processes or containers with health checks and resource limits.
- The reverse proxy is the only public entry point and applies trusted-proxy, request-size, timeout, and coarse rate-limit policy.
- Public cache keys include locale, publication revision, and public visibility. Dashboard, draft, identity, and restricted-location traffic is private and non-cacheable.
- Deployments migrate once, verify health before switching traffic, and retain the previous application release for rollback. Data migrations require forward recovery rather than blind database downgrade.
- A clean server can be rebuilt from versioned configuration and off-server backups within the approved recovery objective.

### Scale-out path

```text
measure and optimize queries/caches
        ↓
increase one-server capacity
        ↓
move PostgreSQL or worker when measured pressure requires it
        ↓
run multiple stateless Next.js/NestJS instances behind a load balancer
```

No module may require local application memory or disk for canonical sessions, uploads, jobs, or content. That keeps later scale-out an operational change rather than a product rewrite.

## 4. Scientific content map

```text
Category
├── parentCategory ───────────────────► Category
├── translations ─────────────────────► CategoryTranslation[]
├── allowedTypes ─────────────────────► CategoryRecordType[]
└── children ─────────────────────────► Category[]

RecordType
├── translations ─────────────────────► RecordTypeTranslation[]
└── categoryUse ──────────────────────► CategoryRecordType[]

CategoryRecordType
├── category ─────────────────────────► Category
├── recordType ───────────────────────► RecordType
└── activeTemplateVersion ────────────► TemplateVersion

RecordTemplate
└── versions ─────────────────────────► TemplateVersion[]

TemplateVersion
├── fields ───────────────────────────► FieldDefinition[]
└── migrationRules ───────────────────► TemplateMigration[]

FieldDefinition
└── translations ─────────────────────► FieldDefinitionTranslation[]

Record
├── primaryCategory ──────────────────► Category
├── recordType ───────────────────────► RecordType
├── templateVersion ──────────────────► TemplateVersion
├── translations ─────────────────────► RecordTranslation[]
├── attributes ───────────────────────► validated structured values
├── locations ────────────────────────► RecordLocation[]
├── media ────────────────────────────► RecordMedia[]
├── evidence ─────────────────────────► EvidenceLink[]
├── relationships ────────────────────► RecordRelation[]
├── revisions ────────────────────────► RecordRevision[]
└── authorship/ownership ─────────────► User

RecordMedia
├── mediaAsset ───────────────────────► MediaAsset
├── purpose / caption / description
├── image alternative text
├── display position
└── primary image marker (at most one per record)
```

The record type is first-class data. It must not be stored only as an unrestricted string or confused with a subcategory.

The starter structure is seeded through reviewed migrations while the geological collection may remain empty. Teachers and admins create category/subcategory drafts through NestJS; later gates add editing and archive/restore. Stable keys and used template versions retain their meaning. Custom type/template changes remain controlled maintenance. Archived choices disappear from new-record selection but remain resolvable for historical records. A correction must not silently rewrite an existing record's classification. Category moves reject cycles and archived parents; active category/type pairings require a matching active template version.

## 5. Identity and permission map

```text
User
├── identities ───────────────────────► ExternalIdentity[]
├── role ─────────────────────────────► VISITOR | TEACHER | ADMIN
├── savedRecords ─────────────────────► SavedRecord[]
└── actions ──────────────────────────► AuditEvent[]

SavedRecord
├── user ─────────────────────────────► User
└── record ───────────────────────────► Record
```

Exactly three application roles exist. They map to fixed, tested permission bundles in NestJS; the client has no custom-role or permission editor. Anonymous browsing is public access, not a fourth role.

| Capability | Visitor | Teacher | Admin |
| --- | :---: | :---: | :---: |
| Read published public content | Yes | Yes | Yes |
| Sign in/out and save records to watch later | Yes | Yes | Yes |
| Create/edit scientific drafts | No | Yes | Yes |
| Manage translations, evidence, location, media, and research | No | Yes | Yes |
| Review, publish, archive, and restore scientific content | No | Yes | Yes |
| Manage reviewed news and site pages | No | No | Yes |
| Manage user accounts and the three role assignments | No | No | Yes, simple controls |
| Manage optional future shop | No | No | Yes, when enabled |
| Manage taxonomy, record types, or templates | No | No | No |
| Manage custom roles, raw audit logs, or technical settings | No | No | No |

The interface shows only the work relevant to the role, but the API always enforces authorization. Teacher and admin share one scientific workspace. Admin receives a small additional operational area; it is not a technical system console.

### Security request boundary

```text
Request
  │ reverse-proxy limits, TLS, and origin checks
  ▼
NestJS authentication
  │ session/token validity and revocation
  ▼
fixed role permission + target-object policy
  │ deny by default; object-level authorization
  ▼
validated command / query
  │ transaction, revision, and safe audit event where required
  ▼
public-safe or authorized private response
```

- Visitor registration creates only a visitor after verification and abuse controls are ready. Teacher and admin accounts require controlled invitation or explicit protected promotion.
- Privileged identities use provider-supported MFA and reauthenticate before high-risk permission, security, migration, export, or restricted-location actions.
- Cookie sessions, when used, are secure, HTTP-only, appropriately same-site, rotated, CSRF-protected, and revocable.
- Authorization is performed after identifier resolution and before returning or mutating the target resource; changing an ID cannot expose another user's saved list, a draft, a protected file, or restricted geometry.
- Safe audit events include authentication changes, failed authorization, publishing, migrations, exports, restricted-location reads, and security/global configuration changes without copying secrets or protected data into logs.

## 6. Minimum entity definitions

| Entity | Important fields |
| --- | --- |
| User | id, role (`VISITOR`, `TEACHER`, or `ADMIN`), status, profile metadata, timestamps |
| Permission | stableKey, description, riskLevel |
| Category | id, parentId, stableKey, slug, recordsAllowed, status, position |
| CategoryTranslation | categoryId, locale, name, description, reviewStatus |
| RecordType | id, stableKey, status |
| RecordTypeTranslation | recordTypeId, locale, name, description, reviewStatus |
| CategoryRecordType | categoryId, recordTypeId, activeTemplateVersionId, status, position |
| RecordTemplate | id, stableKey, name, status |
| TemplateVersion | id, templateId, version, schema, status, createdBy, createdAt |
| FieldDefinition | id, stableKey, dataType, required, validation, unit, search/filter behavior, position, status |
| FieldDefinitionTranslation | fieldDefinitionId, locale, label, helpText, reviewStatus |
| TemplateMigration | fromVersionId, toVersionId, mapping, dryRunResult, status, approvedBy |
| Record | id, stableId, slug, status, categoryId, recordTypeId, templateVersionId, attributes, ownerId, timestamps |
| RecordTranslation | recordId, locale, title, summary, description, sourceLocale, status, translatorId, reviewerId |
| RecordRevision | recordId, revision, complete snapshot, reason, actorId, createdAt |
| Reference | id, type, citation metadata, identifier, URL/documentId, rights, verification status |
| EvidenceLink | referenceId, targetType, targetId, fieldKey/claimId, evidenceRole, reviewerId |
| ResearchPublication | id, type, DOI/identifier, publication data, status, rights |
| ResearchTranslation | publicationId, locale, title, abstract, status, translatorId, reviewerId |
| ResearchContributor | publicationId, personId/name, role, position, identifiers |
| NewsArticle | id, stableId, slug, status, authorId, sourceId, publishedAt, scheduledAt, expiresAt, timestamps |
| NewsTranslation | articleId, locale, title, summary, body, status, translatorId, reviewerId |
| NewsSource | id, name, canonicalUrl, rights, trust/verification status |
| ManagedPage | id, stableKey, status, pageType, publishedRevisionId, SEO metadata |
| ManagedPageTranslation | pageId, locale, title, body, status, translatorId, reviewerId |
| OrganizationProfile | id, stableKey, legalName, displayName, ownership statement, contact metadata, logoMediaId, status |
| Place | id, name, regionId, exactGeometryId, publicGeometryId, visibility, sensitivityReason, embargoUntil |
| PublicGeometry | id, geometry, precision, publicLabel, approvedBy |
| MapLayer | id, source, licence, format, CRS, scale/resolution, extent, version/date, visibility, storageKey |
| MediaAsset | id, storageKey, type, MIME type, size, checksum, rights, status, ownerId |
| RecordRelation | sourceId, targetType, targetId, relationType, explanation |
| ExternalIdentity | userId, provider, providerSubject, verified contact metadata |
| SavedRecord | userId, recordId, createdAt; unique user/record pair |
| AuditEvent | actorId, action, targetType, targetId, safe metadata, timestamp |

Never use translated labels, email addresses, or phone numbers as permanent identifiers.

## 7. Record creation map

```text
Authenticated teacher
        │ fixed role + object policy check
        ▼
Choose active category
        │
        ├── recordsAllowed = true ──► continue
        │
        └── recordsAllowed = false ─► choose active descendant
                                      │
                                      ▼
                           choose allowed record type
                                      │
                                      ▼
                           load active template version
                                      │
                                      ▼
                        render translated field definitions
                                      │
                                      ▼
                       validate and save draft + revision
```

Rules:

- The visible path is **Add record → category → subcategory when required → record type → generated form**.
- The active template is selected by the system and is not another choice for the teacher.
- A public category page may aggregate records from descendants.
- A record stores the category it belongs to, not every ancestor.
- A category may allow several record types and scientific templates.
- Moving a category changes navigation but does not rewrite record history.
- The dashboard initially presents category and subcategory clearly while the data model permits deeper nesting.

## 8. Template lifecycle map

```text
ACTIVE TEMPLATE VERSION
        │ clone
        ▼
   DRAFT VERSION
        │ edit fields and translations
        ▼
 MIGRATION DRY RUN
        ├── invalid records ─────────► revise mapping or manual correction
        └── valid plan
                │ approve
                ▼
       NEW ACTIVE VERSION
                │
                ├── new records use new version
                └── old records remain pinned until deliberate migration
```

Rules:

- Published template versions are immutable.
- Field identifiers remain stable across label translations and compatible revisions.
- Removal deprecates a used field; it does not erase historical values.
- Type/meaning changes create a new field and explicit mapping.
- Migration and publication are independent reviewed actions.

## 9. Translation map

```text
Scientific entity — one stable identity
├── shared scientific values, evidence, relations, and geometry
├── English translation      draft/reviewed/published
├── Kurdish translation      draft/reviewed/published
└── Arabic translation       draft/reviewed/published
```

The current dashboard authors English content only. Other locale rows and controls remain future capabilities; scientific identity, evidence, relations, and geometry are already shared so additional languages will not duplicate records.

- Locale values use BCP 47 language tags and are configured rather than hardcoded.
- Each translation records source language, translator, reviewer, and status.
- Publishing one locale does not automatically publish another.
- Public fallback behavior is explicit and never substitutes unreviewed text.
- Scientific names and identifiers may be shared while explanatory text is translated.

## 10. Evidence and publication map

```text
Record field / claim / occurrence / specimen
        │
        ▼
EvidenceLink ────────────────► Reference or managed ResearchPublication
        │
        ▼
Record-type publication policy
        │
        ├── missing/invalid evidence ─► return to draft
        └── requirements satisfied
                    │
                    ▼
           authorized independent review
                    │
                    ▼
                 PUBLISHED
```

Publication requires:

- Allowed category and record type.
- Valid pinned template version.
- Required scientific values and reviewed translation for the published locale.
- Evidence required by the record type.
- Valid media rights and reference access.
- Public-safe geographic representation.
- Teacher or admin authorization for the target record.

Record media is a one-to-many attachment collection. Images, supported videos, and PDFs remain private objects and are exposed only through authorized short-lived inline viewing. Each attachment owns its presentation metadata rather than borrowing one record-wide caption. Browser-viewable media cannot be made impossible to copy; the enforceable controls are private storage, validation and malware scanning, authorization, short-lived URLs, inline disposition, and no ordinary download control.

## 11. Record lifecycle map

```text
UNCLASSIFIED_DRAFT
        │ choose category, type, and template
        ▼
      DRAFT
        │ satisfy validation and submit
        ▼
   IN_REVIEW ─── changes requested ──► DRAFT
        │ approve evidence, translation, and public projection
        ▼
    PUBLISHED
        │ edit creates a new draft revision
        ├─────────────────────────────► DRAFT
        │ archive
        ▼
    ARCHIVED ─── restore ─────────────► DRAFT
```

A published revision remains public until an approved replacement is published. Restoring or migrating never silently publishes.

## 12. Research map

```text
ResearchPublication
├── contributors ─────────────────────► ResearchContributor[]
├── translations ─────────────────────► ResearchTranslation[]
├── documents ────────────────────────► MediaAsset[]
├── references ───────────────────────► Reference[]
├── related records ──────────────────► RecordRelation[]
└── revisions / review / rights

Reference
└── may point to an external work or managed ResearchPublication
```

Research is not stored as a geological record and is not reduced to a citation. It remains a dedicated module inside the modular monolith.

### Online-only research and media delivery

```text
Private original in object storage
        │ backend rights + visibility decision
        ▼
short-lived authorized inline response or processed viewer derivative
        │ no permanent storage URL; no download control
        ▼
image/document viewer
```

- Original images and research files are private by default.
- Public or visitor viewing uses public-safe derivatives, document pages/tiles, or short-lived authorized inline delivery.
- Responses use private/no-store caching where appropriate, rate limits, and rights checks. Bulk export is not part of the routine roles.
- The browser cannot guarantee DRM: a person can still take a screenshot or copy pixels that have been rendered. The security boundary prevents unintended original-file and direct-storage access.
- Confirmation failures delete the quarantined object before recording rejection. Unconfirmed uploads receive a one-hour grace period, after which the worker deletes the object and archives its metadata; the sweep runs at worker startup and every fifteen minutes.

### Publishing and site-content map

```text
NewsArticle
├── translations ─────────────────────► NewsTranslation[]
├── source ───────────────────────────► NewsSource / Reference
├── authorship ───────────────────────► User / Organization
├── topics and related records ───────► explicit relationships
├── media ────────────────────────────► MediaAsset[]
└── revisions / schedule / review / publication / expiry / archive

ManagedPage
├── stable page type ─────────────────► about / mission / contact / privacy / terms
├── translations ─────────────────────► ManagedPageTranslation[]
├── media and SEO metadata
└── revisions / review / publication

OrganizationProfile
└── legal/display identity, ownership statement, contact, logo, and public links
```

- News is editorial publishing, not geological evidence by default. A news source may also be represented as a scientific reference only after the evidence rules accept it for a specific claim.
- Automated feeds, scraping, or AI-assisted news ingestion are not launch behavior. Later ingestion uses source allowlists, rights review, SSRF-safe fetching, deduplication, provenance, and human publication approval.
- Admins may update reviewed public information without receiving taxonomy, custom-role, raw-audit-log, or global-security interfaces.
- Privacy and terms pages retain their published revision and effective date so later edits do not erase what users previously saw.

## 13. Geographic privacy map

```text
Exact geometry (restricted)
        │ visibility policy + authorized projection
        ▼
Public representation
├── exact public geometry
├── generalized point
├── approximate area
├── region-only label
└── hidden
        │
        ▼
Public API and map
```

- Exact geometry and public geometry are separate data.
- Public DTOs cannot contain the protected geometry field.
- Restricted access is permission-checked and audited.
- Map layers have their own rights, visibility, CRS, scale/resolution, source, and version.
- Search and AI use public geometry unless the requesting identity has explicit restricted-location permission.

## 14. Empty database map

```text
Idempotent production initialization
├── three fixed role bundles
├── locales and workflow states
├── categories and subcategories
├── record types and category/type rules
├── template versions and field definitions
├── relationship/evidence/visibility types
└── initial admin invitation

Geological records       0
Research publications   0
Media assets             0
Public locations         0
Saved records            0
```

Mock data and automated-test fixtures are separate from production initialization. Teachers create the first real records through the protected dashboard.

## 15. Frontend map

```text
frontend/src
├── app
│   ├── public routes: home, explore, maps, research, news, field, search, about, ownership/contact, privacy/terms
│   ├── account routes: register, sign in/out, recovery, saved records
│   └── future dashboard routes
│       ├── records and review
│       ├── research
│       ├── translations and evidence
│       ├── geography and media
│       └── admin-only news, managed pages, organization, users, and optional shop
├── components
│   ├── existing shared visual components
│   └── feature-specific interactive components
├── content
│   ├── current local showcase data
│   └── repository boundary replaced gradually by API calls
└── lib
    ├── typed API client
    ├── authentication/session helpers
    ├── validation/view adapters
    └── metadata/localization helpers
```

Migration rule: replace the data/repository layer first. Preserve working public components and the established design unless production behavior reveals a demonstrated usability problem.

## 16. Request maps

Public read:

```text
Browser → Next.js server → NestJS public API → publication + locale + visibility policy
        → public-safe query → PostgreSQL / public media derivative
```

Editorial write:

```text
Dashboard → identity verification → fixed role + target-object check → validation
          → transaction → revision + audit event → PostgreSQL
```

Save for later:

```text
Signed-in user → visitor-or-higher role check → published-record check
               → upsert/delete private SavedRecord → user-only response
```

Restricted location read:

```text
Dashboard → identity → restricted-location policy → audit event
          → exact geometry
```

Private upload:

```text
Dashboard → identity + upload permission → type/size preflight → signed private upload
          → quarantine → magic-byte/expansion checks → private ClamAV scan → safe processing
          → rights + ownership + checksum metadata → reviewer approval → public-safe derivative
```

Online-only document/image view:

```text
Viewer → publication + identity/rights check → short-lived inline or derivative response
       → private/no-store cache policy + rate limit → no direct original URL
```

Future AI answer:

```text
Question → identity/context → budget/rate check → permission-filtered query/retrieval
         → approved, licensed, provenance-tracked evidence → injection-aware prompt boundary
         → external model provider → schema/output validation → sanitized cited answer
```

Future AI ingestion:

```text
Approved source → checksum + provenance + rights + injection scan → versioned extraction/chunking
                → permission/locale/visibility metadata → embeddings → evaluation → active index

archive / rights withdrawal / permission change / deletion
                → trace affected chunks → remove or re-index → verify no stale retrieval
```

- AI tools are read-only and least-privilege. The model cannot authorize requests or directly publish, delete, change permissions, or reveal restricted geometry.
- Provider, model, prompt, embedding, chunking, and ingestion versions are stored with evaluation and cost/latency signals.
- A global kill switch and provider-failure path disable AI without disabling core browsing or editorial work.

## 17. Repository map

```text
geo-kurdistan/
├── AGENTS.md       development rules
├── PLAN.md         ordered source of truth
├── MAP.md          architecture and ownership boundaries
├── DESIGN.md       public and dashboard design contract
├── frontend/       existing Next.js application
├── backend/        future NestJS application
└── docs/           supporting operational and content documentation
```

Every major capability needs one owning module, a documented contract, authorization tests, empty-state behavior, and a place in this map.
