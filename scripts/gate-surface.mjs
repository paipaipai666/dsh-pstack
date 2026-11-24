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

export function protectedChanges(files) {
  const seen = new Set();
  const matched = [];
  for (const file of files ?? []) {
    const cleaned = String(file ?? "").trim();
    if (!isProtectedPath(cleaned)) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    matched.push(cleaned);
  }
  return matched;
}

export function decide(files, labels) {
  const changed = protectedChanges(files);
  const approved = (labels ?? []).some((label) => String(label).trim() === APPROVAL_LABEL);
  if (changed.length === 0) {
    return { ok: true, changed, reason: "no protected files changed" };
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

function main() {
  const files = parseList(process.env.GATE_FILES);
  const labels = parseList(process.env.GATE_LABELS);
  if (files.length === 0) {
    console.log("gate surface: skipped (set GATE_FILES)");
    return;
  }
  const verdict = decide(files, labels);
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
