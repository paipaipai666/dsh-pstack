import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";

const ROOT = resolve(import.meta.dirname, "..");
const GENERATED = join(ROOT, "pstack", "pstack");

function directoriesWithSkill(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      try {
        return statSync(join(root, name, "SKILL.md")).isFile();
      } catch {
        return false;
      }
    })
    .sort();
}

describe("upstream parity", () => {
  it("keeps the upstream pstack skill, playbook, and agent inventory", () => {
    const skills = directoriesWithSkill(join(GENERATED, "skills"));
    expect(skills).toHaveLength(58);
    expect(skills.filter((name) => name.startsWith("principle-"))).toHaveLength(24);
    expect(
      readdirSync(join(GENERATED, "skills", "poteto-mode", "playbooks")).filter((name) =>
        name.endsWith(".md"),
      ),
    ).toHaveLength(23);
    expect(
      readdirSync(join(GENERATED, "agents")).filter((name) => name.endsWith(".md")),
    ).toHaveLength(2);
    expect(
      readdirSync(join(GENERATED, "docs", "guide")).filter((name) => name.endsWith(".md")),
    ).toHaveLength(11);
  });

  it("keeps every generated skill name aligned with its directory", () => {
    const root = join(GENERATED, "skills");
    for (const name of directoriesWithSkill(root)) {
      const text = readFileSync(join(root, name, "SKILL.md"), "utf8");
      const frontmatterName = text.match(/^---\r?\nname:\s*(.+)$/m)?.[1]?.trim();
      expect(frontmatterName, name).toBe(name);
    }
  });
});
