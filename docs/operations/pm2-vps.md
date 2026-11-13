# PM2/Caddy: one root environment file

Use Node.js 24.11+ and one repository-root `.env`, based on root `.env.example`. Fill in database URL, HTTPS domain/CORS, Firebase Admin project/path, public Firebase web settings and private media storage. For PM2 set `MEDIA_SCANNER_HOST=localhost`. Firebase service-account JSON remains a separate protected file outside Git. Never commit populated settings.

For an existing installation, manually transfer required values and move old backend/frontend `.env*` files into protected backups outside the module directories. Do not delete private files before verifying the replacement. Backend ignores module-local files; Next.js can still use old frontend files as fallback if root values are missing, so retire those copies. No real secrets are automatically read, copied or changed during this implementation.

From the repository root, as the non-root deployment user:

```bash
# Only when root .env does not already exist:
cp -n .env.example .env
nano .env
chmod 600 .env
npm --prefix backend ci
npm --prefix backend run build
# Back up an existing database first; stop if a command fails.
npm --prefix backend run db:migrate:prod
npm --prefix backend run db:seed:prod
npm --prefix frontend ci
npm --prefix frontend run build
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

Execute the command printed by `pm2 startup`. Database/role initialization does not populate a scientific collection. All backend maintenance commands load root `.env`. PM2 applies production/loopback overrides. Injected shell or container values take precedence over file values. Next.js npm commands load root `.env` before starting Next; only `NEXT_PUBLIC_*` values are embedded publicly. Never prefix server secrets with `NEXT_PUBLIC_` or put them in Next.js `env` config. Rebuild the frontend after changing public configuration.

Point DNS at the VPS. Preserve existing Caddy sites and add:

```caddyfile
your-domain.com {
    encode zstd gzip
    request_body {
        max_size 2MB
    }
    @backend path /api/* /health/*
    reverse_proxy @backend 127.0.0.1:4000
    reverse_proxy 127.0.0.1:3000
}
```

Validate the host Caddyfile before reloading. Only Caddy exposes public 80/443. PostgreSQL/PostGIS, ClamAV, Poppler and FFmpeg must already be configured. Keep application, database and scanner ports private. Enable Google/Phone in Firebase and authorize the exact domain. Configure private media-bucket upload CORS for that HTTPS origin.

Create the first admin invitation with `INITIAL_ADMIN_EMAIL=you@example.com npm --prefix backend run auth:create-initial-admin:prod`; sign in with the matching verified account at the private invitation URL. Ordinary sign-in creates a visitor.

For updates: pull reviewed `main`, install locked dependencies, build, back up before required migrations, and `pm2 restart ecosystem.config.cjs --env production --update-env`. Verify readiness, sign-in/out, teacher/admin access, uploads and publication. Retain the previous release and off-server backups. Rollback this configuration by restoring the previous release and its protected per-module settings; no data/schema changes are introduced here.

For local development set root `NODE_ENV=development`, `AUTH_COOKIE_SECURE=false`, site/CORS to `http://localhost:3000`, and `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`. Production uses secure cookies, HTTPS site/CORS, and an empty public API base for Caddy same-origin routing. Docker Compose still substitutes root settings and injects them into containers without mounting root `.env`; its scanner host uses `COMPOSE_MEDIA_SCANNER_HOST` (default `clamav`).
