# Geo-Kurdistan

Geo-Kurdistan is a geological knowledge platform for exploring the geology, discoveries, resources, research, places, and geological heritage of the Kurdistan Region.

The existing Next.js visitor experience is the visual baseline. The repository now contains the Next.js public site/dashboard, NestJS API and worker, PostgreSQL/PostGIS foundation, protected scientific workflows, and runtime public Explore integration. Research, managed organization content, broader discovery, production hardening, and optional AI remain incomplete or future work.

## Start here

1. Read [`PLAN.md`](PLAN.md) for the ordered implementation plan.
2. Read [`MAP.md`](MAP.md) for the system, data, permission, and workflow maps.
3. Read [`DESIGN.md`](DESIGN.md) before changing the interface.
4. Follow [`AGENTS.md`](AGENTS.md) for repository-wide development rules.
5. For formal critical work, follow the active pointer in [`MEMORY.md`](MEMORY.md) and its task assignment.

## Repository

- `frontend/` — Next.js public site, account flows, public Explore, and protected dashboard.
- `backend/` — NestJS modular API and worker with identity, scientific content, evidence, media, research, publishing, and public-safe projections.
- `docs/` — architecture decisions, maintenance policy, operational runbooks, scientific-structure maintenance, and immutable task evidence.

## Frontend commands

Run from `frontend/`:

```text
npm install
npm run dev
npm run test
npm run lint
npm run build
```

Public Explore reads published PostgreSQL content through the public scientific API. Some unfinished or showcase-only routes may still use local presentation data; do not present that content as canonical scientific data.

## Backend commands

Run from `backend/` after copying `.env.example` to `.env` and providing PostgreSQL:

```text
npm install
npm run db:migrate
npm run db:seed
npm run job:proof
npm run dev
```

Firebase Google/phone setup and the first-admin invitation procedure are documented in
[`docs/operations/firebase-auth-setup.md`](docs/operations/firebase-auth-setup.md).

Quality checks:

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

The root `compose.yaml` defines the one-server topology. Copy the root `.env.example` to `.env`, replace every placeholder, and read the operations runbooks before using it with real data.
