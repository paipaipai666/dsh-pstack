import { readFileSync, writeFileSync } from "node:fs";

import { join, resolve } from "node:path";

import { execFileSync } from "node:child_process";

const CATALOG_PATH = "pnpm-workspace.yaml";
const ENTRY = /^(\s*"(@deepseek-ai\/dsh[^"]*)"):\s*(\S+)\s*$/gm;

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

export function nextVersion() {
  const raw = execFileSync("npm", ["view", "@deepseek-ai/dsh@next", "version"], {
    encoding: "utf8",
  });
  const version = raw.trim();
  if (version === "") throw new Error("npm returned no version for @deepseek-ai/dsh@next");
  return version;
}

function main(argv) {
  const positional = argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const target = positional[0];
  if (target === undefined) {
    process.stdout.write("usage: node scripts/pin-dsh-version.mjs <version|next>\n");
    return 2;
  }
  const root = resolve(process.cwd());
  const path = join(root, CATALOG_PATH);
  const text = readFileSync(path, "utf8");
  const version = target === "next" ? nextVersion() : target;
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
    process.exitCode = main(process.argv);
  }
}
