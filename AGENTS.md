# Geo-Kurdistan Development Rules

## Source of truth

Read these files before making architectural or product changes:

1. `PLAN.md` — ordered delivery plan, scope, and completion gates.
2. `MAP.md` — system boundaries, data ownership, roles, and flows.
3. `DESIGN.md` — visual and accessibility rules.

If documents conflict, `PLAN.md` wins for delivery scope and `MAP.md` wins for system boundaries.

## Current phase

The visitor showcase remains the frontend baseline. Phase 2 — identity, three-role authorization, and visitor accounts — is the active code phase. The Phase 1 Docker/PostgreSQL/queue/backup/restore rehearsal is still required before production sign-off. Do not begin Phase 3 content work until both the Phase 1 operational gate and Phase 2 identity gate pass.

Current work must follow the active phase in `PLAN.md`. Do not jump ahead to AI, payments, or advanced infrastructure before the earlier phase completion gates pass.

## Product rules

- Do not block development on the final geological taxonomy.
- Categories and subcategories are managed data, never hardcoded business rules.
- A draft record may be unclassified; a published record must have a valid publishable category.
- Category-specific fields come from versioned templates.
- The only application roles are `visitor`, `teacher`, and `admin`; authentication state is not a separate role.
- Teachers manage geological records, research, translations, evidence, locations, and media. Admins have the same scientific capabilities plus simple operational management such as news, site pages, user activation, and an optional future shop.
- Taxonomy, record types, and templates are centrally seeded and maintained through reviewed migrations; routine application roles do not edit them in the dashboard.
- Keep revisions and safe audit history automatically for recovery and security, but do not build a complex audit-log or permission-management interface for client users.
- Preserve references, provenance, revisions, and audit history.
- Never silently invent permanent geological rules. Unknown scientific decisions stay configurable and visibly provisional.

## Architecture rules

- Frontend: Next.js, React, TypeScript.
- Backend: NestJS modular monolith.
- Primary database: PostgreSQL. Use PostGIS for spatial data and pgvector only when RAG work begins.
- Store media in private object storage; store metadata and ownership in PostgreSQL.
- Keep business rules and authorization in NestJS, not in browser components.
- Keep database access behind backend modules; the frontend must use documented API contracts.
- Begin with one deployable backend and one database. Split services only after measured operational need.
- Use migrations for every schema change. Do not edit production data structures manually.

## Engineering rules

- Prefer small, focused modules and reusable components.
- Validate every external input at the API boundary.
- Use explicit permissions, deny by default, and test authorization.
- Use soft deletion or archival for business records; retain audit history.
- Add tests with each behavior, especially permissions, publication rules, and migrations.
- Never commit secrets, credentials, tokens, private documents, or production personal data.
- Keep localization and right-to-left layouts possible; do not couple identifiers to translated labels.
- Preserve existing user work and avoid unrelated rewrites.

## Production interface and disclosure rules

- Treat every implemented screen, state, and API response as if it will be deployed immediately. Do not ship development narration, phase labels, setup instructions, placeholder statistics, mock operational claims, or debug/configuration messages in user-facing output.
- Keep public and unauthorized copy concise and action-oriented. Do not explain privileged role names, role-assignment or invitation mechanics, protected route structure, authentication providers, security architecture, infrastructure, environment state, or internal workflows unless that information is genuinely required by the authorized user.
- Use neutral access messages such as “Sign in to continue” or “You do not have access to this area.” When an unavailable action needs explanation, tell the user what they can do next without describing internal controls.
- Never expose stack traces, raw provider errors, tokens, cookies, internal identifiers, database or storage details, or security-control specifics. Return safe operational errors and only the minimum API fields needed by the current screen.
- Hide unfinished or unavailable features unless a visible disabled state is explicitly required and useful. Do not add dead controls, pretend actions, or “coming soon” workflow promises to production-facing interfaces.
- Review every visible string, route state, error, empty state, loading state, and API projection for production suitability and unnecessary disclosure before considering interface work complete.
- Copy minimization is not an authorization boundary. NestJS must still enforce permissions and object-level access with deny-by-default behavior even when routes or role details are not shown in the UI.

## Design direction

The product should feel scientific, modern, trustworthy, organized, educational, and visually interesting. Follow `DESIGN.md`; do not replace the established visual language with a generic admin template.
