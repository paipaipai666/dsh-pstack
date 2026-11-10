import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { SkillDefinition, SkillRegistry } from "@deepseek-ai/dsh-skill";

import { createPstackSkillTool, readSkillResource, renderLoadedSkill } from "../src/skill.ts";
import type { ToolRunContext } from "@deepseek-ai/dsh-tools";

const directories: string[] = [];

function temporarySkill(): SkillDefinition {
  const directory = mkdtempSync(join(tmpdir(), "pstack-skill-"));
  directories.push(directory);
  mkdirSync(join(directory, "references"));
  writeFileSync(join(directory, "references", "explorer-prompt.md"), "explore this\n");
  writeFileSync(
    join(directory, "SKILL.md"),
    "---\nname: how\ndescription: walk code\n---\n\n# How\n",
  );
  return {
    name: "how",
    description: "walk code",
    provider: "pstack",
    resourceBase: { kind: "directory", path: directory },
    content: "# How\n",
    invocation: { modelInvocable: false, userInvocable: true },
    source: "bundled",
  };
}

const exec = { signal: new AbortController().signal } as unknown as ToolRunContext;

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("pstack_skill", () => {
  it("loads a hidden skill by name", async () => {
    const definition = temporarySkill();
    const skills = {
      get: async (name: string) => (name === "how" ? definition : undefined),
    } as unknown as SkillRegistry;
    const tool = createPstackSkillTool(skills);
    const result = await tool.execute({ name: "how" }, exec);
    expect(result).toMatchObject({ name: "how", provider: "pstack", content: "# How\n" });
    const rendered = renderLoadedSkill(result as never);
    expect(rendered).toContain('<skill_content name="how">');
    expect(rendered).toContain("Base directory for this skill:");
    expect(rendered).toContain("Load referenced resources only as needed.");
  });

  it("reads a relative resource and refuses traversal", async () => {
    const definition = temporarySkill();
    await expect(readSkillResource(definition, "references/explorer-prompt.md")).resolves.toEqual({
      path: "references/explorer-prompt.md",
      content: "explore this\n",
    });
    await expect(readSkillResource(definition, "../secret.txt")).rejects.toThrow(
      /escapes the skill directory/,
    );
  });

  it("rejects an invalid skill name before querying the registry", async () => {
    const tool = createPstackSkillTool({
      get: async () => {
        throw new Error("must not be called");
      },
    } as unknown as SkillRegistry);
    await expect(tool.execute({ name: "../secret" }, exec)).rejects.toThrow("invalid skill name");
  });

  it("reports an unknown skill", async () => {
    const tool = createPstackSkillTool({ get: async () => undefined } as unknown as SkillRegistry);
    await expect(tool.execute({ name: "nope" }, exec)).rejects.toThrow(
      'skill "nope" is unknown or no longer available',
    );
  });
});
