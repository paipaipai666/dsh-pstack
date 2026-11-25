/**
 * `pstack-skill-index`: put the names of hidden pstack skills in the model's context.
 *
 * Every generated pstack skill sets `disable-model-invocation: true`, so the
 * session skill catalog hides all of them and the model cannot discover one by
 * name. The `pstack_skill` tool can still load them, but only when the name is
 * already known. This row closes that gap without paying for 58 full
 * descriptions: it appends one line per hidden skill — the name plus the first
 * sentence of its description — once per agent, and leaves the body behind
 * `pstack_skill`.
 *
 * Rationale and the measured alternatives live in `docs/fork/`.
 */

import type { Context } from "@deepseek-ai/cordis";
import type { Agent, PreStepDecision } from "@deepseek-ai/dsh-agent";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import type { ContextFormed } from "@deepseek-ai/dsh-llm";
import type { SkillSummary } from "@deepseek-ai/dsh-skill";

declare module "@deepseek-ai/dsh-llm" {
  interface MessageSourceMap {
    "skill-index": { kind: "skill-index" } & ContextFormed;
  }
}

export const name = "pstack-skill-index";

export const inject = ["skills"];

/** Characters of each description kept in the index line. */
export const DEFAULT_MAX_DESCRIPTION_CHARS = 110;

/** How many hidden skills the index lists before it truncates. */
export const DEFAULT_LIMIT = 80;

export interface Config {
  /** Characters of each description kept in the index line. */
  readonly maxDescriptionChars?: number;
  /** How many hidden skills the index lists before it truncates. */
  readonly limit?: number;
}

/**
 * Build the index text from the catalog.
 *
 * Only skills the catalog hides are listed: a skill that is already visible
 * would be listed twice, and the catalog line carries the full description.
 */
export function renderSkillIndex(
  skills: readonly SkillSummary[],
  maxDescriptionChars: number = DEFAULT_MAX_DESCRIPTION_CHARS,
  limit: number = DEFAULT_LIMIT,
): string | undefined {
  const lines: string[] = [];
  for (const skill of skills) {
    if (skill.invocation.modelInvocable) continue;
    const description = indexDescription(skill.description, skill.name, maxDescriptionChars);
    lines.push(description === "" ? `- \`${skill.name}\`` : `- \`${skill.name}\`: ${description}`);
  }
  if (lines.length === 0) return undefined;
  const shown = lines.slice(0, limit);
  const more = lines.length > shown.length ? [`…and ${lines.length - shown.length} more.`] : [];
  return [
    "<system-reminder>",
    "pstack skill index. These skills are hidden from the `skill` tool; when one matches the request, load it before acting by calling `pstack_skill` with the exact kebab-case name.",
    ...shown,
    ...more,
    "</system-reminder>",
  ].join("\n");
}

/** A description clause that names when to reach for the skill. */
const TRIGGER_CLAUSE =
  /\b(?:Use for|Use when|Use only when|Apply when|Apply to|Apply after|Apply before)\b/;

/** How much of a clause has to survive cleanup to be worth showing. */
const MIN_INFORMATIVE_CHARS = 24;

/**
 * The one line shown for a skill.
 *
 * Descriptions in this corpus read "what it does. Use for <triggers>", so the
 * leading sentence answers "what" while the trigger clause answers "when" — and
 * when truncation has to pick one, "when" is what routing needs. The skill's own
 * name is stripped from its trigger clause: "Use for /architect" says nothing.
 */
function indexDescription(description: string, name: string, maxChars: number): string {
  const normalized = description
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ")
    .replace(/^\s*-\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized === "") return "";

  const triggerIndex = normalized.search(TRIGGER_CLAUSE);
  const candidates = triggerIndex > 0 ? [normalized.slice(triggerIndex), normalized] : [normalized];
  for (const candidate of candidates) {
    const cleaned = stripSelfReference(candidate, name);
    if (cleaned.length >= MIN_INFORMATIVE_CHARS) return clip(cleaned, maxChars);
  }
  return clip(candidates[candidates.length - 1] ?? normalized, maxChars);
}

/** Drop ``/name`` fragments that only repeat the skill, and the gaps they leave. */
function stripSelfReference(text: string, name: string): string {
  return text
    .replace(new RegExp(`["'\`]?/${name}["'\`,]?`, "gi"), " ")
    .replace(/\s+/g, " ")
    .replace(/\b(for|when|to)\s+(or|and)\b/gi, "$1")
    .replace(/\b(for|when)\s+to\b/gi, "to")
    .replace(/^[\s,.;:]+/, "")
    .replace(/[\s,;:]+$/, "")
    .replace(/["'`]+$/, "")
    .trim();
}

/** Cut at a word boundary rather than mid-word. */
function clip(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const head = text.slice(0, maxChars - 1);
  const boundary = head.lastIndexOf(" ");
  return `${(boundary > maxChars / 2 ? head.slice(0, boundary) : head).trimEnd()}…`;
}

/** Install the index listener. */
export function apply(ctx: Context, config: Config = {}): void {
  const maxDescriptionChars = config.maxDescriptionChars ?? DEFAULT_MAX_DESCRIPTION_CHARS;
  const limit = config.limit ?? DEFAULT_LIMIT;

  // One emission per agent per catalog revision: the message joins the session
  // history, so re-emitting an unchanged index would only spend tokens.
  const emitted = new WeakMap<Agent, string>();

  ctx.on("agent/pre-step", async ({ agent }, next): Promise<PreStepDecision> => {
    const decision = await next();
    if (decision.kind === "reject") return decision;

    const skills = await ctx.skills.list();
    const text = renderSkillIndex(skills, maxDescriptionChars, limit);
    if (text === undefined) return decision;

    const hidden = skills.filter((skill) => !skill.invocation.modelInvocable);
    const digest = `${hidden.map((skill) => skill.name).join(",")}@${text.length}`;
    if (emitted.get(agent) === digest) return decision;
    emitted.set(agent, digest);

    const message = createUserMessage({
      content: [{ type: "text", text }],
      source: {
        kind: "skill-index",
        form: "notice",
        summary: `pstack skill index: ${hidden.length}`,
      },
    });
    return { ...decision, messages: [...decision.messages, message] };
  });
}
