#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_PREFIXES = [
  "#!",
  "/// <reference",
  "// @ts-",
  "// eslint-",
  "// prettier-",
  "// oxlint",
  "// biome-",
  "// deno-lint",
  "// spellchecker:",
  "// #region",
  "// #endregion",
];

const COMMENT_PATTERNS = [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/];

const EXCLUDED_PATHS = ["pstack/**", "upstream/**", "docs/**", "skills/**", ".tmp/**"];

const BANNED_NOTE =
  "Move the explanation into the commit message, CHANGELOG, or docs/fork instead.";

function toPosix(value) {
  return value.split(path.sep).join("/");
}

export function isComment(line) {
  return COMMENT_PATTERNS.some((pattern) => pattern.test(line));
}

export function isAllowedComment(line) {
  const trimmed = line.trim();
  return ALLOWED_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

export function isTestPath(file) {
  const posix = toPosix(file);
  return /(^|\/)(tests?|__tests__)\//.test(posix) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(posix);
}

export function isGatedPath(file) {
  const posix = toPosix(file);
  return /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(posix) && !isTestPath(posix);
}

export function parseAddedComments(diff) {
  const findings = [];
  let file = "";
  let lineNumber = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      const target = raw.slice(4).trim();
      file = target === "/dev/null" ? "" : target.replace(/^b\//, "");
      lineNumber = 0;
      continue;
    }
    if (raw.startsWith("@@")) {
      const match = raw.match(/\+(\d+)/);
      lineNumber = match ? Number.parseInt(match[1], 10) : 0;
      continue;
    }
    if (raw.startsWith("+")) {
      const text = raw.slice(1);
      if (file && isGatedPath(file) && isComment(text) && !isAllowedComment(text)) {
        findings.push({ file, line: lineNumber, text: text.trim() });
      }
      lineNumber += 1;
      continue;
    }
    if (raw.startsWith("-") || raw.startsWith("\\")) {
      continue;
    }
    if (lineNumber > 0) {
      lineNumber += 1;
    }
  }
  return findings;
}

function readBase(argv) {
  const index = argv.indexOf("--base");
  if (index !== -1 && argv[index + 1]) {
    return argv[index + 1];
  }
  return process.env.BASE_SHA ?? "";
}

function main() {
  const base = readBase(process.argv.slice(2));
  if (!base) {
    console.log("comment gate: skipped (set BASE_SHA or pass --base)");
    return;
  }
  const diff = execFileSync(
    "git",
    [
      "diff",
      "--unified=0",
      "--no-color",
      `${base}..HEAD`,
      "--",
      ".",
      ...EXCLUDED_PATHS.map((excluded) => `:(exclude)${excluded}`),
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const findings = parseAddedComments(diff);
  if (findings.length === 0) {
    console.log("comment gate: no new prose comments");
    return;
  }
  console.error(`comment gate: ${findings.length} new comment line(s) in source files:`);
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line}: ${finding.text}`);
  }
  console.error(BANNED_NOTE);
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
