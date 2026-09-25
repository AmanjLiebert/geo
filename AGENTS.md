# Geo-Kurdistan Development Rules

## Source of truth

Read these files before making architectural or product changes:

1. `PLAN.md` — ordered delivery plan, scope, and completion gates.
2. `MAP.md` — system boundaries, data ownership, roles, and flows.
3. `DESIGN.md` — visual and accessibility rules.

If documents conflict, `PLAN.md` wins for delivery scope and `MAP.md` wins for system boundaries.

## Current phase

The visitor showcase is complete enough to preserve as the current frontend baseline. The project is now moving toward a production-capable platform.

Current work must follow the active phase in `PLAN.md`. Do not jump ahead to AI, payments, or advanced infrastructure before the earlier phase completion gates pass.

## Product rules

- Do not block development on the final geological taxonomy.
- Categories and subcategories are managed data, never hardcoded business rules.
- A draft record may be unclassified; a published record must have a valid publishable category.
- Category-specific fields come from versioned templates.
- Editors manage content. Only super admins manage taxonomy, templates, roles, and global configuration.
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

## Design direction

The product should feel scientific, modern, trustworthy, organized, educational, and visually interesting. Follow `DESIGN.md`; do not replace the established visual language with a generic admin template.
