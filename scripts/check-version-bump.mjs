#!/usr/bin/env node
// Verify that an automated PR carries its own release version, changelog, and
// bilingual compatibility-table entry. Runs only for branches made by
// issue-autosync (auto/*); normal contributor PRs are unaffected.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;

function parseVersion(value) {
  if (typeof value !== "string" || !VERSION.test(value)) {
    throw new Error(`invalid version ${JSON.stringify(value)}`);
  }
  const [core, prerelease = ""] = value.split("-", 2);
  return {
    core: core.split(".").map((part) => Number(part)),
    prerelease: prerelease === "" ? [] : prerelease.split("."),
  };
}

export function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.core[index] !== b.core[index]) return a.core[index] - b.core[index];
  }
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    return b.prerelease.length - a.prerelease.length;
  }
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = a.prerelease[index];
    const rightPart = b.prerelease[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;
    const leftNumber = /^\d+$/.test(leftPart);
    const rightNumber = /^\d+$/.test(rightPart);
    if (leftNumber && rightNumber) return Number(leftPart) - Number(rightPart);
    if (leftNumber !== rightNumber) return leftNumber ? -1 : 1;
    return leftPart < rightPart ? -1 : 1;
  }
  return 0;
}

function defaultReadFile(path) {
  return readFileSync(path, "utf8");
}

function defaultGitShow(root, revision, path) {
  return execFileSync("git", ["show", `${revision}:${path}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
}

function packageVersion(text) {
  const value = JSON.parse(text).version;
  if (typeof value !== "string") throw new Error("package.json has no version");
  parseVersion(value);
  return value;
}

export function checkVersionBump(root, baseRevision, options = {}) {
  const readFile = options.readFile ?? defaultReadFile;
  const gitShow = options.gitShow ?? defaultGitShow;

  const currentText = readFile(join(root, "package.json"));
  const current = packageVersion(currentText);
  const baseText = gitShow(root, baseRevision, "package.json");
  const base = packageVersion(baseText);

  if (compareVersions(current, base) <= 0) {
    throw new Error(`package.json version ${current} must be greater than base ${base}`);
  }

  const escaped = current.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const changelog = readFile(join(root, "CHANGELOG.md"));
  if (!new RegExp(`^##\\s+${escaped}\\s*$`, "m").test(changelog)) {
    throw new Error(`CHANGELOG.md has no "## ${current}" section`);
  }

  for (const file of ["README.md", "README.zh.md"]) {
    const text = readFile(join(root, file));
    if (!text.includes(`\`${current}\``)) {
      throw new Error(`${file} compatibility table does not mention ${current}`);
    }
  }

  for (const file of ["FORK.md", "docs/fork/STATUS.md"]) {
    const text = readFile(join(root, file));
    if (!text.includes(`\`${current}\``)) {
      throw new Error(`${file} does not mention package version ${current}`);
    }
  }

  return { base, current };
}

function main() {
  const baseRevision =
    process.argv[2] ||
    process.env.BASE_SHA ||
    process.env.GITHUB_EVENT_BASE_SHA ||
    "origin/fork/main";
  try {
    const result = checkVersionBump(ROOT, baseRevision);
    console.log(`version bump OK: ${result.base} -> ${result.current}`);
  } catch (error) {
    console.error(`::error::${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
