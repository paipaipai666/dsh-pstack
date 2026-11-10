import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";

const ROOT = resolve(import.meta.dirname, "..");
/** Skills this repository uses itself, synced by the root `prepare` script. */
const REPO_SKILLS = resolve(ROOT, ".agents/skills");
/** Skills the package ships, synced by the `skills` workspace package. */
const SHIPPED_SKILLS = resolve(ROOT, "skills/.agents/skills");
const AUTHORED = resolve(ROOT, "skills/authored");

type Manifest = { skills?: { source: string; skills: string[] }[] };
type LockEntry = { sourceType: string; computedHash: string; source: string };
type Lock = { skills: Record<string, LockEntry> };

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

const manifest = readJson<Manifest>(resolve(ROOT, "package.json"));
const workspaceManifest = readJson<Manifest>(resolve(ROOT, "skills/package.json"));
const lock = readJson<Lock>(resolve(ROOT, "skills-lock.json"));
const workspaceLock = readJson<Lock>(resolve(ROOT, "skills/skills-lock.json"));

function skillDirs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function declared(manifest: Manifest): string[] {
  return (manifest.skills ?? []).flatMap((entry) => entry.skills).sort();
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

function expectNames(dir: string, names: string[]): void {
  for (const name of names) {
    const path = resolve(dir, name, "SKILL.md");
    expect(existsSync(path), `${name} has no SKILL.md at ${path}`).toBe(true);
    expect(readName(path), `${name} must name itself in its frontmatter`).toBe(name);
  }
}

describe("declared skill sources", () => {
  it("keeps the repository skill tree on disk and in the root lock", () => {
    const onDisk = skillDirs(REPO_SKILLS);
    expect(onDisk.length).toBeGreaterThan(0);
    expect(Object.keys(lock.skills).sort()).toEqual(onDisk);
    expectNames(REPO_SKILLS, onDisk);
  });

  it("declares every skill the root manifest syncs", () => {
    const names = declared(manifest);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(skillDirs(REPO_SKILLS), `${name} is declared but not synced`).toContain(name);
    }
  });

  it("keeps the authored skills on disk, in the root lock and in the shipped tree", () => {
    const local = Object.keys(lock.skills)
      .filter((name) => lock.skills[name]?.sourceType === "local")
      .sort();
    expect(local).toEqual(skillDirs(AUTHORED));
    expectNames(AUTHORED, local);
  });

  it("keeps the shipped skill tree on disk, in the workspace lock and in the workspace manifest", () => {
    const onDisk = skillDirs(SHIPPED_SKILLS);
    expect(onDisk.length).toBeGreaterThan(0);
    expect(Object.keys(workspaceLock.skills).sort()).toEqual(onDisk);
    expect(declared(workspaceManifest)).toEqual(onDisk);
    expectNames(SHIPPED_SKILLS, onDisk);
  });

  it("records a sha256 hash for every fetched skill and agrees across both locks", () => {
    for (const [name, entry] of Object.entries(workspaceLock.skills)) {
      expect(entry.computedHash, `${name} needs a sha256 hash`).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.sourceType, `${name} must come from a fetched source`).not.toBe("local");
    }
    for (const [name, entry] of Object.entries(lock.skills)) {
      expect(entry.computedHash, `${name} needs a sha256 hash`).toMatch(/^[0-9a-f]{64}$/);
      const shared = workspaceLock.skills[name];
      if (shared) {
        expect(entry.computedHash, `the two locks disagree on ${name}`).toBe(shared.computedHash);
      }
    }
  });
});
