import { readFileSync, writeFileSync } from "node:fs";

import { join, resolve } from "node:path";

const CATALOG_PATH = "pnpm-workspace.yaml";
const ENTRY = /^(\s*"(@deepseek-ai\/dsh[^"]*)"):\s*(\S+)\s*$/gm;
const REGISTRY = "https://registry.npmjs.org/@deepseek-ai%2Fdsh";

export function catalogVersions(text) {
  const versions = new Set();
  for (const match of text.matchAll(ENTRY)) versions.add(match[3]);
  return [...versions].sort();
}

export function rewriteCatalog(text, version) {
  if (version === "" || /\s/.test(version)) {
    throw new Error(`invalid version "${version}"`);
  }
  return text.replace(ENTRY, (_line, prefix, name) => `${prefix}: ${version}`);
}

export function distTagVersion(packument, tag) {
  const version = packument?.["dist-tags"]?.[tag];
  if (typeof version !== "string" || version.trim() === "") {
    throw new Error(`@deepseek-ai/dsh has no ${tag} dist-tag`);
  }
  return version.trim();
}

export async function fetchNextVersion(fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(REGISTRY);
  if (!response.ok) {
    throw new Error(`registry answered ${response.status} for @deepseek-ai/dsh`);
  }
  return distTagVersion(await response.json(), "next");
}

export async function nextVersion() {
  return fetchNextVersion();
}

async function main(argv) {
  const positional = argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const target = positional[0];
  if (target === undefined) {
    process.stdout.write("usage: node scripts/pin-dsh-version.mjs <version|next>\n");
    return 2;
  }
  const root = resolve(process.cwd());
  const path = join(root, CATALOG_PATH);
  const text = readFileSync(path, "utf8");
  const version = target === "next" ? await nextVersion() : target;
  const before = catalogVersions(text);
  const next = rewriteCatalog(text, version);
  if (next === text) {
    process.stdout.write(`dsh pins: already at ${version}\n`);
    return 0;
  }
  writeFileSync(path, next);
  const touched = (text.match(ENTRY) ?? []).length;
  process.stdout.write(
    `dsh pins: ${before.join(", ") || "none"} -> ${version} (${touched} entries)\n`,
  );
  return 0;
}

if (process.argv[1] !== undefined) {
  const self = process.argv[1].replaceAll("\\", "/");
  if (self.endsWith("scripts/pin-dsh-version.mjs")) {
    process.exitCode = await main(process.argv);
  }
}
