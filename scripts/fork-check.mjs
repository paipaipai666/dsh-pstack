#!/usr/bin/env node

/**
 * Fork environment check.
 *
 * Runs before install/build so a missing Node, pnpm, or submodule is reported in one
 * place instead of surfacing later as an opaque build failure.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

function parseVersion(value) {
  const [main, prerelease = ""] = String(value).replace(/^v/, "").split("-", 2);
  const [major, minor, patch] = main.split(".").map(Number);
  return { major, minor, patch, prerelease };
}

function compareVersions(a, b) {
  for (const key of ["major", "minor", "patch"]) {
    if (a[key] !== b[key]) return a[key] > b[key] ? 1 : -1;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (a.prerelease === "") return 1;
  if (b.prerelease === "") return -1;
  return a.prerelease > b.prerelease ? 1 : -1;
}

const checks = [];

function record(name, ok, detail, required = true) {
  checks.push({ name, ok, detail, required });
}

const nodeMinimum = packageJson.engines?.node?.replace(/^>=\s*/, "") ?? "24.21.1";
const nodeCurrent = process.versions.node;
record(
  "Node.js",
  compareVersions(parseVersion(nodeCurrent), parseVersion(nodeMinimum)) >= 0,
  `current ${nodeCurrent}; requires >=${nodeMinimum}`,
);

try {
  const pnpmVersion = execFileSync("pnpm", ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  record("pnpm", true, `current ${pnpmVersion}`);
} catch {
  try {
    const pnpmVersion = execFileSync("corepack", ["pnpm", "--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      env: { ...process.env, COREPACK_HOME: join(ROOT, ".tmp", "corepack") },
    }).trim();
    record("pnpm", true, `current ${pnpmVersion} (via corepack)`);
  } catch {
    record("pnpm", false, "not found on PATH or via corepack");
  }
}

record(
  "upstream/cursor-plugins",
  existsSync(join(ROOT, "upstream/cursor-plugins/pstack/package.json")),
  "run `git submodule update --init upstream/cursor-plugins`",
);

record(
  "upstream/deepseek-harness",
  existsSync(join(ROOT, "upstream/deepseek-harness/package.json")),
  "run `git submodule update --init upstream/deepseek-harness`",
  false,
);

try {
  const dshVersion = execFileSync("dsh", ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  record("DSH CLI", true, `current ${dshVersion}`, false);
} catch {
  record("DSH CLI", false, "not found on PATH (optional for build checks)", false);
}

let failed = false;
for (const check of checks) {
  const mark = check.ok ? "PASS" : check.required ? "FAIL" : "WARN";
  console.log(`${mark} ${check.name}: ${check.detail}`);
  if (!check.ok && check.required) failed = true;
}

if (failed) {
  console.error("\nFork environment is not ready.");
  process.exitCode = 1;
} else {
  console.log("\nFork environment looks ready for local checks.");
}
