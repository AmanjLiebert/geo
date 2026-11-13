const { resolve } = require("node:path");

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
