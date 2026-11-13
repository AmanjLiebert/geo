/**
 * PM2 production processes for the Hostinger VPS.
 *
 * Before starting PM2:
 *   - Configure backend/.env with production database, Firebase, scanner,
 *     and private media storage settings.
 *   - Configure frontend/.env.local with the public Firebase web settings.
 *   - Build both apps with npm run build.
 *
 * Caddy should proxy /api/* and /health/* to 127.0.0.1:4000 and all other
 * paths to 127.0.0.1:3000. The frontend browser uses same-origin API paths.
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
      node_args: ["-r", "dotenv/config"],
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      time: true,
      env_production: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: "4000",
        TRUST_PROXY: "true",
        SWAGGER_ENABLED: "false",
      },
    },
    {
      name: "geo-kurdistan-worker",
      cwd: backend,
      script: "dist/worker.js",
      interpreter: "node",
      node_args: ["-r", "dotenv/config"],
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
      script: "node_modules/next/dist/bin/next",
      args: "start --hostname 127.0.0.1 --port 3000",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      time: true,
      env_production: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "127.0.0.1",
        NEXT_PUBLIC_API_BASE_URL: "",
        API_INTERNAL_BASE_URL: "http://127.0.0.1:4000",
      },
    },
  ],
};
