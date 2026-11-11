# Geo-Kurdistan backend

This directory contains the NestJS modular-monolith foundation described in the root [`PLAN.md`](../PLAN.md) and [`MAP.md`](../MAP.md).

Phase 1 provides the Fastify/PostgreSQL foundation. Phase 2 adds Firebase Google/phone identity verification, internal users and external-identity links, opaque PostgreSQL sessions, CSRF protection, fixed visitor/teacher/admin permission bundles, controlled invitations, account disablement, recent-auth checks, and security audit events.

The foundation decisions are recorded in [`docs/architecture/phase-1-decisions.md`](../docs/architecture/phase-1-decisions.md), and the identity boundary is documented in [`docs/architecture/phase-2-identity.md`](../docs/architecture/phase-2-identity.md). Production operations are under [`docs/operations/`](../docs/operations/).

Identity endpoints:

- `GET /api/v1/auth/csrf` — pre-authentication CSRF challenge.
- `POST /api/v1/auth/session` — exchange a verified Firebase ID token for an opaque server session.
- `GET /api/v1/auth/me` — current internal account.
- `POST /api/v1/auth/reauthenticate` — refresh recent-auth/MFA state for a protected action.
- `DELETE /api/v1/auth/session` — revoke the current session.
- `/api/v1/users/*` — admin-only account, role, status, and invitation operations.

Implementation order:

1. Record the data-access, PostgreSQL-backed queue, session, one-server deployment, backup, and recovery decisions.
2. Bootstrap configuration, secret validation, request limits, logging, errors, health, metrics, API versioning, and OpenAPI.
3. Add PostgreSQL/PostGIS, connection pooling, migrations, configuration-only seeds, a durable worker/job proof, and tested off-server backup/restore.
4. Add managed identity verification, secure sessions, CSRF protection when cookie-based, exactly three fixed roles (`visitor`, `teacher`, `admin`), deny-by-default object authorization, privileged-account protection, rate limits, and automatic audit events.
5. Add centrally maintained taxonomy, record types, versioned templates, translations, records, visitor saved records, revisions, and archive/restore only after protected writes are enforced. No routine role receives taxonomy or template editing screens.
6. Add evidence, geography, private media processing, online-only image/document delivery, research, geological news, managed site/ownership pages, review, scheduling, and publication.
7. Add public queries, visitor registration/sign-in/out/watch-later integration, typed frontend contracts, PostgreSQL search, caching policy, monitoring, and production hardening.
8. Add AI retrieval only after approved content, permission-filtered ingestion, cost controls, prompt-injection defenses, and evaluation data exist.

The initial target is one paid Linux compute server running separate non-root reverse-proxy, frontend, API, PostgreSQL, and worker processes or containers. Only the reverse proxy is public. Identity, private object storage, and encrypted recovery copies remain external trust/recovery boundaries.

Do not expose writable scientific content before Phase 3 object policies exist. Do not create a fourth application role, a client-facing permission editor, complex audit administration, microservices, Redis, or AI-specific tables. Keep module boundaries clear inside one deployable backend and follow the completion gates in `PLAN.md`.
