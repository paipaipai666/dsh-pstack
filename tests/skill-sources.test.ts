import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";

const ROOT = resolve(import.meta.dirname, "..");
const VENDORED = resolve(ROOT, "skills/.agents/skills");
const AUTHORED = resolve(ROOT, "skills/authored");

type Manifest = { skills?: { source: string; skills: string[] }[] };
type Lock = { skills: Record<string, { sourceType: string; computedHash: string; source: string }> };

const manifest = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as Manifest;
const lock = JSON.parse(readFileSync(resolve(ROOT, "skills-lock.json"), "utf8")) as Lock;

/** Every skill name the manifest claims this package ships. */
const declared = (manifest.skills ?? []).flatMap((entry) => entry.skills);

function skillDirs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readName(path: string): string {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  return (
    text
      .match(/^---\n([\s\S]*?)\n---/)?.[1]
      ?.match(/^name:(.*)$/m)?.[1]
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2") ?? ""
  );
}

describe("declared skill sources", () => {
  it("ships every skill the manifest declares", () => {
    expect(declared.length).toBeGreaterThan(0);
    for (const name of declared) {
      const path = resolve(VENDORED, name, "SKILL.md");
      expect(existsSync(path), `package.json declares ${name} but ${path} is missing`).toBe(true);
      expect(readName(path), `${name} must name itself in its frontmatter`).toBe(name);
    }
  });

  it("declares every vendored skill directory", () => {
    for (const name of skillDirs(VENDORED)) {
      expect(declared, `${name} is vendored but package.json does not declare it`).toContain(name);
    }
  });

  it("keeps the authored skills and their lock entries in step", () => {
    const local = Object.entries(lock.skills)
      .filter(([, entry]) => entry.sourceType === "local")
      .map(([name]) => name)
      .sort();
    expect(local).toEqual(skillDirs(AUTHORED));
    for (const name of local) {
      const path = resolve(AUTHORED, name, "SKILL.md");
      expect(existsSync(path), `${name} is locked but ${path} is missing`).toBe(true);
      expect(readName(path)).toBe(name);
    }
  });

  it("locks every vendored skill and records a hash", () => {
    // Both lock files are written by the same `skills` CLI, and they agree on every shared
    // entry, so the root lock must cover each vendored skill the manifest declares.
    const workspace = JSON.parse(
      readFileSync(resolve(ROOT, "skills/skills-lock.json"), "utf8"),
    ) as Lock;
    for (const name of skillDirs(VENDORED)) {
      const entry = lock.skills[name];
      expect(entry, `${name} is vendored but has no lock entry`).toBeDefined();
      if (!entry) continue;
      expect(entry.computedHash, `${name} needs a sha256 hash`).toMatch(/^[0-9a-f]{64}$/);
      const shared = workspace.skills[name];
      if (shared) {
        expect(entry.computedHash, `the two locks disagree on ${name}`).toBe(shared.computedHash);
      }
    }
  });
});