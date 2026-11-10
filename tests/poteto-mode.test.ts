import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Context } from "@deepseek-ai/cordis";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { readPatch } from "./patch-name.ts";

import {
  AGENT_TEAMS_CONFLICT,
  apply,
  assertNoAgentTeams,
  createPotetoModeSection,
  SECTION_NAME,
  SECTION_ORDER,
  type PromptSectionLike,
} from "../src/poteto-mode.ts";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function temporarySkill(): { skillPath: string; directory: string } {
  const directory = mkdtempSync(join(tmpdir(), "pstack-poteto-mode-"));
  directories.push(directory);
  const skillPath = join(directory, "SKILL.md");
  writeFileSync(
    skillPath,
    [
      "---",
      "name: poteto-mode",
      "description: test skill",
      "disable-model-invocation: true",
      "---",
      "",
      "# Poteto mode",
      "",
      "Distinctive body phrase: PROVE-THE-SECTION.",
      "",
      "Keep {{not_a_variable}} literal.",
      "",
    ].join("\n"),
  );
  return { skillPath, directory };
}

describe("createPotetoModeSection", () => {
  it("strips frontmatter, keeps the body literal, and injects the paths", () => {
    const { skillPath, directory } = temporarySkill();
    const harnessDocPath = "/abs/dist/pstack/docs/harness/dsh.md";
    const section = createPotetoModeSection(skillPath, harnessDocPath);

    expect(section.name).toBe(SECTION_NAME);
    expect(section.order).toBe(SECTION_ORDER);
    expect(section.interpolate).toBe(false);
    expect(section.text).toContain("PROVE-THE-SECTION");
    expect(section.text).toContain("{{not_a_variable}}");
    expect(section.text).toContain(directory);
    expect(section.text).toContain(harnessDocPath);
    expect(section.text).not.toContain("disable-model-invocation: true");
  });
});

describe("poteto-mode root preset", () => {
  it("declares the root preset with the standard groups and pstack rows", () => {
    const patch = readPatch();
    const start = patch.indexOf("    - id: preset-poteto-mode\n");
    const end = patch.indexOf("    - id: preset-poteto-mode-creator\n", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const block = patch.slice(start, end);
    expect(block).toContain("id: poteto-mode");
    expect(block).toContain('name: "dsh-pstack/preset"');
    expect(block).toContain("name: dsh-pstack/poteto-mode");
    expect(block).toContain("name: dsh-pstack");
    expect(block).toContain("id: planning");
    expect(block).toContain("id: compaction");
    expect(block).toContain("id: delegation");
    expect(block).toContain("id: tool-todo");
    expect(block).toContain("id: tool-subagent-control");
    expect(block).not.toMatch(/^\s+- id: tool-subagent$/m);
    expect(block).not.toMatch(/^\s+- id: tool-subagent-fork$/m);
  });
});

describe("poteto-mode creator root preset", () => {
  it("declares the Creator variant with tool-cordis and agent-preset skills", () => {
    const patch = readPatch();
    const start = patch.indexOf("    - id: preset-poteto-mode-creator\n");
    const end = patch.indexOf("    - id: preset-poteto-agent\n", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const block = patch.slice(start, end);
    expect(block).toContain("id: poteto-mode-creator");
    expect(block).toContain('name: "dsh-pstack/preset"');
    expect(block).toContain("name: dsh-pstack/poteto-mode");
    expect(block).toContain("id: tool-cordis");
    expect(block).toContain("customSkillDirs");
    expect(block).toContain("@deepseek-ai/dsh-agent-preset");
    expect(block).toContain("id: tool-subagent-control");
    expect(block).not.toMatch(/^\s+- id: tool-subagent$/m);
    expect(block).not.toMatch(/^\s+- id: tool-subagent-fork$/m);
  });
});

describe("Agent Teams guard", () => {
  it("rejects a profile with the Agent Teams service", () => {
    const ctx = {
      get(name: string) {
        return name === "agentTeams" ? {} : undefined;
      },
    } as unknown as Context;

    expect(() => assertNoAgentTeams(ctx)).toThrow(AGENT_TEAMS_CONFLICT);
  });
});

describe("apply", () => {
  it("registers exactly one section", () => {
    const captured: PromptSectionLike[] = [];
    const { skillPath, directory } = temporarySkill();
    const ctx = {
      get() {
        return undefined;
      },
      effect(fn: () => () => void) {
        fn();
        return () => {};
      },
      on() {
        return () => {};
      },
      systemPrompt: {
        section(section: PromptSectionLike) {
          captured.push(section);
          return () => {};
        },
      },
    } as unknown as Context;

    apply(ctx, { skillPath, harnessDocPath: join(directory, "dsh.md") });

    expect(captured).toHaveLength(1);
    expect(captured[0]?.name).toBe(SECTION_NAME);
    expect(captured[0]?.interpolate).toBe(false);
  });
});
