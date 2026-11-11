/**
 * `pstack-poteto-mode`: mount the full `poteto-mode` skill as a persistent section.
 *
 * A root session that selects the `poteto-mode` preset keeps this section for its
 * whole life, so the model never has to load the skill again between turns.
 */

import { readFileSync } from "node:fs";
import { dirname } from "node:path";

import type { Context } from "@deepseek-ai/cordis";

import { HARNESS_DOC_PATH, POTETO_MODE_SKILL_PATH } from "./paths.ts";
import { toDshText } from "./native-text.ts";

export const name = "pstack-poteto-mode";

export const inject = ["systemPrompt"];

/** Stable section name. */
export const SECTION_NAME = "pstack:poteto-mode";

/** Section order. */
export const SECTION_ORDER = 10;

/** Notice shown when Agent Teams would compete with pstack delegation. */
export const AGENT_TEAMS_CONFLICT =
  "pstack root presets cannot run their persistent poteto-mode workflow while Agent Teams is enabled in this profile. This preset loads without that section. Disable @deepseek-ai/dsh-experimental-agent-team-profile to restore it.";

/** Whether Agent Teams owns delegation in this context. */
export function hasAgentTeams(ctx: Context): boolean {
  const host = ctx as unknown as { get(name: string): unknown };
  return host.get("agentTeams") !== undefined;
}

/** The prompt section shape accepted by the system prompt registry. */
export interface PromptSectionLike {
  readonly name: string;
  readonly order: number;
  readonly text: string;
  readonly interpolate?: boolean;
}

/** The slice of `ctx.systemPrompt` this row writes to. */
export interface SystemPromptHost {
  systemPrompt: {
    section(section: PromptSectionLike): () => void;
  };
}

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

/**
 * Build the persistent section from a skill file and the DSH adapter path.
 *
 * The leading YAML frontmatter is stripped, and `interpolate: false` keeps any
 * literal `{{...}}` in the skill body from being resolved as a prompt variable.
 */
export function createPotetoModeSection(
  skillPath: string = POTETO_MODE_SKILL_PATH,
  harnessDocPath: string = HARNESS_DOC_PATH,
): PromptSectionLike {
  const body = toDshText(readFileSync(skillPath, "utf8").replace(FRONTMATTER, ""));
  const skillDirectory = dirname(skillPath);
  const text = [
    "You are running in the persistent pstack `poteto-mode` root preset. The full `poteto-mode` skill below stays in this system prompt for every turn of the session.",
    "",
    `- Skill file: ${skillPath}`,
    `- Skill directory: ${skillDirectory}`,
    `- DSH adapter: ${harnessDocPath}`,
    "",
    `Read the DSH adapter at ${harnessDocPath} once per session before you follow this skill.`,
    "",
    body.replace(/^\n+/, ""),
  ].join("\n");
  return { name: SECTION_NAME, order: SECTION_ORDER, interpolate: false, text };
}

/** Optional section sources. Tests pass a temporary skill so `apply` does not read the built tree. */
export interface PotetoModeSectionPaths {
  readonly skillPath?: string;
  readonly harnessDocPath?: string;
}

export function apply(ctx: Context, paths?: PotetoModeSectionPaths): void {
  const host = ctx as unknown as SystemPromptHost;
  if (hasAgentTeams(ctx)) {
    const notice: PromptSectionLike = {
      name: SECTION_NAME,
      order: SECTION_ORDER,
      interpolate: false,
      text: AGENT_TEAMS_CONFLICT,
    };
    ctx.effect(() => host.systemPrompt.section(notice), "pstack.poteto-mode.agent-teams-notice()");
    return;
  }
  const section = createPotetoModeSection(paths?.skillPath, paths?.harnessDocPath);
  ctx.effect(() => host.systemPrompt.section(section), "pstack.poteto-mode.section()");
}
