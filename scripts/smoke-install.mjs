#!/usr/bin/env node

/**
 * Install a built dsh-pstack tarball into an isolated DSH_HOME and assert the bundle
 * rows load. This is the local counterpart of the GitHub Actions package artifact.
 *
 * Usage:
 *   DSH_CLI="D:\\DeepSeek Harness\\resources\\runtime\\cli\\bin\\dsh.cmd" \
 *     node scripts/smoke-install.mjs path/to/dsh-pstack.tgz
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const tarball = process.argv[2];
if (!tarball) {
  console.error("usage: node scripts/smoke-install.mjs <dsh-pstack.tgz>");
  process.exit(2);
}

const cli = process.env.DSH_CLI ?? "dsh";
const useShell = process.platform === "win32";
const home = mkdtempSync(join(ROOT, ".tmp", "dsh-smoke-"));

function run(args, options = {}) {
  const result = spawnSync(cli, args, {
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    shell: useShell,
    env: { ...process.env, DSH_HOME: home },
  });
  if (result.status !== 0) {
    throw new Error(`${cli} ${args.join(" ")} failed (${String(result.status)}): ${result.stderr ?? ""}`);
  }
  return result.stdout ?? "";
}

try {
  run(["plugin", "--profile", "web", "add", tarball]);
  const config = run(["--profile", "web", "--dump-config"], { capture: true });
  const required = [
    "- id: pstack",
    "- id: pstack-models",
    "- id: pstack-roles",
    "- id: pstack-role-catalog",
    "- id: pstack-doctor",
    "- id: pstack-subagent",
    "- id: pstack-script",
  ];
  for (const line of required) {
    if (!config.includes(line)) throw new Error(`missing bundle row: ${line}`);
  }
  if (!/maxDepth:\s*3/.test(config)) throw new Error("pstack-subagent maxDepth is not 3");
  console.log(`smoke-install OK: ${tarball}`);
  console.log(readFileSync(join(home, "profiles", "web", "package.json"), "utf8"));
} finally {
  rmSync(home, { recursive: true, force: true });
}
