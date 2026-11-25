/**
 * `pstack-playbook-router`: name the playbook a request belongs to before the
 * model has to guess.
 *
 * The 59 pstack skills are procedural and hidden, so a request never says which
 * one applies; left alone the model either loads none (measured: 0 of 10 tasks)
 * or loads one the description happens to match. Playbooks are the entry layer
 * that pstack already writes down: 23 titled documents whose first line states
 * the situation they are for. Routing over that small index is cheap (about 800
 * tokens, measured) and accurate (5 of 5 large tasks at top-1).
 *
 * The plugin routes one user message, once: it appends a short notice naming the
 * playbook and how to open it (`pstack_skill` with a `resource`). It never loads
 * the body itself, never writes files, and stays silent when no playbook fits —
 * a small change should not be dressed up as a project.
 *
 * Rationale and the measured alternatives live in `docs/fork/`.
 */

import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Context } from "@deepseek-ai/cordis";
import type { PreStepDecision } from "@deepseek-ai/dsh-agent";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import type { ContextFormed } from "@deepseek-ai/dsh-llm";

declare module "@deepseek-ai/dsh-llm" {
  interface MessageSourceMap {
    "playbook-route": { kind: "playbook-route" } & ContextFormed;
  }
}

export const name = "pstack-playbook-router";

export const inject = ["llm"];

/** Default output ceiling for the routing call; the answer is one line of JSON. */
export const DEFAULT_MAX_TOKENS = 400;

/** Default wall-clock limit for the routing call. */
export const DEFAULT_TIMEOUT_MS = 6000;

/** Requests shorter than this are not worth a routing call. */
export const DEFAULT_MIN_PROMPT_CHARS = 12;

export interface Config {
  /** Output ceiling for the routing call. */
  readonly maxTokens?: number;
  /** Wall-clock limit for the routing call; on timeout the turn continues unrouted. */
  readonly timeoutMs?: number;
  /** Requests shorter than this skip routing. */
  readonly minPromptChars?: number;
  /** Playbook directory; resolved from the package when omitted. */
  readonly playbookDir?: string;
  /** Append one JSON line per decision here; used by the experiment and audits. */
  readonly tracePath?: string;
}

/** One playbook, as the router sees it. */
export interface Playbook {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
}

/** The router's answer. */
export type RouteDecision =
  | { readonly kind: "playbook"; readonly id: string; readonly why: string }
  | { readonly kind: "none" }
  | { readonly kind: "invalid"; readonly detail: string };

/** A message as far as prompt extraction is concerned. */
export interface PromptMessage {
  readonly source?: { readonly kind?: string };
  readonly content: readonly { readonly type: string; readonly text?: string }[];
}

const SYSTEM_PROMPT = [
  "You route engineering requests to one playbook.",
  'Answer with JSON only: {"playbook": "<id>" or null, "why": "<12 words max>"}',
  "Pick the playbook whose steps fit how the work has to run.",
  "Answer null when the request is one obvious change, a single file, a question, or work that finishes in one pass.",
  "Never invent an id.",
].join("\n");

/** Appended to the system prompt for the single repair attempt. */
const RETRY_SUFFIX = "Answer again with only the JSON object, nothing else.";

/**
 * Read every playbook beside the bundled poteto-mode skill.
 *
 * The directory differs between the source tree (tests, `src/…` → `pstack/…`)
 * and the built module (`dist/…` → `dist/pstack/…`), so both are tried and the
 * first that exists wins.
 */
export function loadPlaybooks(directory?: string): Playbook[] {
  const dir = directory ?? resolvePlaybookDir();
  if (dir === undefined || !existsSync(dir)) return [];
  const playbooks: Playbook[] = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".md")) continue;
    const text = readFileSync(join(dir, file), "utf8");
    const parsed = parsePlaybook(basename(file, ".md"), text);
    if (parsed !== undefined) playbooks.push(parsed);
  }
  return playbooks;
}

function resolvePlaybookDir(): string | undefined {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const suffix = join("skills", "poteto-mode", "playbooks");
  for (const candidate of [join(here, "pstack", suffix), join(here, "..", "pstack", suffix)]) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

/** A playbook's title and its first sentence of purpose. */
export function parsePlaybook(id: string, text: string): Playbook | undefined {
  const lines = text.split(/\r?\n/);
  const heading = lines.find((line) => /^#{1,6}\s+\S/.test(line));
  const prose = lines
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => stripEmphasis(line));
  // A one-line ownership sentence is a weaker routing signal than the paragraph
  // under it, so a short first line borrows the next one that is not a step.
  const phrases = prose.filter((line) => !/^\d+[.)]/.test(line));
  const first = phrases[0];
  if (first === undefined) return undefined;
  const summary = (first.length < 40 ? phrases.slice(0, 2).join(" ") : first).slice(0, 200);
  return {
    id,
    title: heading === undefined ? id.replace(/-/g, " ") : heading.replace(/^#+\s+/, ""),
    summary,
  };
}

/** Drop the emphasis that marks a playbook's lead sentence. */
function stripEmphasis(line: string): string {
  return line
    .replace(/^[-*>]\s*/, "")
    .replace(/\*\*|__|\*|_/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The index the router reads: one line per playbook. */
export function renderPlaybookIndex(playbooks: readonly Playbook[]): string {
  return playbooks
    .map((playbook) => `- \`${playbook.id}\`: ${playbook.title}. ${playbook.summary}`)
    .join("\n");
}

/** The newest user-authored text in a batch of claimed messages. */
export function latestUserText(messages: readonly PromptMessage[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message === undefined || message.source?.kind !== "user") continue;
    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n")
      .trim();
    if (text !== "") return text;
  }
  return undefined;
}

/**
 * Read the router's answer.
 *
 * Models sometimes wrap JSON in prose or a fence, and a reasoning model can
 * leave `content` empty, so the caller passes whatever text it collected.
 */
export function parseRoute(answer: string, known: ReadonlySet<string>): RouteDecision {
  const start = answer.indexOf("{");
  const end = answer.lastIndexOf("}");
  if (start < 0 || end <= start) return parseBareRoute(answer, known);
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer.slice(start, end + 1));
  } catch {
    return { kind: "invalid", detail: "unparseable JSON object" };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { kind: "invalid", detail: "answer is not a JSON object" };
  }
  const record = parsed as Record<string, unknown>;
  const id = record.playbook;
  if (id === null || id === undefined) return { kind: "none" };
  if (typeof id !== "string" || !known.has(id)) {
    return { kind: "invalid", detail: `unknown playbook ${JSON.stringify(id)}` };
  }
  const why = typeof record.why === "string" ? record.why.trim().slice(0, 120) : "";
  return { kind: "playbook", id, why };
}

/**
 * Read an answer that has no JSON at all.
 *
 * A reasoning model can spend its budget thinking and then answer with the id
 * alone, or the word null. Accepting exactly one known id — and refusing to
 * guess when two are named — recovers that answer without turning a slip of the
 * model into a coin flip.
 */
function parseBareRoute(answer: string, known: ReadonlySet<string>): RouteDecision {
  const text = answer.trim();
  if (text === "") return { kind: "invalid", detail: "empty answer" };
  const named = [...known]
    .filter((id) => new RegExp(`(^|[^a-z0-9-])${id}([^a-z0-9-]|$)`).test(text))
    .sort((left, right) => left.localeCompare(right));
  if (named.length === 1) return { kind: "playbook", id: named[0] as string, why: "" };
  if (named.length > 1) {
    return { kind: "invalid", detail: `several playbooks named: ${named.join(", ")}` };
  }
  if (/^(null|none|no playbook)\b/i.test(text)) return { kind: "none" };
  return { kind: "invalid", detail: "no JSON object in answer" };
}

/** The notice appended to the turn when the router picks a playbook. */
export function renderRouteMessage(
  decision: RouteDecision,
  playbooks: readonly Playbook[],
): string | undefined {
  if (decision.kind !== "playbook") return undefined;
  const playbook = playbooks.find((entry) => entry.id === decision.id);
  const title = playbook?.title ?? decision.id;
  const why = decision.why === "" ? [] : [`Reason: ${decision.why}`];
  return [
    "<system-reminder>",
    `This request is **${title}** work. Open \`playbooks/${decision.id}.md\` with \`pstack_skill\` (name \`poteto-mode\`, resource \`playbooks/${decision.id}.md\`) and follow its steps before acting.`,
    ...why,
    "</system-reminder>",
  ].join("\n");
}

/** Turn whatever text and reasoning the stream produced into one answer. */
export function collectAnswer(
  chunks: AsyncIterable<{ type: string; text?: string }>,
): Promise<string> {
  return (async () => {
    let text = "";
    let reasoning = "";
    for await (const chunk of chunks) {
      if (chunk.type === "text-delta" && chunk.text !== undefined) text += chunk.text;
      if (chunk.type === "reasoning-delta" && chunk.text !== undefined) reasoning += chunk.text;
    }
    return text.trim() === "" ? reasoning : text;
  })();
}

/** Append one decision to the audit trail, when the operator asked for one. */
function trace(path: string | undefined, record: Record<string, unknown>): void {
  if (path === undefined) return;
  try {
    appendFileSync(path, `${JSON.stringify(record)}\n`);
  } catch {
    // A trace that cannot be written must not cost the turn.
  }
}

/** Install the router listener. */
export function apply(ctx: Context, config: Config = {}): void {
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const minPromptChars = config.minPromptChars ?? DEFAULT_MIN_PROMPT_CHARS;
  const playbooks = loadPlaybooks(config.playbookDir);
  if (playbooks.length === 0) return;
  const index = renderPlaybookIndex(playbooks);
  const known = new Set(playbooks.map((playbook) => playbook.id));

  ctx.on(
    "agent/pre-step",
    async ({ messages, modelSelection, signal }, next): Promise<PreStepDecision> => {
      const decision = await next();
      if (decision.kind === "reject") return decision;

      const prompt = latestUserText(messages);
      if (prompt === undefined || prompt.length < minPromptChars || prompt.startsWith("/")) {
        return decision;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const started = Date.now();
      try {
        // A routing call rides the turn's own route, so a preset does not have
        // to name one and a configured role keeps working unchanged.
        const ask = async (suffix?: string): Promise<string> =>
          collectAnswer(
            ctx.llm.stream({
              provider: modelSelection.provider,
              model: modelSelection.model,
              ...(modelSelection.reasoningEffort === undefined
                ? {}
                : { reasoningEffort: modelSelection.reasoningEffort }),
              system: suffix === undefined ? SYSTEM_PROMPT : `${SYSTEM_PROMPT}\n${suffix}`,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: `${index}\n\n---\n\nRequest:\n${prompt.slice(0, 4000)}` },
                  ],
                },
              ],
              maxTokens,
              signal: AbortSignal.any([signal, controller.signal]),
            }),
          );

        let answer = await ask();
        let route = parseRoute(answer, known);
        // One repair attempt, because the failure seen in practice is a model
        // that thinks out loud and never emits the object, not a model that
        // disagrees about the playbook.
        if (route.kind === "invalid") {
          answer = await ask(RETRY_SUFFIX);
          route = parseRoute(answer, known);
        }
        trace(config.tracePath, {
          at: new Date().toISOString(),
          decision: route,
          ...(route.kind === "invalid" ? { answer: answer.slice(0, 400) } : {}),
          latencyMs: Date.now() - started,
          playbooks: playbooks.length,
        });
        const text = renderRouteMessage(route, playbooks);
        if (text === undefined || route.kind !== "playbook") return decision;
        const message = createUserMessage({
          content: [{ type: "text", text }],
          source: {
            kind: "playbook-route",
            form: "notice",
            summary: `pstack playbook: ${route.id}`,
          },
        });
        return { ...decision, messages: [...decision.messages, message] };
      } catch (error) {
        // A router that breaks the turn is worse than a turn without routing.
        trace(config.tracePath, {
          at: new Date().toISOString(),
          decision: {
            kind: "error",
            detail: error instanceof Error ? error.message : String(error),
          },
          latencyMs: Date.now() - started,
          playbooks: playbooks.length,
        });
        return decision;
      } finally {
        clearTimeout(timer);
      }
    },
  );
}
