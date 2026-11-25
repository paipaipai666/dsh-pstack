/**
 * Write the visible copy of the entry skills that `pstack-auto` offers.
 *
 * The generated pstack skills all carry `disable-model-invocation: true`, which
 * keeps them out of the model's catalog: the model can only load one after
 * something has told it the name. A preset that wants the model to reach a skill
 * from the request alone needs copies without the flag, and it needs them beside
 * the rest of the generated tree so one build produces a consistent bundle.
 *
 * Only the entry set is copied. The long tail stays hidden on purpose: the
 * experiment in `docs/fork/SKILL-DISCOVERY.md` shows a curated catalog reaches
 * the same behaviour as the full one at a seventh of the context cost.
 */

import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The entry set: skills a request can name by intent, with no playbook to route
 * to first. Keep this list short and each entry defensible — every member costs
 * catalog tokens in every session and competes for the model's attention.
 */
export const AUTO_SKILLS = [
  "architect",
  "figure-it-out",
  "how",
  "interrogate",
  "sharpen",
  "statechart",
  "teach",
  "technical-writing",
  "unslop",
  "why",
];

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST_ROOT = join(HERE, "..", "dist", "pstack");
const SOURCE_ROOT = join(DIST_ROOT, "skills");
const TARGET_ROOT = join(DIST_ROOT, "auto-skills");

/** Drop the invocation flag so the skill enters the model's catalog. */
export function stripModelInvocationFlag(text) {
  return text.replace(/^disable-model-invocation:\s*true\s*\r?\n/m, "");
}

export function generateAutoSkills(sourceRoot = SOURCE_ROOT, targetRoot = TARGET_ROOT) {
  if (!existsSync(sourceRoot)) {
    throw new Error(`generate-auto-skills: no skill tree at ${sourceRoot}; run the pack first`);
  }
  const missing = AUTO_SKILLS.filter((name) => !existsSync(join(sourceRoot, name, "SKILL.md")));
  if (missing.length > 0) {
    throw new Error(`generate-auto-skills: no such skill: ${missing.join(", ")}`);
  }

  rmSync(targetRoot, { recursive: true, force: true });
  const written = [];
  for (const name of AUTO_SKILLS) {
    const from = join(sourceRoot, name);
    const to = join(targetRoot, name);
    cpSync(from, to, { recursive: true });
    const skillFile = join(to, "SKILL.md");
    const text = readFileSync(skillFile, "utf8");
    const stripped = stripModelInvocationFlag(text);
    if (stripped === text) {
      throw new Error(`generate-auto-skills: ${name} carried no disable-model-invocation flag`);
    }
    writeFileSync(skillFile, stripped);
    written.push(name);
  }
  // A README keeps the directory obvious in a tree listing and states why the
  // flag is missing, so a later reader does not "fix" the copies.
  writeFileSync(
    join(targetRoot, "README.md"),
    [
      "# Generated visible skills",
      "",
      "Written by `scripts/generate-auto-skills.mjs` for the `pstack-auto` preset.",
      "Each `SKILL.md` here is the shipped skill with `disable-model-invocation: true`",
      "removed, so the model can see the name and load the body on its own.",
      "",
      `Entry set: ${AUTO_SKILLS.join(", ")}.`,
      "",
      "Do not edit by hand; the next build overwrites this directory.",
      "",
    ].join("\n"),
  );
  return written;
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("generate-auto-skills.mjs")) {
  const written = generateAutoSkills();
  const names = readdirSync(TARGET_ROOT).filter((name) => !name.endsWith(".md"));
  console.log(`generate-auto-skills: wrote ${names.length} skills (${written.length} requested)`);
}
