#!/usr/bin/env node
// Refresh sourceDigest values in port/audit.lock.json from the current capability scan.
// New or removed capability keys are reported instead of silently added/removed.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TSV = join(ROOT, ".audit/scan/capability-scan.tsv");
const LOCK = join(ROOT, "port/audit.lock.json");

execFileSync(process.execPath, ["port/scan.mjs"], { cwd: ROOT, stdio: "ignore" });

const rows = readFileSync(TSV, "utf8")
  .split("\n")
  .map((line) => line.replace(/\r$/, ""))
  .filter(Boolean);

function digestFor(key) {
  const lines = rows
    .filter((row) => row.split("\t")[0] === key)
    .map((row) => {
      const [, rel, , text] = row.split("\t");
      return `${rel}\t${text}`;
    })
    .sort((a, b) => a.localeCompare(b));
  return `sha256:${createHash("sha256").update(lines.join("\n")).digest("hex")}`;
}

const lock = JSON.parse(readFileSync(LOCK, "utf8"));
const scanKeys = new Set(rows.map((row) => row.split("\t")[0]));
const lockKeys = new Set(Object.values(lock.items).map((item) => item.key));
const EMPTY_DIGEST = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const changed = [];
const missing = [];
for (const [id, item] of Object.entries(lock.items)) {
  if (!scanKeys.has(item.key)) {
    if (item.sourceDigest !== EMPTY_DIGEST) missing.push(`${id} ${item.key}`);
    continue;
  }
  const digest = digestFor(item.key);
  if (digest !== item.sourceDigest) {
    changed.push(`${id} ${item.key}`);
    item.sourceDigest = digest;
  }
}

const newKeys = [...scanKeys]
  .filter((key) => !lockKeys.has(key))
  .sort((a, b) => a.localeCompare(b));

if (missing.length || newKeys.length) {
  if (missing.length) console.error(`missing scan rows:\n${missing.join("\n")}`);
  if (newKeys.length)
    console.error(`new capability keys without lock entries:\n${newKeys.join("\n")}`);
  process.exit(1);
}

if (process.argv.includes("--write")) {
  writeFileSync(LOCK, `${JSON.stringify(lock, null, 2)}\n`);
  console.log(`updated ${changed.length} sourceDigest values`);
} else {
  console.log(
    changed.length ? `would update ${changed.length} sourceDigest values` : "audit lock is current",
  );
}
