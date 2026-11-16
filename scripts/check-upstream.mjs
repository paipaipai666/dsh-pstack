#!/usr/bin/env node

/**
 * Check whether cursor/plugins has a newer pstack release than the generated tree.
 *
 * Local `pnpm run upstream:check` exits non-zero when an update exists. The scheduled
 * workflow adds `--no-fail` and writes the result to `$GITHUB_OUTPUT` instead.
 */

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

function readUpstreamPlugin() {
  try {
    const raw = execFileSync(
      "gh",
      [
        "api",
        "repos/cursor/plugins/contents/pstack/plugin.json",
        "-H",
        "Accept: application/vnd.github.raw",
      ],
      { encoding: "utf8", env: process.env },
    );
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Failed to read cursor/plugins/pstack/plugin.json via gh. Run \`gh auth login\` or set GH_TOKEN. ${error.message}`,
    );
  }
}

const localPlugin = JSON.parse(readFileSync(join(ROOT, "pstack/plugin.json"), "utf8"));
const upstreamPlugin = readUpstreamPlugin();
const upToDate = localPlugin.version === upstreamPlugin.version;
const result = {
  up_to_date: upToDate,
  current: localPlugin.version,
  latest: upstreamPlugin.version,
};
console.log(JSON.stringify(result, null, 2));

if (process.argv.includes("--github-output")) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) throw new Error("GITHUB_OUTPUT is required with --github-output");
  appendFileSync(
    outputPath,
    `up_to_date=${upToDate}\ncurrent=${localPlugin.version}\nlatest=${upstreamPlugin.version}\n`,
  );
}
if (!upToDate && !process.argv.includes("--no-fail")) {
  process.exitCode = 1;
}
