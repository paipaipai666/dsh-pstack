import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { translateSkillCatalog } from "../scripts/translate-skill-catalog.mjs";

const roots = [];

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), "pstack-catalog-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("translateSkillCatalog", () => {
  test("rewrites every Markdown file, including nested skill references", () => {
    const root = tempRoot();
    mkdirSync(join(root, "demo", "references"), { recursive: true });
    writeFileSync(join(root, "demo", "SKILL.md"), "Task tool");
    writeFileSync(join(root, "demo", "references", "extra.md"), "no change");
    writeFileSync(join(root, "demo", "notes.txt"), "Task tool");

    const changed = translateSkillCatalog(root, (text) => text.replace("Task", "pstack_subagent"));

    expect(changed).toBe(1);
    expect(readFileSync(join(root, "demo", "SKILL.md"), "utf8")).toBe("pstack_subagent tool");
    expect(readFileSync(join(root, "demo", "references", "extra.md"), "utf8")).toBe("no change");
    expect(readFileSync(join(root, "demo", "notes.txt"), "utf8")).toBe("Task tool");
  });

  test("ships the built catalog with Cursor names already translated", () => {
    const skills = join(import.meta.dirname, "..", "dist", "pstack", "skills");
    const broken = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith(".md")) {
          const text = readFileSync(path, "utf8");
          for (const pattern of [/~\/\.cursor/, /\bsubagent_type\b/, /\bgeneralPurpose\b/]) {
            if (pattern.test(text)) broken.push(`${path}: ${pattern}`);
          }
        }
      }
    };
    walk(skills);
    expect(broken).toEqual([]);
  });
});
