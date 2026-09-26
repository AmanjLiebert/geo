# Operational recovery rehearsal — 2026-09-26

## Result

The Docker/PostgreSQL/worker/backup/restore rehearsal passed after two defects found by the rehearsal were corrected:

1. The queue proof previously competed with the production worker and could time out after that worker correctly claimed the job. It now enqueues a proof job and observes its terminal state, proving that the real worker processed it.
2. The dump checksum previously stored an absolute temporary path and failed after restoration into a different temporary directory. It now stores the dump basename, making checksum verification portable.

The corrected scripts first passed against a local encrypted repository and were then exercised against a genuinely off-server, private Backblaze B2 repository. The B2 snapshot restored successfully into both a disposable database and a separate full Compose environment. This satisfies the Phase 1 development recovery gate. A rebuild on the eventual production Linux server remains a production-launch rehearsal.

## Evidence

- Migrations: no pending migrations; command completed successfully.
- Configuration seed: two platform settings and the three fixed role bundles seeded idempotently.
- Compose: proxy, frontend, API, PostgreSQL/PostGIS, and worker healthy.
- Public ports: only the reverse proxy publishes host ports; API, worker, and PostgreSQL remain internal.
- Durable queue: real worker completed proof job `23bade6a-0907-4f88-a246-5f08780e4380` after the corrected proof was deployed.
- Encrypted restic snapshot: `24454e47`.
- Disposable restore database: `geo_kurdistan_e9a34d21_restore_check`; removed after verification.
- Restore duration: 34 seconds for the backup/restore/count-comparison sequence.
- Checksum: verified successfully before `pg_restore`.
- PostGIS: version query succeeded after restore.
- Configuration settings: `platform.content_state` and `platform.identity` present after restore.
- Source identity counts: users 4, external identities 4, sessions 25, invitations 7, audit events 37, settings 2.
- Restored identity counts: users 4, external identities 4, sessions 25, invitations 7, audit events 37, settings 2.
- Backend verification: 31 tests passed; typecheck, lint, formatting, and build passed.
- Production dependency audit: backend and frontend reported zero known vulnerabilities.

### Off-server Backblaze B2 evidence

- Recovery boundary: private Backblaze B2 bucket with provider-managed server-side encryption enabled.
- Access: a bucket-restricted read/write application key supplied to the scripts at runtime; no key value is stored in this report or tracked by Git.
- Remote restic snapshot: `eb4ae4ea`.
- Remote backup/restore/count-comparison duration: 74.9 seconds.
- Disposable restore database: `geo_kurdistan_28e3ffd4_restore_check`; removed after verification.
- Checksum, `pg_restore`, PostGIS, and platform-setting checks passed.
- Source and restored counts matched: users 4, external identities 4, sessions 25, invitations 7, audit events 37, settings 2.

### Isolated full-rebuild evidence

- Compose project: `geo-kurdistan-rebuild`, isolated from the normal development stack with separate containers, network, and volumes.
- Database: restored from off-server snapshot `eb4ae4ea` before application startup.
- Services: database, migrations, seed, API, worker, frontend, and reverse proxy started successfully.
- Readiness: the rebuilt API returned `ready`.
- Queue: the rebuilt real worker completed proof job `ddbbf580-4260-42e7-8052-2c1a43e76bd6`.
- Published port: only `127.0.0.1:18080 -> proxy:80`.
- Full rebuild verification duration: 60.6 seconds after the remote restore stage.
- Cleanup: all isolated containers, the network, and volumes were removed; the normal development stack remained healthy.

Counts are operational invariants only. No personal identifiers, tokens, credentials, or secret values are included in this report.

## Remaining production evidence

1. Repeat the full rebuild on the selected production Linux server from versioned configuration and the external backup.
2. Record production recovery time, operator, snapshot, result, and corrective actions against the approved recovery objective.
3. Verify production monitoring alerts, domain/TLS configuration, quotas, and recovery-key ownership before launch.
