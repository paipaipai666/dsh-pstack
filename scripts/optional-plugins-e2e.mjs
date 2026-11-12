#!/usr/bin/env node

/**
 * Install one optional bundle into a throwaway headless profile and check that
 * the composed profile references its rows. This proves the bundle is on the
 * host's load path; it does not start a model session.
 *
 * Usage:
 *   node scripts/optional-plugins-e2e.mjs
 *   node scripts/optional-plugins-e2e.mjs --plugin @deepseek-ai/dsh-experimental-forge-bundle
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const plugin = process.argv.includes("--plugin")
  ? process.argv[process.argv.indexOf("--plugin") + 1]
  : "@deepseek-ai/dsh-experimental-session-search";
const home = join(process.cwd(), ".tmp", `optional-plugins-${process.pid}`);
const bin = process.env.DSH_BIN ?? (process.platform === "win32" ? "dsh.cmd" : "dsh");
const useShell = process.platform === "win32" && /\.cmd$/i.test(bin);
const launchBin = useShell ? `"${bin}"` : bin;

function run(args) {
  const result = spawnSync(launchBin, args, {
    env: { ...process.env, DSH_HOME: home },
    encoding: "utf8",
    stdio: "pipe",
    shell: useShell,
  });
  if (result.error !== undefined) {
    throw new Error(`failed to run dsh: ${result.error.message}; set DSH_BIN`);
  }
  if (result.status !== 0) {
    throw new Error(`dsh ${args.join(" ")} exited ${result.status}\n${result.stderr}`);
  }
  return `${result.stdout}${result.stderr}`;
}

try {
  mkdirSync(home, { recursive: true });
  run(["--profile", "pstack-optional", "--from-default-profile", "headless", "--dump-config"]);
  run(["plugin", "--profile", "pstack-optional", "add", plugin]);
  const composed = run(["--profile", "pstack-optional", "--dump-config"]);
  if (!composed.includes(plugin)) {
    throw new Error(`the composed profile does not mention ${plugin}`);
  }
  console.log(`optional-plugins-e2e OK: ${plugin} is on the profile load path`);
} finally {
  if (existsSync(home)) rmSync(home, { recursive: true, force: true });
}
