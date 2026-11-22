#!/usr/bin/env node
// Compare the vendored preset fixtures against the presets shipped by the
// pinned @deepseek-ai/dsh-web-app. A DSH upgrade that adds, drops, or
// reconfigures a row fails here instead of silently drifting from the fork.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { compareVersions } from "./check-version-bump.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(ROOT, "tests", "fixtures");
const SHIPPED_SOURCE = join(ROOT, "node_modules", "@deepseek-ai", "dsh-web-app", "presets");
const VERSIONED = /^dsh-(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/;
const PRESETS = ["standard", "cordis"];

/**
 * The fixture copies are byte-faithful except for two cosmetic rewrites the
 * repo applies when vendoring: `name:` values are double quoted, and the files
 * are stored with LF endings. Blank lines never carry meaning in these presets.
 */
export function presetLines(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/^(\s*(?:-\s+)?name:\s*)'([^']*)'/gm, '$1"$2"')
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line !== "");
}

/** Multiset comparison: an edited or moved row shows up as one addition and one removal. */
export function findPresetDrift(expected, actual) {
  const remaining = presetLines(expected);
  const additions = [];
  for (const line of presetLines(actual)) {
    const index = remaining.indexOf(line);
    if (index === -1) additions.push(line);
    else remaining.splice(index, 1);
  }
  return {
    equal: additions.length === 0 && remaining.length === 0,
    additions: additions.map((line) => line.trim()),
    removals: remaining.map((line) => line.trim()),
  };
}

export function latestPresetFixture(names) {
  const versions = names
    .map((name) => VERSIONED.exec(name))
    .filter(Boolean)
    .map((match) => match[1]);
  versions.sort((left, right) => compareVersions(right, left));
  return versions.length === 0 ? undefined : `dsh-${versions[0]}`;
}

function main() {
  const arguments_ = process.argv.slice(2);
  const equals = arguments_.find((argument) => argument.startsWith("--source="));
  const index = arguments_.indexOf("--source");
  const value =
    equals?.slice("--source=".length) ?? (index === -1 ? undefined : arguments_[index + 1]);
  const source = value === undefined ? SHIPPED_SOURCE : resolve(value);
  const latest = latestPresetFixture(readdirSync(FIXTURES));
  if (latest === undefined) throw new Error(`no dsh-<version> fixture under ${FIXTURES}`);

  let drifted = false;
  for (const preset of PRESETS) {
    const expected = readFileSync(join(FIXTURES, latest, `${preset}.patch.yml`), "utf8");
    let actual;
    try {
      actual = readFileSync(join(source, `${preset}.patch.yml`), "utf8");
    } catch {
      console.log(`${preset}: no shipped preset at ${source}; skipped`);
      continue;
    }
    const drift = findPresetDrift(expected, actual);
    if (drift.equal) {
      console.log(`${preset}: matches ${latest}`);
      continue;
    }
    drifted = true;
    console.log(`${preset}: drifted from ${latest}`);
    for (const line of drift.additions) console.log(`  + ${line.trim()}`);
    for (const line of drift.removals) console.log(`  - ${line.trim()}`);
  }
  if (drifted) {
    console.log(`refresh tests/fixtures/${latest} and re-run tests/preset-parity.test.ts`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
