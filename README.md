# Geo-Kurdistan

Geo-Kurdistan is a geological knowledge platform for exploring the geology, discoveries, resources, research, places, and geological heritage of the Kurdistan Region.

The existing Next.js visitor experience is the visual baseline. Development is now moving toward a secure, configurable production platform with a NestJS API, PostgreSQL, editorial tools, and future AI-assisted discovery.

## Start here

1. Read [`PLAN.md`](PLAN.md) for the ordered implementation plan.
2. Read [`MAP.md`](MAP.md) for the system, data, permission, and workflow maps.
3. Read [`DESIGN.md`](DESIGN.md) before changing the interface.
4. Follow [`AGENTS.md`](AGENTS.md) for repository-wide development rules.

## Repository

- `frontend/` — Next.js public site and future administration interface.
- `backend/` — NestJS API workspace; implementation begins in Phase 1.
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
