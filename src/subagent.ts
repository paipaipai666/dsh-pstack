/**
 * `pstack_subagent`: pstack's delegation entry point.
 *
 * One call resolves the role file, validates every route and effort before the
 * first child starts, then starts one fresh child per selected route through
 * `ctx.subagents.startActivation`. Results arrive as completion notices; this
 * tool never polls.
 */

import { existsSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

import type { Agent, AgentOptions } from "@deepseek-ai/dsh-agent";
import type { Context } from "@deepseek-ai/cordis";
import type { LlmRuntime, ReasoningEffortId } from "@deepseek-ai/dsh-llm";
import type { WorkingDirectoryService } from "@deepseek-ai/dsh-working-directory";
import type {
  SubagentActivation,
  SubagentCapabilities,
  SubagentRuntime,
} from "@deepseek-ai/dsh-subagent";
import type { JsonSchemaNode, ToolDefinition, ToolRunContext } from "@deepseek-ai/dsh-tools";

import {
  modelsFilePath,
  readRoleConfiguration,
  requireRole,
  resolveDshHome,
  selectRoutes,
  type Route,
  type RouteSelection,
} from "./role-config.ts";
import { isRoute } from "./route.ts";

export const name = "pstack-subagent";

export const inject = ["tools", "subagents", "llm", "workingDirectory"];

export const TOOL_NAME = "pstack_subagent";

/** Default backend when the row does not name one. */
export const DEFAULT_PROVIDER = "spawn";

/** Child kinds this tool can brief. */
export const AGENT_KINDS = ["poteto-agent", "comment-sicko", "readonly", "general"] as const;

export type AgentKind = (typeof AGENT_KINDS)[number];

/** Preset id for each independently composed child kind. */
const AGENT_PRESETS: Readonly<Record<Exclude<AgentKind, "general">, string>> = {
  "poteto-agent": "poteto-agent",
  "comment-sicko": "comment-sicko",
  readonly: "readonly",
};

/** Row configuration. */
export interface PstackSubagentConfig {
  readonly provider: string;
  readonly maxDepth?: number;
}

const DEFAULT_CONFIG: PstackSubagentConfig = { provider: DEFAULT_PROVIDER };

export interface DelegationArgs {
  readonly description: string;
  readonly prompt: string;
  readonly agent: AgentKind;
  readonly role: string | null;
  readonly roleIndex: number | null;
  readonly reasoningEffort: string | null;
  readonly cwd: string | null;
  readonly maxDepth: number | null;
}

export interface ChildPlan {
  readonly index: number;
  readonly total: number;
  readonly label: string;
  readonly agent: AgentKind;
  readonly role: string;
  readonly route: Route;
  readonly routeLabel: string;
  readonly agentOptions?: AgentOptions;
  readonly agentPreset?: string;
  readonly cwd?: string;
  readonly maxDepth?: number;
}

export interface DelegationPlan {
  readonly provider: string;
  readonly role: string;
  readonly prompt: string;
  readonly children: readonly ChildPlan[];
  readonly diagnostics: readonly string[];
}

export interface ChildRecord {
  readonly childId: string;
  readonly label: string;
  readonly agent: string;
  readonly role: string;
  readonly route: string;
  readonly effort?: string;
  readonly maxDepth?: number;
}

export interface DelegationFailure {
  readonly index: number;
  readonly total: number;
  readonly label: string;
  readonly routeLabel: string;
  readonly reason: string;
}

export type DelegationResult =
  | {
      readonly kind: "activation" | "activations";
      readonly children: readonly ChildRecord[];
      readonly diagnostics: readonly string[];
    }
  | {
      readonly kind: "partial";
      readonly children: readonly ChildRecord[];
      readonly diagnostics: readonly string[];
      readonly failure: DelegationFailure;
    };

/** The live services one delegation reads. */
export interface DelegationRuntime {
  readonly subagents: SubagentRuntime;
  readonly llm: LlmRuntime;
  readonly workingDirectory: WorkingDirectoryService;
  readonly dshHome: string;
}

/** Validate the row's own config; omitted config uses the default provider. */
export function normalizeConfig(value: unknown): PstackSubagentConfig {
  if (value === undefined || value === null) return DEFAULT_CONFIG;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("pstack-subagent: config must be a mapping");
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== "provider" && key !== "maxDepth") {
      throw new Error(`pstack-subagent: unknown config field "${key}"`);
    }
  }
  const provider = record["provider"];
  if (provider !== undefined && (typeof provider !== "string" || provider.trim() === "")) {
    throw new Error("pstack-subagent: provider must be a non-empty string");
  }
  const maxDepth = record["maxDepth"];
  if (maxDepth !== undefined && !isDepth(maxDepth)) {
    throw new Error("pstack-subagent: maxDepth must be a positive safe integer");
  }
  return {
    provider: typeof provider === "string" ? provider : DEFAULT_PROVIDER,
    ...(maxDepth === undefined ? {} : { maxDepth }),
  };
}

/**
 * Read an optional argument. A model that fills a nullable field can send the text
 * `"null"`, which would otherwise become a directory named `null`; treat it as absent.
 */
function optionalValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (typeof value === "string" && ["null", "undefined"].includes(value.trim())) return null;
  return value;
}

/** Validate every model-facing argument before doing any Host call. */
export function parseDelegationArgs(raw: unknown): DelegationArgs {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("pstack_subagent arguments must be an object");
  }
  const record = raw as Record<string, unknown>;
  const known = new Set([
    "description",
    "prompt",
    "agent",
    "role",
    "roleIndex",
    "reasoningEffort",
    "cwd",
    "maxDepth",
  ]);
  for (const key of Object.keys(record)) {
    if (!known.has(key)) throw new Error(`unknown pstack_subagent argument "${key}"`);
  }
  for (const key of ["description", "prompt", "agent"]) {
    if (!Object.hasOwn(record, key)) throw new Error(`missing required argument "${key}"`);
  }

  const description = record["description"];
  const prompt = record["prompt"];
  const agent = record["agent"];
  const role = optionalValue(record["role"]);
  const roleIndex = optionalValue(record["roleIndex"]);
  const reasoningEffort = optionalValue(record["reasoningEffort"]);
  const cwd = optionalValue(record["cwd"]);
  const maxDepth = record["maxDepth"];

  if (typeof description !== "string" || description.trim() === "") {
    throw new Error("description must be a non-empty string");
  }
  if (typeof prompt !== "string" || prompt.trim() === "") {
    throw new Error("prompt must be a non-empty string");
  }
  if (typeof agent !== "string" || !(AGENT_KINDS as readonly string[]).includes(agent)) {
    throw new Error(`agent must be one of: ${AGENT_KINDS.join(", ")}`);
  }
  if (role !== null && (typeof role !== "string" || role.trim() === "")) {
    throw new Error("role must be a non-empty string or null");
  }
  if (roleIndex !== null && !isNonNegativeInteger(roleIndex)) {
    throw new Error("roleIndex must be a non-negative integer or null");
  }
  if (roleIndex !== null && role === null) throw new Error("roleIndex requires a non-null role");
  if (reasoningEffort !== null) {
    if (typeof reasoningEffort !== "string" || reasoningEffort.trim() === "") {
      throw new Error("reasoningEffort must be a non-empty string or null");
    }
    if (/\s/.test(reasoningEffort.trim())) {
      throw new Error("reasoningEffort must be one token, exactly as the model advertises it");
    }
  }
  if (cwd !== null && (typeof cwd !== "string" || cwd.trim() === "")) {
    throw new Error("cwd must be a non-empty string or null");
  }
  if (maxDepth !== undefined && maxDepth !== null && !isDepth(maxDepth)) {
    throw new Error("maxDepth must be a positive safe integer or null");
  }

  return {
    description: description.trim(),
    prompt: prompt.trim(),
    agent: agent as AgentKind,
    role: role as string | null,
    roleIndex: roleIndex as number | null,
    reasoningEffort: typeof reasoningEffort === "string" ? reasoningEffort.trim() : null,
    cwd: typeof cwd === "string" ? cwd.trim() : null,
    maxDepth: maxDepth === undefined ? null : (maxDepth as number | null),
  };
}

/** Resolve the role file, child routes, prompt, and depth before activation starts. */
export function planDelegation(
  args: DelegationArgs,
  runtime: DelegationRuntime,
  config: PstackSubagentConfig = DEFAULT_CONFIG,
): DelegationPlan {
  const path = modelsFilePath(runtime.dshHome);
  const roleFile = readRoleConfiguration(path);
  if (roleFile.status === "unreadable") {
    throw new Error(
      `the pstack role file at ${path} exists but cannot be read (${roleFile.reason}). Fix its permissions or delete it to let every role inherit the parent route.`,
    );
  }

  const diagnostics: string[] = [];
  if (roleFile.status === "loaded") {
    for (const issue of roleFile.issues) {
      diagnostics.push(
        `${path}${issue.line === undefined ? "" : `:${issue.line}`}: ${issue.message}`,
      );
    }
  }

  let selection: RouteSelection | undefined;
  if (args.role !== null) {
    const spec = requireRole(args.role);
    const entry = roleFile.status === "loaded" ? roleFile.roles.get(spec.key) : undefined;
    selection = selectRoutes(spec, entry, args.roleIndex ?? undefined);
    if (!selection.configured) {
      diagnostics.push(
        `role "${spec.key}" has no line in ${path}, so it inherits the parent route`,
      );
    }
    if (selection.mode === "selected") {
      diagnostics.push(
        `role "${spec.key}" has ${selection.total} entries; entry ${(selection.roleIndex ?? 0) + 1} was selected`,
      );
    }
  }

  const routes = selection?.routes ?? [
    { kind: "inherit" as const, alias: "inherit-parent" as const },
  ];
  const roleName = selection?.role.key ?? "(none)";
  const agentPreset = args.agent === "general" ? undefined : AGENT_PRESETS[args.agent];
  const prompt = args.agent === "poteto-agent" ? injectPotetoModeSkill(args.prompt) : args.prompt;
  const hostDepth = runtime.subagents.resolveMaxDepth(config.maxDepth);
  const depth = resolveChildDepth(args.maxDepth, config, hostDepth);

  const total = routes.length;
  const children: ChildPlan[] = routes.map((route, index) => {
    const effort = args.reasoningEffort ?? (route.kind === "route" ? route.effort : undefined);
    return {
      index,
      total,
      label:
        total > 1 ? `${args.description} [${roleName} ${index + 1}/${total}]` : args.description,
      agent: args.agent,
      role: roleName,
      route,
      routeLabel: formatRoute(route, args.reasoningEffort ?? undefined),
      ...(isRoute(route) || effort !== undefined
        ? { agentOptions: agentOptionsFor(route, effort) }
        : {}),
      ...(agentPreset === undefined ? {} : { agentPreset }),
      ...(args.cwd === null ? {} : { cwd: args.cwd }),
      ...(depth === undefined ? {} : { maxDepth: depth }),
    };
  });

  if (selection?.mode === "panel" && children.length > 1) {
    const distinct = new Set(children.map((child) => child.routeLabel));
    if (distinct.size === 1) {
      diagnostics.push(
        `all ${children.length} entries of panel "${roleName}" resolve to ${[...distinct][0]}, so they are not a cross-model panel`,
      );
    }
  }

  return {
    provider: config.provider,
    role: roleName,
    prompt,
    children,
    diagnostics,
  };
}

/** Start every planned child after one final capability and route check. */
export async function startPlannedChildren(
  parent: Agent,
  plan: DelegationPlan,
  runtime: DelegationRuntime,
  signal: AbortSignal,
): Promise<DelegationResult> {
  const provider = runtime.subagents.getProvider(plan.provider);
  if (provider === undefined) {
    const available = runtime.subagents.list();
    throw new Error(
      `subagent provider "${plan.provider}" is not registered; available providers: ${available.length === 0 ? "(none)" : available.join(", ")}`,
    );
  }

  assertCapabilities(provider.capabilities, plan);
  const sessionRoot = await runtime.workingDirectory.ensure(parent, signal);
  const children = plan.children.map((child) => ({
    ...child,
    ...(child.cwd === undefined ? {} : { cwd: resolveChildCwd(child.cwd, sessionRoot) }),
  }));

  await preflightRoutes(runtime.llm, parent, children, signal);

  const records: ChildRecord[] = [];
  for (const child of children) {
    try {
      signal.throwIfAborted();
      const activation = await runtime.subagents.startActivation({
        provider: plan.provider,
        label: child.label,
        request: {
          prompt: [{ type: "text", text: plan.prompt }],
          parent,
          ...(child.agentPreset === undefined ? {} : { agentPreset: child.agentPreset }),
          ...(child.cwd === undefined ? {} : { cwd: child.cwd }),
          ...(child.agentOptions === undefined ? {} : { agentOptions: child.agentOptions }),
          ...(child.maxDepth === undefined ? {} : { maxDepth: child.maxDepth }),
        },
        signal,
        delivery: "parent",
      });
      records.push(recordFor(child, activation));
    } catch (error) {
      if (records.length === 0) throw error;
      return {
        kind: "partial",
        children: records,
        diagnostics: plan.diagnostics,
        failure: {
          index: child.index,
          total: child.total,
          label: child.label,
          routeLabel: child.routeLabel,
          reason: describeError(error),
        },
      };
    }
  }

  return {
    kind: records.length === 1 ? "activation" : "activations",
    children: records,
    diagnostics: plan.diagnostics,
  };
}

/** Complete delegation: plan, check, start. */
export async function delegate(
  parent: Agent,
  args: DelegationArgs,
  runtime: DelegationRuntime,
  config: PstackSubagentConfig,
  signal: AbortSignal,
): Promise<DelegationResult> {
  return startPlannedChildren(parent, planDelegation(args, runtime, config), runtime, signal);
}

export function apply(ctx: Context, rawConfig?: unknown): void {
  const config = normalizeConfig(rawConfig);
  const runtime: DelegationRuntime = {
    subagents: ctx.subagents,
    llm: ctx.llm,
    workingDirectory: ctx.workingDirectory,
    dshHome: resolveDshHome(),
  };
  ctx.tools.register(createPstackSubagentTool(runtime, config));
}

/** Build the model-facing tool. Exported for tests. */
export function createPstackSubagentTool(
  runtime: DelegationRuntime,
  config: PstackSubagentConfig = DEFAULT_CONFIG,
): ToolDefinition {
  return {
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        description: {
          type: "string",
          description: "A short 3-5 word label for the child, shown in notices.",
        },
        prompt: {
          type: "string",
          description:
            "The complete, self-contained brief. The child does not see this conversation.",
        },
        agent: {
          type: "string",
          enum: [...AGENT_KINDS],
          description:
            'Child preset: "poteto-agent" for pstack implementation, "comment-sicko" for comment review, "readonly" for a sandbox-enforced read-only researcher, or "general" to join the parent preset.',
        },
        role: {
          type: ["string", "null"],
          description:
            "pstack role key. It selects the child's route and effort; null inherits the parent route.",
        },
        roleIndex: {
          type: ["integer", "null"],
          description:
            "Entry index for a list role that is not an automatic panel. Null selects the first entry; omit only through null.",
        },
        reasoningEffort: {
          type: ["string", "null"],
          description:
            "One advertised reasoning-effort token for this call, or null to keep the role's starting effort.",
        },
        cwd: {
          type: ["string", "null"],
          description:
            "Initial child working directory inside this session or a separate Git worktree; null inherits the session directory.",
        },
        maxDepth: {
          type: ["integer", "null"],
          minimum: 1,
          description:
            "Optional delegation-depth cap. Omit or null to use the configured row and Host cap; explicit values must be at least 1 and cannot exceed that cap.",
        },
      },
      required: ["description", "prompt", "agent"],
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [
        { type: "text", text: renderDelegation(value as unknown as DelegationResult) },
      ],
    },
    isConcurrencySafe: () => true,
    async execute(rawArgs, exec: ToolRunContext) {
      if (exec.agent === undefined) throw new Error("pstack_subagent requires a calling Agent");
      return delegate(exec.agent, parseDelegationArgs(rawArgs), runtime, config, exec.signal);
    },
  };
}

const TOOL_DESCRIPTION = [
  "Delegate self-contained work to one or more fresh child agents.",
  "",
  "Only `description`, `prompt`, and `agent` are required. Leave `role`, `roleIndex`, `reasoningEffort`, `cwd`, or `maxDepth` out when unused; null means the same thing. Choose agent explicitly.",
  "",
  "Omit `maxDepth` to use the configured row and Host delegation cap; an explicit value cannot exceed that cap.",
  "",
  "`agent` picks a DSH agent preset: `poteto-agent` mounts the pstack implementation delegate and receives the absolute path of the poteto-mode instructions; `comment-sicko` mounts the comment reviewer; `readonly` mounts a read-only research preset with the sandbox policy set to read-only; `general` joins the parent preset.",
  "",
  "`role` selects a configured pstack role and therefore the child's model route and starting effort. Null inherits the parent route. Automatic panel roles start one child per configured entry; `pstack_roles` reports which roles accept `roleIndex`.",
  "",
  "Returns every child id with its resolved route. Results arrive as completion notices; do not poll.",
].join("\n");

const OUTPUT_SCHEMA: JsonSchemaNode = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: { type: "string", enum: ["activation", "activations", "partial"] },
    children: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          childId: { type: "string" },
          label: { type: "string" },
          agent: { type: "string" },
          role: { type: "string" },
          route: { type: "string" },
          effort: { type: "string" },
          maxDepth: { type: "integer" },
        },
        required: ["childId", "label", "agent", "role", "route"],
      },
    },
    diagnostics: { type: "array", items: { type: "string" } },
    failure: {
      type: "object",
      additionalProperties: false,
      properties: {
        index: { type: "integer" },
        total: { type: "integer" },
        label: { type: "string" },
        routeLabel: { type: "string" },
        reason: { type: "string" },
      },
      required: ["index", "total", "label", "routeLabel", "reason"],
    },
  },
  required: ["kind", "children", "diagnostics"],
};

function renderDelegation(result: DelegationResult): string {
  const lines = [
    result.kind === "partial"
      ? `started ${result.children.length} of ${result.failure.total} children; entry ${result.failure.index + 1} failed: ${result.failure.reason}`
      : result.kind === "activation"
        ? `started 1 child: ${result.children[0]?.childId ?? "(none)"}`
        : `started ${result.children.length} children:`,
    ...result.children.map(
      (child) =>
        `- ${child.childId} (${child.label}) agent=${child.agent} role=${child.role} route=${child.route}${child.effort === undefined ? "" : ` effort=${child.effort}`}${child.maxDepth === undefined ? "" : ` maxDepth=${child.maxDepth}`}`,
    ),
    "Results from started children arrive as completion notices; do not poll for them.",
  ];
  if (result.diagnostics.length > 0) {
    lines.push("", "Diagnostics:", ...result.diagnostics.map((line) => `- ${line}`));
  }
  return lines.join("\n");
}

function recordFor(child: ChildPlan, activation: SubagentActivation): ChildRecord {
  return {
    childId: activation.childId,
    label: child.label,
    agent: child.agent,
    role: child.role,
    route: child.routeLabel,
    ...(child.agentOptions?.reasoningEffort === undefined
      ? {}
      : { effort: child.agentOptions.reasoningEffort }),
    ...(child.maxDepth === undefined ? {} : { maxDepth: child.maxDepth }),
  };
}

function agentOptionsFor(route: Route, effort: string | undefined): AgentOptions {
  return isRoute(route)
    ? {
        provider: route.provider,
        model: route.model,
        ...(effort === undefined ? {} : { reasoningEffort: effort as ReasoningEffortId }),
      }
    : effort === undefined
      ? {}
      : { reasoningEffort: effort as ReasoningEffortId };
}

function formatRoute(route: Route, override?: string): string {
  const effort = override ?? (isRoute(route) ? route.effort : undefined);
  const base = isRoute(route) ? `${route.provider}/${route.model}` : "inherit-parent";
  return effort === undefined ? base : `${base} [${effort}]`;
}

function resolveChildDepth(
  requested: number | null,
  config: PstackSubagentConfig,
  hostLimit: number | undefined,
): number | undefined {
  const depth = requested ?? hostLimit;
  if (depth === undefined) return undefined;
  if (!Number.isSafeInteger(depth) || depth < 1) {
    throw new Error("maxDepth must be a positive safe integer or null");
  }
  if (config.maxDepth !== undefined && depth > config.maxDepth) {
    throw new Error(`maxDepth ${depth} exceeds this row's configured cap of ${config.maxDepth}`);
  }
  if (hostLimit !== undefined && depth > hostLimit) {
    throw new Error(`maxDepth ${depth} exceeds the Host delegation limit of ${hostLimit}`);
  }
  return depth;
}

function assertCapabilities(capabilities: SubagentCapabilities, plan: DelegationPlan): void {
  const needsAgentOptions = plan.children.some((child) => child.agentOptions !== undefined);
  const needsPreset = plan.children.some((child) => child.agentPreset !== undefined);
  const needsDepth = plan.children.some((child) => child.maxDepth !== undefined);
  const missing = [
    ...(needsAgentOptions && !capabilities.agentOptions ? ["agentOptions"] : []),
    ...(needsPreset && !capabilities.agentPreset ? ["agentPreset"] : []),
    ...(needsDepth && !capabilities.depthLimit ? ["maxDepth"] : []),
  ];
  if (missing.length > 0) {
    throw new Error(`subagent provider does not support ${missing.join(", ")}`);
  }
}

async function preflightRoutes(
  llm: LlmRuntime,
  parent: Agent,
  children: readonly ChildPlan[],
  signal: AbortSignal,
): Promise<void> {
  for (const child of children) {
    const options = child.agentOptions;
    if (options === undefined) continue;
    const provider = options.provider ?? parent.options.provider;
    const model = options.model ?? parent.options.model;
    if (provider === undefined || model === undefined) {
      throw new Error(
        `cannot resolve role "${child.role}" because the child has no provider/model and the parent has not made a request yet`,
      );
    }
    try {
      await llm.resolveCallConfig(
        {
          provider,
          model,
          ...(options.reasoningEffort === undefined
            ? {}
            : { reasoningEffort: options.reasoningEffort }),
        },
        signal,
      );
    } catch (error) {
      throw new Error(
        `role "${child.role}" resolves to ${child.routeLabel}, which failed route preflight: ${describeError(error)}`,
      );
    }
  }
}

function resolveChildCwd(requested: string, sessionRoot: string): string {
  const target = isAbsolute(requested) ? resolve(requested) : resolve(sessionRoot, requested);
  let directory = false;
  try {
    directory = statSync(target).isDirectory();
  } catch {
    directory = false;
  }
  if (!directory) throw new Error(`cwd ${target} does not exist or is not a directory`);
  if (isWithin(sessionRoot, target) || existsSync(join(target, ".git"))) return target;
  throw new Error(
    `cwd ${target} is outside the session directory (${sessionRoot}) and is not a Git worktree`,
  );
}

function isWithin(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function injectPotetoModeSkill(task: string): string {
  return [
    "Load the `poteto-mode` skill before doing any work:",
    'call `pstack_skill` with `name: "poteto-mode"` and read the full instructions,',
    "including its inline Principles index.",
    "",
    "Your skill catalog hides this skill, so a missing catalog entry does not mean pstack is absent.",
    "",
    "Task:",
    "",
    task,
  ].join("\n");
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isDepth(value: unknown): value is number {
  return isNonNegativeInteger(value) && value >= 1;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
