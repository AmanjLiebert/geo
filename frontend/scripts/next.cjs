/* eslint-disable @typescript-eslint/no-require-imports -- This Node CLI launcher is intentionally CommonJS. */
const { resolve } = require("node:path");
const { existsSync } = require("node:fs");

// Next otherwise fills missing values from module-local files after our preload.
const legacyFiles = [".env", ".env.local", ".env.development", ".env.development.local",
  ".env.production", ".env.production.local", ".env.test", ".env.test.local"];
if (legacyFiles.some((name) => existsSync(resolve(__dirname, "..", name)))) {
  throw new Error("Move settings from frontend .env files into the repository-root .env, then move the old files outside frontend before starting Next.js.");
}

// Preload before Next reads its configuration or compiles NEXT_PUBLIC_* values.
// Do not use --env-file in execArgv: Next copies flags into build workers'
// NODE_OPTIONS, where Node disallows that option.
try {
  process.loadEnvFile(resolve(__dirname, "../../.env"));
} catch (error) {
  if (error.code !== "ENOENT") {
    throw new Error("Unable to read the root environment file. Check file permissions.");
  }
}

// Run in the same process so PM2 signals reach Next directly.
require("next/dist/bin/next");
