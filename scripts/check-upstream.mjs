#!/usr/bin/env node

/**
 * Compare the checked-in pstack tree or package version against its upstream.
 *
 * `pnpm run upstream:check` checks cursor/plugins pstack. `--target=release`
 * checks the l246804/dsh-pstack releases. Exits non-zero on drift unless
 * `--no-fail` is passed.
 */

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const target = process.argv.find((arg) => arg.startsWith("--target="))?.slice(9) ?? "pstack";

function compareVersions(a, b) {
  const parse = (value) => {
    const [main, prerelease = ""] = String(value).replace(/^v/, "").split("-", 2);
    const [major, minor, patch] = main.split(".").map(Number);
    return { major, minor, patch, prerelease };
  };
  const left = parse(a);
  const right = parse(b);
  for (const key of ["major", "minor", "patch"]) {
    if (left[key] !== right[key]) return left[key] > right[key] ? 1 : -1;
  }
  if (left.prerelease === right.prerelease) return 0;
  if (left.prerelease === "") return 1;
  if (right.prerelease === "") return -1;
  return left.prerelease > right.prerelease ? 1 : -1;
}

function gh(args) {
  try {
    return execFileSync("gh", args, { encoding: "utf8", env: process.env }).trim();
  } catch (error) {
    throw new Error(
      `Failed to query GitHub via gh. Run \`gh auth login\` or set GH_TOKEN. ${error.message}`,
    );
  }
}

let current;
let latest;
let latestCommit = "";

if (target === "release") {
  current = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
  latest = gh([
    "api",
    "repos/l246804/dsh-pstack/releases?per_page=10",
    "--jq",
    "map(select(.draft == false)) | .[0].tag_name",
  ]);
} else if (target === "pstack") {
  current = JSON.parse(readFileSync(join(ROOT, "pstack/plugin.json"), "utf8")).version;
  latest = JSON.parse(
    gh([
      "api",
      "repos/cursor/plugins/contents/pstack/plugin.json",
      "-H",
      "Accept: application/vnd.github.raw",
    ]),
  ).version;
  if (compareVersions(latest, current) > 0) {
    latestCommit = gh([
      "api",
      "repos/cursor/plugins/commits?path=pstack&per_page=1",
      "--jq",
      ".[0].sha",
    ]);
  }
} else {
  throw new Error(`Unknown --target=${target}; use pstack or release`);
}

const upToDate = compareVersions(current, latest) >= 0;
const result = { up_to_date: upToDate, current, latest };
if (target === "pstack") result.latest_commit = latestCommit;
console.log(JSON.stringify(result, null, 2));

if (process.argv.includes("--github-output")) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) throw new Error("GITHUB_OUTPUT is required with --github-output");
  const lines = [`up_to_date=${upToDate}`, `current=${current}`, `latest=${latest}`];
  if (target === "pstack") lines.push(`latest_commit=${latestCommit}`);
  appendFileSync(outputPath, `${lines.join("\n")}\n`);
}
if (!upToDate && !process.argv.includes("--no-fail")) {
  process.exitCode = 1;
}
