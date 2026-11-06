import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";

import { toDshText } from "../src/internal/native-text.ts";

const SKILLS_ROOT = resolve(import.meta.dirname, "../pstack/pstack/skills");

describe("native skill text translation", () => {
  it("translates Cursor task and subagent fields", () => {
    const text = toDshText(
      'Use `Task` with `subagent_type: "generalPurpose"`, `readonly: true`, and `run_in_background: true`.',
    );
    expect(text).toContain("pstack_subagent");
    expect(text).toContain('agent: "general"');
    expect(text).toContain("no file edits");
    expect(text).not.toContain("subagent_type");
  });

  it("translates paths and model slugs without double-prefixing a DSH path", () => {
    expect(toDshText("~/.cursor/rules/pstack-models.mdc")).toBe("$DSH_HOME/pstack-models.mdc");
    expect(toDshText("$DSH_HOME/pstack-models.mdc")).toBe("$DSH_HOME/pstack-models.mdc");
    expect(toDshText(".cursor/skills/how/SKILL.md")).toBe(".dsh/skills/how/SKILL.md");
    expect(toDshText("grok-4.7-xhigh-fast and claude-opus-5-5-xhigh")).toBe(
      "the configured code role and the configured judgment role",
    );
  });

  it("is idempotent for already translated text", () => {
    const once = toDshText("Use pstack_subagent and $DSH_HOME/pstack-models.mdc");
    expect(toDshText(once)).toBe(once);
  });

  it("removes Cursor-only names from every generated skill body", () => {
    for (const name of readdirSync(SKILLS_ROOT)) {
      const file = join(SKILLS_ROOT, name, "SKILL.md");
      try {
        if (!statSync(file).isFile()) continue;
      } catch {
        continue;
      }
      const native = toDshText(readFileSync(file, "utf8"));
      expect(native, name).not.toMatch(/\bTask\b|subagent_type|~\/\.cursor/);
      expect(native, name).not.toMatch(
        /\b(?:claude-opus-5-5-(?:xhigh|medium|max)|grok-4\.7-(?:xhigh|medium)-fast|gpt-5\.6-sol-max|cursor-grok-\*|composer-\*|claude-\*|grok-\*)\b/,
      );
    }
  });
});
