/**
 * PM2 production processes for the Hostinger VPS.
 *
 * Before starting PM2:
 *   - Configure the root .env with database, Firebase, scanner, private
 *     media storage and public Firebase web settings.
 *   - Build both apps with npm run build.
 *
 * Caddy should proxy /api/* and /health/* to 127.0.0.1:4200 and all other
 * paths to 127.0.0.1:3200. The frontend browser uses same-origin API paths.
 */
const path = require("node:path");

const root = __dirname;
const backend = path.join(root, "backend");
const frontend = path.join(root, "frontend");

module.exports = {
  apps: [
    {
      name: "geo-kurdistan-api",
      cwd: backend,
      script: "dist/main.js",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      time: true,
      env_production: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: "4200",
        TRUST_PROXY: "true",
        AUTH_COOKIE_SECURE: "true",
        SWAGGER_ENABLED: "false",
      },
    },
    {
      name: "geo-kurdistan-worker",
      cwd: backend,
      script: "dist/worker.js",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      time: true,
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "geo-kurdistan-frontend",
      cwd: frontend,
      script: "scripts/next.cjs",
      args: "start --hostname 127.0.0.1 --port 3200",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      time: true,
      env_production: {
        NODE_ENV: "production",
        PORT: "3200",
        HOSTNAME: "127.0.0.1",
        NEXT_PUBLIC_API_BASE_URL: "",
        API_INTERNAL_BASE_URL: "http://127.0.0.1:4200",
      },
    },
  ],
};
