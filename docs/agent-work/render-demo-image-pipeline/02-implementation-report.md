# Implementation report

## Status

`IMPLEMENTED_AWAITING_LIVE_DEPLOYMENT`

## Delivered

- Added a fail-closed deployment profile. Demo image processing requires both
  `DEPLOYMENT_PROFILE=demo` and `MEDIA_DEMO_IMAGE_PROCESSING_ENABLED=true`, and the database name
  must contain `demo`.
- Added an API-local, serialized Sharp processor for the temporary demo. It accepts only JPEG,
  PNG, and WebP up to 3 MiB and 12 million decoded pixels, fully decodes the image, rejects
  malformed/type-mismatched/multi-page input, strips metadata, and writes WebP display and
  thumbnail derivatives.
- Kept originals under `quarantine/<demo-prefix>/`, removed the private original before approval,
  and restricted the approval update to the claimed demo image row. Arbitrary quarantined media
  cannot enter this path.
- Reused the existing media ownership, attachment, primary-image, and publication rules. Approved
  demo derivatives use the existing private signed-view flow.
- Disabled PDF/video choices and applied the 3 MiB client limit only in the demo frontend build.
  Normal frontend and production backend defaults remain unchanged.
- Added a Render Blueprint for two Free web services plus a separate Free PostgreSQL database, and
  added a complete deployment/removal guide using a separate private B2 bucket and credentials.
- Because Render Free does not support pre-deploy commands, the Docker entrypoint runs migrations
  and the idempotent seed before NestJS only when `DEPLOYMENT_PROFILE=demo`; production startup
  remains the direct NestJS process.
- The Render frontend proxies same-origin `/api` requests to the API service. This preserves the
  existing secure `SameSite=Lax` session/CSRF cookie design without enabling cross-site cookies.
- The production pg-boss worker, ClamAV processor, PDF processing, and video processing files were
  not modified.

## Verification performed

- Backend full tests: 51 files, 386 tests passed.
- Backend demo/auth/publication-focused tests: 5 files, 155 tests passed.
- Backend TypeScript, ESLint, and Nest build passed.
- Frontend full tests: 24 files, 207 tests passed.
- Frontend focused upload-contract tests: 3 files, 29 tests passed.
- Frontend TypeScript, ESLint, and Next production build passed.
- `git diff --check` passed.
- Docker images build and run locally (`node:24-alpine` multi-stage builds for both services):
  - The frontend standalone server answered `/` with 200, and the build-time `API_INTERNAL_BASE_URL`
    produced a `routes-manifest.json` rewrite for `/api/:path*`.
  - `GET`/`POST` requests through the frontend origin kept their path, query string, `Cookie`, and
    `Origin` headers, and the API `Set-Cookie` response reached the browser host unchanged.
  - The API container applied 19 migrations, ran the idempotent seed, and served
    `/health/ready` with 200 against a PostGIS PostgreSQL 16 database.
  - Both images built and started successfully; the frontend image reported Docker-healthy,
    including with `PORT=10000` as Render sets it.
- Correction found and fixed during Docker verification: the demo entrypoint command chain started
  NestJS even when a migration failed, because the failing `&&` chain was followed by `; exec`.
  The command now exits non-zero before NestJS starts; re-running it against a database without
  PostGIS confirmed the container exits with code 1 and never serves. The frontend `HEALTHCHECK`
  now uses `$PORT` instead of a fixed 8080. Render remains the live container gate.

## Remaining external gate

Provision the separate B2 bucket/key, Firebase authorized domain/secret file, Render Blueprint,
and first administrator invitation, then perform the end-to-end upload, primary-image publication,
and signed-out visitor check in `docs/deployment/render-free-demo.md`.
