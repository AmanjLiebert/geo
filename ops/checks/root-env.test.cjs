const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

function fixture(t, withFile = true) {
  const root = mkdtempSync(join(tmpdir(), "gk-next-env-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const frontend = join(root, "frontend");
  mkdirSync(join(frontend, "scripts"), { recursive: true });
  mkdirSync(join(frontend, "node_modules/next/dist/bin"), { recursive: true });
  copyFileSync(resolve(__dirname, "../../frontend/scripts/next.cjs"), join(frontend, "scripts/next.cjs"));
  writeFileSync(join(frontend, "node_modules/next/dist/bin/next.js"),
    'console.log(JSON.stringify({publicValue:process.env.NEXT_PUBLIC_FIXTURE,mode:process.env.NODE_ENV,args:process.argv.slice(2),flags:process.execArgv}));');
  if (withFile) writeFileSync(join(root, ".env"), 'NEXT_PUBLIC_FIXTURE="root fixture"\nNODE_ENV=development\n');
  // A conflicting module-local file must not win over root values.
  writeFileSync(join(frontend, ".env"), 'NEXT_PUBLIC_FIXTURE=legacy\n');
  return { root, frontend };
}

test("Next launcher resolves root independent of cwd and preserves injected values", (t) => {
  const { root, frontend } = fixture(t);
  const result = spawnSync(process.execPath, [join(frontend, "scripts/next.cjs"), "build"], {
    cwd: root, encoding: "utf8", env: { ...process.env, NODE_ENV: "production", NEXT_PUBLIC_FIXTURE: "" },
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.mode, "production");
  assert.equal(output.publicValue, "");
  assert.deepEqual(output.args, ["build"]);
  assert.deepEqual(output.flags, []);
});

test("Next launcher loads root configuration before CLI execution", (t) => {
  const { root, frontend } = fixture(t);
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_FIXTURE;
  const result = spawnSync(process.execPath, [join(frontend, "scripts/next.cjs"), "start", "--port", "3000"], { cwd: root, encoding: "utf8", env });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.publicValue, "root fixture");
  assert.deepEqual(output.args, ["start", "--port", "3000"]);
});

test("Next launcher supports container-only injected configuration", (t) => {
  const { root, frontend } = fixture(t, false);
  const result = spawnSync(process.execPath, [join(frontend, "scripts/next.cjs"), "build"], {
    cwd: root, encoding: "utf8", env: { ...process.env, NEXT_PUBLIC_FIXTURE: "injected" },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).publicValue, "injected");
});

test("PM2 uses the root-aware frontend launcher and preserves private loopback ports", () => {
  const { apps } = require("../../ecosystem.config.cjs");
  const api = apps.find((app) => app.name === "geo-kurdistan-api");
  const frontend = apps.find((app) => app.name === "geo-kurdistan-frontend");
  assert.equal(api.env_production.HOST, "127.0.0.1");
  assert.equal(frontend.script, "scripts/next.cjs");
  assert.match(frontend.args, /--hostname 127\.0\.0\.1 --port 3000/);
  assert.equal(frontend.env_production.NEXT_PUBLIC_API_BASE_URL, "");
  assert.ok(apps.every((app) => !app.node_args?.includes("dotenv/config")));
});
