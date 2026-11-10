import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";

import { toDshText } from "../src/internal/native-text.ts";

const TREE_ROOT = resolve(import.meta.dirname, "../pstack/pstack");
const ADAPTER = resolve(import.meta.dirname, "../pstack/harness/docs/harness/dsh.md");

const CURSOR_SLUG =
  /\b(?:claude-opus-5-5-(?:xhigh|medium|max)|grok-4\.7-(?:xhigh|medium)-fast|gpt-5\.6-sol-max|cursor-grok-\*|composer-\*|claude-\*|grok-\*)\b/;

/** Cursor names that a shipped skill body must not carry once `toDshText` has run. */
const TRANSLATED: readonly (readonly [RegExp, string])[] = [
  [/\bTask\b/, "Task"],
  [/\bsubagent_type\b/, "subagent_type"],
  [/\bgeneralPurpose\b/, "generalPurpose"],
  [/~\/\.cursor/, "a home-relative .cursor path"],
  [/\breadonly:\s*(?:true|false)\b/, "readonly"],
  [/\benvironment:\s*"(?:cloud|local)"/, "environment"],
  [/\bcloud_base_branch\b/, "cloud_base_branch"],
  [/\b(?:AskQuestion|TodoWrite)\b/, "AskQuestion or TodoWrite"],
  [/readonly\/Ask mode/, "readonly/Ask mode"],
  [CURSOR_SLUG, "a Cursor model slug"],
];

function markdownFiles(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) markdownFiles(path, found);
    else if (name.endsWith(".md")) found.push(path);
  }
  return found;
}

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

  it("translates the unquoted subagent type without double-prefixing it", () => {
    expect(toDshText("spawn with `subagent_type: generalPurpose`.")).toBe(
      'spawn with `agent: "general"`.',
    );
    expect(toDshText("every spawn is `generalPurpose` with agent mode")).toBe(
      'every spawn is `agent: "general"` with agent mode',
    );
  });

  it("translates paths and model slugs without double-prefixing a DSH path", () => {
    expect(toDshText("~/.cursor/rules/pstack-models.mdc")).toBe("$DSH_HOME/pstack-models.mdc");
    expect(toDshText("$DSH_HOME/pstack-models.mdc")).toBe("$DSH_HOME/pstack-models.mdc");
    expect(toDshText(".cursor/skills/how/SKILL.md")).toBe(".dsh/skills/how/SKILL.md");
    expect(toDshText("~/.cursor/skills/foo-mode/SKILL.md")).toBe(
      "$DSH_HOME/skills/foo-mode/SKILL.md",
    );
    expect(toDshText("grok-4.7-xhigh-fast and claude-opus-5-5-xhigh")).toBe(
      "the configured code role and the configured judgment role",
    );
  });

  it("translates the remaining spawn fields", () => {
    expect(toDshText('environment: "cloud"')).toBe("local worktree");
    expect(toDshText('environment: "local"')).toBe("current directory");
    expect(toDshText("readonly: false")).toBe("no read-only restriction");
    expect(toDshText("readonly: true")).toBe("no file edits");
    expect(toDshText("`readonly/Ask mode`")).toBe("`read-only mode`");
    expect(toDshText("cloud_base_branch")).toBe("cwd");
  });

  it("is idempotent for already translated text", () => {
    const once = toDshText("Use pstack_subagent and $DSH_HOME/pstack-models.mdc");
    expect(toDshText(once)).toBe(once);
    expect(toDshText('agent: "general" with no read-only restriction')).toBe(
      'agent: "general" with no read-only restriction',
    );
  });

  it("leaves no Cursor name in any shipped skill, playbook, reference, or guide", () => {
    const files = markdownFiles(TREE_ROOT);
    // 58 skills plus their playbooks, references, agents, and the ten guide pages.
    expect(files.length).toBeGreaterThan(120);
    for (const file of files) {
      const label = relative(TREE_ROOT, file).replaceAll("\\", "/");
      const native = toDshText(readFileSync(file, "utf8"));
      for (const [pattern, name] of TRANSLATED) {
        expect(native, `${label} still names ${name}`).not.toMatch(pattern);
      }
    }
  });

  it("documents the Cursor-only fields that translation deliberately leaves in place", () => {
    // `run_in_background: true` is a boolean with no DSH field. Replacing the token breaks the
    // sentence at each site, so the adapter row tells the model to omit it instead.
    // Bugbot, cloud agents, and agent transcripts are Cursor products named as evidence, not as
    // instructions, so the adapter row owns the mapping and the text stays readable.
    const adapter = readFileSync(ADAPTER, "utf8");
    for (const row of [
      "`run_in_background: true`",
      "Bugbot",
      "Cursor cloud agents",
      "agent-transcripts",
    ]) {
      expect(adapter, row).toContain(row);
    }
  });
});