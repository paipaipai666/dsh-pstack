#!/usr/bin/env node
// Translate the shipped skill catalog to DSH names after `vp pack` copies it to dist/.
// The native skill provider reads dist/pstack/skills directly, so the catalog must already
// speak DSH. pstack_skill translates again at read time; toDshText is idempotent.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function translateSkillCatalog(skillsRoot, translate) {
  let changed = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.name.endsWith(".md")) continue;
      const text = readFileSync(path, "utf8");
      const translated = translate(text);
      if (translated === text) continue;
      writeFileSync(path, translated);
      changed += 1;
    }
  };
  walk(skillsRoot);
  return changed;
}

async function main() {
  const { toDshText } = await import(pathToFileURL(join(ROOT, "dist/native-text.mjs")));
  const skillsRoot = join(ROOT, "dist/pstack/skills");
  const changed = translateSkillCatalog(skillsRoot, toDshText);
  console.log(`translated ${changed} skill catalog files`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
