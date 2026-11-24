import { readFileSync, writeFileSync } from "node:fs";

import { join, relative, resolve } from "node:path";

import { globSync } from "node:fs";

const PACKAGE_PREFIX = "@deepseek-ai/";
const SNAPSHOT_PATH = "docs/fork/dsh-api-surface.json";
const SOURCE_GLOBS = ["src/**/*.ts", "src/**/*.tsx"];

export function sourceFiles(root) {
  const seen = new Set();
  for (const pattern of SOURCE_GLOBS) {
    for (const entry of globSync(pattern, { cwd: root })) {
      seen.add(entry.replaceAll("\\", "/"));
    }
  }
  return [...seen].sort();
}

export function collectImportedSymbols(root) {
  const imported = new Map();
  const pattern = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*"([^"]+)"/g;
  for (const rel of sourceFiles(root)) {
    let text;
    try {
      text = readFileSync(join(root, rel), "utf8");
    } catch {
      continue;
    }
    for (const match of text.matchAll(pattern)) {
      const specifier = match[2];
      if (!specifier.startsWith(PACKAGE_PREFIX)) continue;
      const names = imported.get(specifier) ?? new Set();
      for (const part of match[1].split(",")) {
        const name = part
          .trim()
          .split(/\s+as\s+/)[0]
          ?.trim();
        if (name === undefined || name === "") continue;
        names.add(name);
      }
      imported.set(specifier, names);
    }
  }
  return imported;
}

export function packageDir(root, name) {
  return join(root, "node_modules", ...name.split("/"));
}

export function resolveTypesEntry(root, name) {
  const dir = packageDir(root, name);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  } catch {
    return undefined;
  }
  const entry = manifest.types ?? manifest.typings;
  if (typeof entry !== "string") return undefined;
  return resolve(dir, entry);
}

export function extractExports(text) {
  const names = new Set();
  const declared =
    /export\s+(?:declare\s+)?(?:interface|class|type|const|function|enum|namespace)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of text.matchAll(declared)) names.add(match[1]);
  const listed = /export\s+(?:type\s+)?\{([^}]*)\}/g;
  for (const match of text.matchAll(listed)) {
    for (const part of match[1].split(",")) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name === undefined || name === "" || name === "default") continue;
      names.add(name);
    }
  }
  return [...names].sort();
}

export function surfaceOf(root) {
  const imported = collectImportedSymbols(root);
  const packages = {};
  for (const name of [...imported.keys()].sort()) {
    const entry = resolveTypesEntry(root, name);
    if (entry === undefined) continue;
    let text;
    let version = "unknown";
    try {
      text = readFileSync(entry, "utf8");
      version = JSON.parse(
        readFileSync(join(packageDir(root, name), "package.json"), "utf8"),
      ).version;
    } catch {
      continue;
    }
    packages[name] = {
      version: String(version),
      imported: [...imported.get(name)].sort(),
      exports: extractExports(text),
    };
  }
  return { packages };
}

export function compareSurfaces(before, after) {
  const problems = [];
  for (const [name, record] of Object.entries(before.packages ?? {})) {
    const current = after.packages?.[name];
    if (current === undefined) {
      problems.push(`${name} is no longer installed`);
      continue;
    }
    const exports = new Set(current.exports);
    for (const symbol of record.exports) {
      if (!exports.has(symbol)) {
        problems.push(`${name} no longer exports ${symbol}`);
      }
    }
    const imported = new Set(record.imported ?? []);
    for (const symbol of current.imported ?? []) {
      if (!imported.has(symbol) && !exports.has(symbol)) {
        problems.push(`${name} does not export ${symbol}, which we now import`);
      }
    }
  }
  if (problems.length === 0) return { ok: true, reason: "the api surface we use is intact" };
  return { ok: false, reason: problems.join("; ") };
}

export function readSnapshot(root, path = SNAPSHOT_PATH) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function main(argv) {
  const positional = argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const root = resolve(positional[0] ?? process.cwd());
  const check = argv.includes("--check");
  const surface = surfaceOf(root);
  const total = Object.keys(surface.packages).length;
  if (!check) {
    writeFileSync(join(root, SNAPSHOT_PATH), `${JSON.stringify(surface, undefined, 2)}\n`);
    process.stdout.write(`dsh api surface: wrote ${total} package(s) to ${SNAPSHOT_PATH}\n`);
    return 0;
  }
  let before;
  try {
    before = readSnapshot(root);
  } catch {
    process.stdout.write(`dsh api surface: no snapshot at ${SNAPSHOT_PATH}; run --write\n`);
    return 0;
  }
  const verdict = compareSurfaces(before, surface);
  if (!verdict.ok) {
    process.stdout.write(`dsh api surface: ${verdict.reason}\n`);
    return 1;
  }
  process.stdout.write(`dsh api surface: ${total} package(s) still export what we use\n`);
  return 0;
}

if (process.argv[1] !== undefined) {
  const self = relative(process.cwd(), process.argv[1]).replaceAll("\\", "/");
  if (self.endsWith("scripts/dsh-api-surface.mjs")) {
    process.exitCode = main(process.argv);
  }
}
