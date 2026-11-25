import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PROTECTED_PATTERNS = [
  /^scripts\//,
  /^\.github\//,
  /^package\.json$/,
  /^pnpm-workspace\.yaml$/,
  /^vite\.config\.ts$/,
  /^port\/generate\.mjs$/,
  /^port\/scan\.mjs$/,
  /^model\//,
  /^docs\/fork\/dsh-api-surface\.json$/,
  /^docs\/fork\/BREAKING-CHECKLIST\.md$/,
];

export const APPROVAL_LABEL = "gate-approved";

export function isProtectedPath(path) {
  const cleaned = String(path ?? "")
    .trim()
    .replace(/^\.\//, "");
  if (cleaned === "") return false;
  return PROTECTED_PATTERNS.some((pattern) => pattern.test(cleaned));
}

export function manifestBeyondVersion(before, after) {
  const strip = (text) => {
    const parsed = JSON.parse(text);
    delete parsed.version;
    return JSON.stringify(parsed);
  };
  try {
    return strip(before) !== strip(after);
  } catch {
    return true;
  }
}

export function protectedChanges(files, options = {}) {
  const versionOnly = options.versionOnlyManifest === true;
  const seen = new Set();
  const matched = [];
  for (const file of files ?? []) {
    const cleaned = String(file ?? "").trim();
    if (versionOnly && cleaned.replace(/^\.\//, "") === "package.json") continue;
    if (!isProtectedPath(cleaned)) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    matched.push(cleaned);
  }
  return matched;
}

export function decide(files, labels, options = {}) {
  const changed = protectedChanges(files, options);
  const approved = (labels ?? []).some((label) => String(label).trim() === APPROVAL_LABEL);
  if (changed.length === 0) {
    return {
      ok: true,
      changed,
      reason:
        options.versionOnlyManifest === true && (files ?? []).length > 0
          ? "only the release version moved in package.json"
          : "no protected files changed",
    };
  }
  if (approved) {
    return {
      ok: true,
      changed,
      reason: `protected files changed with gate-approved: ${changed.join(", ")}`,
    };
  }
  return {
    ok: false,
    changed,
    reason: `this pull request changes the checks that judge it (${changed.join(", ")}); a maintainer must add the ${APPROVAL_LABEL} label before it can land`,
  };
}

function parseList(value) {
  return String(value ?? "")
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

function versionOnlyManifest(files, base) {
  if (base === undefined || base === "") return false;
  if (!files.some((file) => String(file).trim().replace(/^\.\//, "") === "package.json")) {
    return false;
  }
  let before;
  try {
    before = execFileSync("git", ["show", `${base}:package.json`], { encoding: "utf8" });
  } catch {
    return false;
  }
  const after = readFileSync("package.json", "utf8");
  return !manifestBeyondVersion(before, after);
}

function main() {
  const files = parseList(process.env.GATE_FILES);
  const labels = parseList(process.env.GATE_LABELS);
  if (files.length === 0) {
    console.log("gate surface: skipped (set GATE_FILES)");
    return;
  }
  const verdict = decide(files, labels, {
    versionOnlyManifest: versionOnlyManifest(files, process.env.BASE_SHA),
  });
  if (verdict.ok) {
    console.log(`gate surface: ${verdict.reason}`);
    return;
  }
  console.error(`gate surface: ${verdict.reason}`);
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
