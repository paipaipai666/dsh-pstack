#!/usr/bin/env node
// Compare the vendored preset fixtures against the presets shipped by the
// pinned @deepseek-ai/dsh-web-app. A DSH upgrade that adds, drops, or
// reconfigures a row fails here instead of silently drifting from the fork.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import { compareVersions } from "./check-version-bump.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(ROOT, "tests", "fixtures");
const SHIPPED_SOURCE = join(ROOT, "node_modules", "@deepseek-ai", "dsh-web-app", "presets");
const REGISTRY = process.env.PRESET_DRIFT_REGISTRY ?? "https://registry.npmjs.org";
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

/** Octal fields are NUL- or space-terminated, and may be blank for a zero size. */
function tarSize(header) {
  const field = header
    .subarray(124, 136)
    .toString("latin1")
    .replace(/[\0 ].*$/, "")
    .trim();
  return field === "" ? 0 : Number.parseInt(field, 8);
}

/** ustar moves a name longer than 100 bytes into the prefix field. */
function tarName(header) {
  const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
  const prefix = header.subarray(345, 500).toString("utf8").replace(/\0.*$/, "");
  return prefix === "" ? name : `${prefix}/${name}`;
}

/**
 * The preset files out of a gzipped npm tarball. Only regular files are read;
 * pax and GNU extended headers keep the same 512-byte arithmetic and are
 * skipped without being stored.
 */
export function presetsFromTarball(tarball) {
  const entries = new Map();
  const tar = gunzipSync(tarball);
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    const name = tarName(header);
    if (name === "") break;
    const size = tarSize(header);
    const start = offset + 512;
    if (header[156] === 0 || header[156] === 0x30)
      entries.set(name, tar.subarray(start, start + size));
    offset = start + Math.ceil(size / 512) * 512;
  }
  const presets = {};
  for (const preset of PRESETS) {
    const path = `package/presets/${preset}.patch.yml`;
    const data = entries.get(path);
    if (data === undefined) throw new Error(`shipped tarball does not carry ${path}`);
    presets[preset] = data.toString("utf8");
  }
  return presets;
}

/**
 * Fetch the tarball a fixture version was cut from. The registry is overridable
 * so a mirror can serve the same bytes when npmjs is unreachable.
 */
export async function fetchPresetTarball(spec, fetchImpl = fetch) {
  const at = spec.lastIndexOf("@");
  if (at <= 0 || at + 1 >= spec.length) throw new Error(`expected <name>@<version>, got ${spec}`);
  const name = spec.slice(0, at);
  const version = spec.slice(at + 1);
  const file = name.startsWith("@") ? name.slice(name.indexOf("/") + 1) : name;
  const url = `${REGISTRY}/${name}/-/${file}-${version}.tgz`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const arguments_ = process.argv.slice(2);
  const fetch = arguments_.includes("--fetch");
  const equals = arguments_.find((argument) => argument.startsWith("--source="));
  const index = arguments_.indexOf("--source");
  const value =
    equals?.slice("--source=".length) ?? (index === -1 ? undefined : arguments_[index + 1]);
  const source = value === undefined ? SHIPPED_SOURCE : resolve(value);
  const latest = latestPresetFixture(readdirSync(FIXTURES));
  if (latest === undefined) throw new Error(`no dsh-<version> fixture under ${FIXTURES}`);
  const version = latest.slice("dsh-".length);

  let shipped;
  if (fetch) {
    const spec = `@deepseek-ai/dsh-web-app@${version}`;
    shipped = presetsFromTarball(await fetchPresetTarball(spec));
    console.log(`source: ${spec} (registry)`);
  }

  let drifted = false;
  for (const preset of PRESETS) {
    const expected = readFileSync(join(FIXTURES, latest, `${preset}.patch.yml`), "utf8");
    let actual = shipped?.[preset];
    if (actual === undefined && !fetch) {
      try {
        actual = readFileSync(join(source, `${preset}.patch.yml`), "utf8");
      } catch {
        console.log(`${preset}: no shipped preset at ${source}; skipped`);
        continue;
      }
    }
    if (actual === undefined) {
      console.log(`${preset}: no shipped preset for ${version}; skipped`);
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
