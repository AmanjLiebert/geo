# Phase 1 foundation decisions

## Data access: TypeORM

TypeORM is the Phase 1 data-access tool because the maintained Nest integration and PostgreSQL driver cover the features required by the plan:

- PostgreSQL `jsonb` columns for validated structured attributes.
- PostGIS `geometry` and `geography` columns with spatial feature type and SRID support.
- Explicit transactions and isolation levels.
- Forward migrations with automatic schema synchronization disabled.
- A bounded PostgreSQL connection pool.

Every schema change must be represented by a reviewed migration. `synchronize` and `migrationsRun` remain disabled in application startup. Deployment runs migrations as a separate gated step before starting the API or worker.

## Durable jobs: pg-boss

pg-boss keeps retryable work in PostgreSQL and avoids adding Redis to the first server. The worker is a separate process built from the same backend image. Jobs must remain idempotent because retries can run the same logical work again after a crash or timeout.

The library owns the versioned tables in its configured `pgboss` schema. Application tables remain owned by TypeORM migrations. Run `npm run job:proof` after PostgreSQL is available to prove enqueue, claim, process, and graceful shutdown.

## Sessions

Phase 1 reserved a server-side, revocable session boundary. Phase 2 selected Firebase Authentication for external Google/phone verification and implemented opaque PostgreSQL sessions. See `phase-2-identity.md`; no canonical session or application role depends on browser or process memory.

## Deployment boundary

The first deployment is a modular monolith on one paid Linux server:

- Caddy is the only publicly exposed process.
- The static showcase frontend, NestJS API, worker, and PostgreSQL run on a private container network.
- API and worker are separate non-root containers built from one backend image.
- Migrations and configuration-only seeds run as one-shot gates before the API starts.
- PostgreSQL data, Caddy state, and application containers have separate lifecycle boundaries.

The server is not highly available. Recovery depends on encrypted backups stored outside the server and a repeatable rebuild procedure.

## Backup and recovery

Database dumps are encrypted and copied to an external restic repository. A backup kept only on the application server is not accepted as a recovery copy. Production launch requires a successful restore into a disposable database whose name ends in `_restore_check`.

Recovery objectives must be agreed with the client before real data is accepted. Initial engineering targets for discussion are:

- Recovery point objective: at most 24 hours of accepted content loss.
- Recovery time objective: restore service within 8 hours.

These are provisional targets, not contractual promises.
