import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

// The build script ships a hand-written declaration beside it (.d.mts).
import {
  AUTO_SKILLS,
  generateAutoSkills,
  stripModelInvocationFlag,
} from "../scripts/generate-auto-skills.mjs";

const FLAGGED = [
  "---",
  "name: demo",
  "description: Demo skill. Use for demos.",
  "disable-model-invocation: true",
  "---",
  "",
  "Body.",
  "",
].join("\n");

function fixture(withFlags: boolean): { source: string; target: string } {
  const root = mkdtempSync(join(tmpdir(), "pstack-auto-"));
  const source = join(root, "skills");
  const target = join(root, "auto-skills");
  for (const name of AUTO_SKILLS) {
    const dir = join(source, name);
    mkdirSync(dir, { recursive: true });
    const text = withFlags ? FLAGGED : FLAGGED.replace("disable-model-invocation: true\n", "");
    writeFileSync(join(dir, "SKILL.md"), text);
  }
  return { source, target };
}

describe("stripModelInvocationFlag", () => {
  it("removes the flag and nothing else", () => {
    expect(stripModelInvocationFlag(FLAGGED)).toBe(
      FLAGGED.replace("disable-model-invocation: true\n", ""),
    );
  });

  it("leaves a file without the flag untouched", () => {
    const text = FLAGGED.replace("disable-model-invocation: true\n", "");
    expect(stripModelInvocationFlag(text)).toBe(text);
  });
});

describe("generateAutoSkills", () => {
  it("copies only the entry set, without the flag, plus a README", () => {
    const { source, target } = fixture(true);
    const written = generateAutoSkills(source, target);
    expect([...written]).toEqual([...AUTO_SKILLS]);
    for (const name of AUTO_SKILLS) {
      expect(readFileSync(join(target, name, "SKILL.md"), "utf8")).not.toContain(
        "disable-model-invocation",
      );
    }
    expect(readFileSync(join(target, "README.md"), "utf8")).toContain("generate-auto-skills");
  });

  it("fails when a shipped skill stops carrying the flag", () => {
    const { source, target } = fixture(false);
    expect(() => generateAutoSkills(source, target)).toThrow(/carried no disable-model-invocation/);
  });

  it("fails when the generated tree has not been built yet", () => {
    expect(() => generateAutoSkills(join(tmpdir(), "pstack-absent"), join(tmpdir(), "x"))).toThrow(
      /run the pack first/,
    );
  });

  it("starts from a clean copy so a removed skill cannot linger", () => {
    const { source, target } = fixture(true);
    generateAutoSkills(source, target);
    mkdirSync(join(target, "stale"));
    generateAutoSkills(source, target);
    expect(existsSync(join(target, "stale"))).toBe(false);
  });
});
