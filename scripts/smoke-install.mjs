#!/usr/bin/env node

/**
 * Install a built dsh-pstack tarball into an isolated DSH_HOME and assert the bundle
 * rows load. This is the local counterpart of the GitHub Actions package artifact.
 *
 * Usage:
 *   DSH_CLI="D:\\DeepSeek Harness\\resources\\runtime\\cli\\bin\\dsh.cmd" \
 *     node scripts/smoke-install.mjs path/to/dsh-pstack.tgz
 */

import {
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
mkdirSync(join(ROOT, ".tmp"), { recursive: true });
// `dsh plugin add` resolves a relative path against the profile directory, so hand it
// an absolute one no matter how the caller spelled it.
const tarball = process.argv[2] ? resolve(process.argv[2]) : undefined;
if (!tarball) {
  console.error("usage: node scripts/smoke-install.mjs <dsh-pstack.tgz>");
  process.exit(2);
}

const cli = process.env.DSH_CLI ?? "dsh";
const useShell = process.platform === "win32";
const home = mkdtempSync(join(ROOT, ".tmp", "dsh-smoke-"));

function run(args, options = {}) {
  const command = useShell ? `"${cli}"` : cli;
  const commandArgs = useShell ? args.map((arg) => `"${arg.replaceAll('"', '\\"')}"`) : args;
  const stdoutPath = join(home, ".stdout.log");
  const stderrPath = join(home, ".stderr.log");
  const stdoutFd = options.capture ? openSync(stdoutPath, "w") : undefined;
  const stderrFd = options.capture ? openSync(stderrPath, "w") : undefined;
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    stdio: options.capture ? ["ignore", stdoutFd, stderrFd] : "inherit",
    shell: useShell,
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, DSH_HOME: home },
  });
  if (stdoutFd !== undefined) closeSync(stdoutFd);
  if (stderrFd !== undefined) closeSync(stderrFd);
  if (result.status !== 0) {
    const stderr = options.capture ? readFileSync(stderrPath, "utf8") : "";
    throw new Error(
      `${cli} ${args.join(" ")} failed (${String(result.status)}): ${stderr} ${result.error?.message ?? ""}`,
    );
  }
  return options.capture ? readFileSync(stdoutPath, "utf8") : "";
}

try {
  run(["plugin", "--profile", "web", "add", tarball]);
  const config = run(["--profile", "web", "--dump-config"], { capture: true });
  const required = [
    "- id: pstack",
    "- id: pstack-skills",
    "- id: pstack-vendored-skills",
    "- id: pstack-authored-skills",
    "- id: pstack-models",
    "- id: pstack-roles",
    "- id: pstack-role-catalog",
    "- id: pstack-subagent",
    "- id: pstack-doctor",
    "- id: pstack-script-policy",
    "- id: pstack-script",
    "- id: pstack-remote",
    "- id: pstack-chart",
    "- id: preset-poteto-mode",
    "- id: preset-poteto-mode-creator",
    "- id: preset-poteto-agent",
    "- id: preset-comment-sicko",
    "- id: preset-readonly",
  ];
  for (const line of required) {
    if (!config.includes(line)) throw new Error(`missing bundle row: ${line}`);
  }
  if (!/maxDepth:\s*2/.test(config)) throw new Error("pstack-subagent maxDepth is not 2");

  const installed = join(home, "profiles", "web", "node_modules", "@paipaipai666", "dsh-pstack");
  for (const file of ["dist/client.js", "dist/pstack/docs/harness/dsh.md"]) {
    if (!existsSync(join(installed, file))) throw new Error(`missing packaged file: ${file}`);
  }
  const skillsRoot = join(installed, "dist", "pstack", "skills");
  const cursorNames = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(".md")) {
        const text = readFileSync(path, "utf8");
        for (const pattern of [/~\/\.cursor/, /\bsubagent_type\b/, /\bgeneralPurpose\b/]) {
          if (pattern.test(text)) cursorNames.push(`${path}: ${pattern}`);
        }
      }
    }
  };
  walk(skillsRoot);
  if (cursorNames.length > 0)
    throw new Error(`packaged skill catalog still carries Cursor names: ${cursorNames.join(", ")}`);

  console.log(`smoke-install OK: ${tarball}`);
  console.log(readFileSync(join(home, "profiles", "web", "package.json"), "utf8"));
} finally {
  rmSync(home, { recursive: true, force: true });
}
