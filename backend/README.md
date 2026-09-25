# Geo-Kurdistan backend

This directory is reserved for the NestJS modular monolith described in the root [`PLAN.md`](../PLAN.md) and [`MAP.md`](../MAP.md).

Implementation order:

1. Record the data-access, PostgreSQL-backed queue, session, one-server deployment, backup, and recovery decisions.
2. Bootstrap configuration, secret validation, request limits, logging, errors, health, metrics, API versioning, and OpenAPI.
3. Add PostgreSQL/PostGIS, connection pooling, migrations, configuration-only seeds, a durable worker/job proof, and tested off-server backup/restore.
4. Add managed identity verification, secure sessions, CSRF protection when cookie-based, deny-by-default permission/scope authorization, privileged-account protection, rate limits, and audit events.
5. Add taxonomy, record types, versioned templates, translations, records, revisions, and archive/restore only after protected writes are enforced.
6. Add evidence, geography, private media processing, research, geological news, managed site/ownership pages, review, scheduling, and publication.
7. Add public queries, typed frontend contracts, PostgreSQL search, caching policy, monitoring, and production hardening.
8. Add AI retrieval only after approved content, permission-filtered ingestion, cost controls, prompt-injection defenses, and evaluation data exist.

The initial target is one paid Linux compute server running separate non-root reverse-proxy, frontend, API, PostgreSQL, and worker processes or containers. Only the reverse proxy is public. Identity, private object storage, and encrypted recovery copies remain external trust/recovery boundaries.

Do not expose writable content before authentication and object-level authorization. Do not create microservices, add Redis, or add AI-specific tables during the foundation phase. Keep module boundaries clear inside one deployable backend and follow the completion gates in `PLAN.md`.
