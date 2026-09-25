# Geo-Kurdistan

Geo-Kurdistan is a geological knowledge platform for exploring the geology, discoveries, resources, research, places, and geological heritage of the Kurdistan Region.

The existing Next.js visitor experience is the visual baseline. Development is now moving toward a secure, configurable production platform with a NestJS API, PostgreSQL, editorial tools, and future AI-assisted discovery.

## Start here

1. Read [`PLAN.md`](PLAN.md) for the ordered implementation plan.
2. Read [`MAP.md`](MAP.md) for the system, data, permission, and workflow maps.
3. Read [`DESIGN.md`](DESIGN.md) before changing the interface.
4. Follow [`AGENTS.md`](AGENTS.md) for repository-wide development rules.

## Repository

- `frontend/` — Next.js public site plus the Phase 2 visitor/invited-user account entry.
- `backend/` — NestJS API with the Phase 1 foundation and active Phase 2 identity/access modules.
- `docs/` — supporting content, media, and operational documentation.

## Frontend commands

Run from `frontend/`:

```text
npm install
npm run dev
npm run test
npm run lint
npm run build
```

The frontend still uses local data today. Replace that data through its repository/query boundary during Phase 6; do not rewrite working pages just to connect the API.

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
