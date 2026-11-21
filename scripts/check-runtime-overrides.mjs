/**
 * Fail when the generated pstack tree gains a production script that the runtime
 * override does not provide. `replace-runtime-scripts.mjs` deletes a replaced skill's
 * generated scripts directory before copying the built runtime, so an unrepresented
 * file would silently disappear from the installed package.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { RUNTIME_DROPPED_FILES, RUNTIME_REPLACED_SKILLS } from "./runtime-skills.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED = join(ROOT, "pstack", "skills");
const RUNTIME = join(ROOT, "runtime", "skills");

const IGNORED_NAMES = new Set(["package.json", "tsconfig.json", "statechart"]);
const TEST_FILE = /\.test(?:-helper)?\.(?:ts|mjs|tsx)$/;
const TEST_SHIM = /^(?:expect|support)\.mjs$/;

const files = (dir, base = dir) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(full, base));
    else if (entry.isFile()) out.push(relative(base, full));
    else throw new Error(`unexpected non-file entry: ${full}`);
  }
  return out;
};

const ignored = (path) =>
  path.split(sep).includes("test") ||
  IGNORED_NAMES.has(path.split(sep).at(-1) ?? "") ||
  TEST_FILE.test(path) ||
  TEST_SHIM.test(path);

const missing = [];
for (const skill of RUNTIME_REPLACED_SKILLS) {
  const generated = join(GENERATED, skill, "scripts");
  if (!existsSync(generated)) {
    console.error(`runtime-overrides: missing generated scripts for ${skill}: ${generated}`);
    process.exit(1);
  }
  const dropped = RUNTIME_DROPPED_FILES[skill] ?? new Set();
  for (const path of files(generated)) {
    const normalized = path.split(sep).join("/");
    if (ignored(path) || dropped.has(normalized)) continue;
    const runtime = join(RUNTIME, skill, "scripts", path);
    if (!existsSync(runtime) || !statSync(runtime).isFile()) {
      missing.push(`${skill}/${normalized}`);
    }
  }
}

if (missing.length > 0) {
  console.error(
    "runtime-overrides: generated production scripts are not represented in runtime:\n" +
      missing.map((path) => `  - ${path}`).join("\n") +
      "\nThe build would discard them. Add the runtime source or an explicit mapping.",
  );
  process.exit(1);
}

console.log(
  `runtime-overrides: all generated production scripts have runtime sources (${RUNTIME_REPLACED_SKILLS.length} skills)`,
);
