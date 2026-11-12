#!/usr/bin/env node

/**
 * Run the five bundled pstack scripts through the Desktop Electron binary.
 *
 * The npm CLI runs the same code under Node. This harness proves the other
 * half of `pstack_script`: `process.execPath` is `DeepSeek Harness.exe`,
 * `ELECTRON_RUN_AS_NODE=1` is added, and every script file starts.
 *
 * Usage:
 *   node scripts/desktop-e2e.mjs
 *   DSH_DESKTOP_BIN=/path/to/DeepSeek\ Harness node scripts/desktop-e2e.mjs
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const childFlag = "--child";

function desktopBinary() {
  return process.env.DSH_DESKTOP_BIN ?? "D:\\DeepSeek Harness\\DeepSeek Harness.exe";
}

if (!process.argv.includes(childFlag)) {
  const binary = desktopBinary();
  if (!existsSync(binary)) {
    console.error(`desktop-e2e: Desktop binary not found at ${binary}`);
    console.error("Set DSH_DESKTOP_BIN to the DeepSeek Harness executable.");
    process.exit(2);
  }
  const result = spawnSync(binary, [fileURLToPath(import.meta.url), childFlag], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: "inherit",
  });
  if (result.error !== undefined) {
    console.error(`desktop-e2e: ${result.error.message}`);
    process.exit(2);
  }
  process.exit(result.status ?? 1);
}

const { runForeground } = await import("../dist/script.mjs");

if (process.versions.electron === undefined) {
  console.error("desktop-e2e: child is not running under Electron");
  process.exit(2);
}
if (process.execPath !== desktopBinary() && process.env.DSH_DESKTOP_BIN === undefined) {
  console.error(`desktop-e2e: unexpected execPath ${process.execPath}`);
  process.exit(2);
}

const work = mkdtempSync(join(tmpdir(), "pstack-desktop-e2e-"));
const checks = [
  {
    id: "log",
    args: [join(work, "log.tsv"), "phase", "decision", "why", "evidence", "result"],
    expected: 0,
    verify: () => readFileSync(join(work, "log.tsv"), "utf8").includes("phase"),
  },
  { id: "check-plan", args: [], expected: 2 },
  { id: "worktree-audit", args: ["--help"], expected: 0 },
  { id: "watch-pr", args: ["--help"], expected: 0 },
  { id: "statechart", args: [], expected: 2 },
];

let failed = 0;
try {
  console.log(
    JSON.stringify({
      electron: process.versions.electron,
      execPath: process.execPath,
      electronRunAsNode: process.env.ELECTRON_RUN_AS_NODE,
    }),
  );
  for (const check of checks) {
    const result = await runForeground({ id: check.id, args: check.args, background: false });
    const ok = result.exitCode === check.expected && (check.verify?.() ?? true);
    console.log(
      `${ok ? "PASS" : "FAIL"} ${check.id} exit=${String(result.exitCode)} expected=${check.expected}`,
    );
    if (!ok) failed += 1;
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
if (failed > 0) process.exit(1);
console.log(`desktop-e2e OK: ${checks.length} scripts started under ${process.execPath}`);
