/**
 * Put the built runtime where the shipped tree expects it.
 *
 * `vp pack` with `unbundle: true` mirrors the input tree: the output for
 * `runtime/skills/<skill>/scripts/x.ts` is `runtime/dist/skills/<skill>/scripts/x.mjs`.
 * Every specifier inside that output is either a sibling (`./store.mjs`) or a declared
 * dependency (`commander`), never a shared chunk hoisted out of the tree, because
 * unbundle mode emits one file per input module instead of merging them.
 *
 * The generated tree under `dist/pstack/` carries an upstream `skills/<skill>/scripts/`
 * for these same skills, holding the sources they shipped with. Those sources must not
 * survive: a `.sh` script or a `.ts` file in an installed package is unrunnable where no
 * interpreter is guaranteed, and shipping both forms would leave the reader guessing
 * which one runs.
 *
 * `commander` is deliberately not copied. It is a `dependencies` entry of this package,
 * so the profile's own pnpm installed it where Node resolves it; a second copy here
 * would pin this checkout's build version and shadow the installed one.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Where the build writes. Pack drops the `skills/` prefix because it is the common root. */
const BUILT = join(ROOT, "runtime", "dist");

/** Where the shipped tree keeps its skills. */
const SHIPPED_SKILLS = join(ROOT, "dist", "pstack", "skills");

/** The skills whose scripts the runtime replaces. */
const REPLACED = ["poteto-mode", "show-me-your-work", "statechart"];

if (!existsSync(BUILT)) {
  console.error(`replace-runtime-scripts: ${BUILT} is missing; run \`vp pack\` first`);
  process.exit(1);
}
if (!existsSync(SHIPPED_SKILLS)) {
  console.error(`replace-runtime-scripts: ${SHIPPED_SKILLS} is missing; run \`vp pack\` first`);
  process.exit(1);
}

const built = readdirSync(BUILT).filter((name) => statSync(join(BUILT, name)).isDirectory());
const unexpected = built.filter((name) => !REPLACED.includes(name));
if (unexpected.length > 0) {
  console.error(
    `replace-runtime-scripts: ${unexpected.join(", ")} has built scripts but is not in the replaced list; add it deliberately rather than letting the copy decide`,
  );
  process.exit(1);
}
const missing = REPLACED.filter((name) => !built.includes(name));
if (missing.length > 0) {
  console.error(
    `replace-runtime-scripts: ${missing.join(", ")} is in the replaced list but has no built scripts; update the list or restore the runtime source`,
  );
  process.exit(1);
}

let replaced = 0;
/**
 * Copy the compiled scripts, leaving the compiled tests behind: they are useful in
 * `runtime/dist` where `test:runtime` runs them, and dead weight in an installed package.
 * Test artefacts are the `*.test.mjs` / `*.test-helper.mjs` files plus the node:test
 * assertion shims (`expect.mjs`, `support.mjs`) that only those tests import. The shims
 * must stay listed here (or be renamed to `*.test-helper.mjs`): statechart spawns
 * `worker.mjs` by a computed path rather than an import, so a reachability walk from the
 * entry points would drop the worker and is not a safe copy rule.
 */
const TEST_ARTEFACT = /\.test(-helper)?\.mjs$|^(expect|support)\.mjs$/;
function copyRunnable(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) {
      copyRunnable(source, target);
    } else if (!TEST_ARTEFACT.test(entry.name)) {
      copyFileSync(source, target);
    }
  }
}
for (const skill of built) {
  const from = join(BUILT, skill, "scripts");
  const to = join(SHIPPED_SKILLS, skill, "scripts");
  if (!existsSync(from)) {
    console.error(`replace-runtime-scripts: ${from} is missing`);
    process.exit(1);
  }
  if (!existsSync(to)) {
    console.error(`replace-runtime-scripts: ${to} is not a generated skill directory`);
    process.exit(1);
  }
  rmSync(to, { recursive: true, force: true });
  copyRunnable(from, to);
  replaced += 1;
}

const registryModule = await import(new URL("../src/script-registry.ts", import.meta.url).href);
for (const entry of registryModule.SCRIPT_ENTRIES) {
  const script = join(SHIPPED_SKILLS, "..", ...entry.assetPath.split("/"));
  if (!existsSync(script)) {
    console.error(
      `replace-runtime-scripts: ${entry.id} points at missing shipped file ${entry.assetPath}`,
    );
    process.exit(1);
  }
}

console.log(
  `replace-runtime-scripts: replaced ${replaced} skill script director${replaced === 1 ? "y" : "ies"}; ${registryModule.SCRIPT_ENTRIES.length} script ids resolved`,
);
