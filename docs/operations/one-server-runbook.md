# One-server runbook

## Prerequisites

- A supported Linux server with Docker Engine and Docker Compose.
- DNS for the production domain pointing to the server.
- Firewall rules allowing only SSH from approved administration addresses plus public TCP 80/443 and UDP 443.
- A private, encrypted external restic repository for backups.
- A non-root deployment account with key-only SSH access.
- A Firebase project with Google/phone authentication and a protected backend service-account file.

## First deployment

1. Copy `.env.example` to `.env` on the server and replace every placeholder.
2. URL-encode the database password inside `COMPOSE_DATABASE_URL`.
3. Set `SITE_ADDRESS` to the real HTTPS domain and set `CORS_ORIGINS` to approved browser origins.
4. Keep `SWAGGER_ENABLED=false` in production unless the API documentation is deliberately protected.
5. Complete `docs/operations/firebase-auth-setup.md` and place the Firebase service account outside Git.
6. Run `docker compose build`.
7. Run `docker compose up -d`.
8. Create the first admin invitation with the documented maintenance command.
9. Verify `https://<domain>/health/live`, `https://<domain>/health/ready`, visitor sign-in, invited admin sign-in, and sign-out.
10. Verify that PostgreSQL, the API port, the worker, and `/metrics` are not reachable directly from the public network.
11. Run the PostgreSQL job proof from the backend image or a controlled maintenance shell.
12. Run the backup and restore rehearsal before entering real content.

## Release procedure

1. Produce and retain the current database backup.
2. Build the new immutable images.
3. Run the migration container and stop if it fails.
4. Run the idempotent configuration seed.
5. Replace API and worker containers, then the frontend.
6. Verify readiness, public pages, logs, metrics, and the queue.
7. Keep the previous application images available for rollback. Never blindly reverse a committed data migration.

## Operational checks

- `/health/live` proves the API process is running.
- `/health/ready` proves the API can query PostgreSQL.
- `/metrics` stays on the private network and is collected by the chosen monitoring system.
- Logs are structured JSON and must be shipped off-server before production launch.
- Alerts must cover unavailable readiness, repeated restarts, disk pressure, database capacity, backup failure, and worker failure.

## Scaling path

Measure before adding infrastructure. First optimize queries, indexes, connection limits, cache policy, and job concurrency. Later, PostgreSQL or the worker can move to another host, followed by multiple stateless API/frontend instances behind the proxy.
