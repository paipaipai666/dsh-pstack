import { describe, expect, it } from "vite-plus/test";

import type { SkillSummary } from "@deepseek-ai/dsh-skill";

import { renderSkillIndex } from "../src/skill-index.ts";

function skill(name: string, description: string, modelInvocable = false): SkillSummary {
  return {
    name,
    description,
    invocation: { modelInvocable, userInvocable: true },
    source: "bundled",
    provider: "pstack",
  };
}

describe("renderSkillIndex", () => {
  it("lists hidden skills and skips the ones the catalog already shows", () => {
    const text = renderSkillIndex([
      skill("how", "walk code"),
      skill("setup-pstack", "config", true),
    ]);
    expect(text).toContain("`how`: walk code");
    expect(text).not.toContain("setup-pstack");
  });

  it("returns undefined when nothing is hidden", () => {
    expect(renderSkillIndex([skill("setup-pstack", "config", true)])).toBeUndefined();
  });

  it("prefers the trigger clause over the leading summary", () => {
    const text = renderSkillIndex([
      skill("unslop", "Rewrite the prose. Use for 'unslop this', 'cut the AI tells'."),
    ]);
    expect(text).toContain("Use for 'unslop this', 'cut the AI tells'.");
    expect(text).not.toContain("Rewrite the prose.");
  });

  it("drops a trigger clause that only repeats the skill name", () => {
    const text = renderSkillIndex([
      skill("sharpen", "Make a task deeper, not bigger. Use for /sharpen."),
    ]);
    expect(text).toContain("Make a task deeper, not bigger.");
    expect(text).not.toContain("/sharpen");
  });

  it("removes the gaps a stripped self-reference leaves behind", () => {
    const text = renderSkillIndex([
      skill("statechart", 'Check a state model. Use for "/statechart" or to show a bug as a path.'),
    ]);
    expect(text).toContain("Use to show a bug as a path.");
  });

  it("unescapes quotes carried over from generated YAML", () => {
    const text = renderSkillIndex([skill("automate-me", 'Use for \\"automate me\\", now.')]);
    expect(text).toContain('Use for "automate me", now.');
  });

  it("cuts at a word boundary and marks the cut", () => {
    const text = renderSkillIndex(
      [skill("long", "Use for one two three four five six seven eight nine")],
      24,
    );
    expect(text).toContain("`long`: Use for one two three…");
  });

  it("caps the list and reports the remainder", () => {
    const skills = [skill("a", "first one"), skill("b", "second one"), skill("c", "third one")];
    const text = renderSkillIndex(skills, 80, 2);
    expect(text).toContain("`a`");
    expect(text).not.toContain("`c`");
    expect(text).toContain("…and 1 more.");
  });
});
