/**
 * `pstack_doctor`: a read-only preflight for the local prerequisites pstack playbooks use.
 *
 * It checks the commands that must exist on PATH, the five bundled script artefacts,
 * the role configuration file, and the `dsh` CLI against the declared `engines.dsh`
 * range. It never installs anything and never reads model routes; `pstack_models` owns those.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type {
  JsonSchemaNode,
  ToolDefinition,
  ToolRunContext,
  ToolsHost,
  WorkingDirectoryHost,
} from "./host-contract.ts";
import { OPTIONAL_PLUGINS, type OptionalPluginId } from "./optional-plugins.ts";
import { PACKAGE_ROOT, PORT_ROOT } from "./paths.ts";
import { modelsFilePath, resolveDshHome } from "./role-config.ts";
import { SCRIPT_ENTRIES } from "./script-registry.ts";

/** Cordis row name, used by Loader diagnostics. */
export const name = "pstack-doctor";

/** The row only needs the tool registry. */
export const inject = ["tools"];

/** Model-facing tool name. */
export const TOOL_NAME = "pstack_doctor";

/** The external commands the pstack playbooks may call. */
export const CHECKED_COMMANDS = ["git", "gh", "node", "ffmpeg", "mise", "java"] as const;

export type CheckedCommand = (typeof CHECKED_COMMANDS)[number];

export interface CommandCheck {
  readonly name: string;
  readonly ok: boolean;
  readonly version?: string;
  readonly authenticated?: boolean;
}

/** Evidence categories `/why` maps mounted MCP tools into. */
export const MCP_EVIDENCE_CATEGORIES = [
  "errors",
  "logs",
  "metrics",
  "traces",
  "deploys",
  "flags",
  "Database",
  "tickets",
] as const;

export type McpEvidenceCategory = (typeof MCP_EVIDENCE_CATEGORIES)[number];

export interface McpCategoryMatch {
  readonly category: McpEvidenceCategory;
  readonly tools: readonly string[];
}

export interface ScriptCheck {
  readonly id: string;
  readonly path: string;
  readonly ok: boolean;
}

export type OptionalPluginStatus = "enabled" | "installed" | "partial" | "missing" | "unknown";

export interface OptionalPluginCheck {
  readonly id: OptionalPluginId;
  readonly bundle?: string;
  readonly packages: readonly string[];
  readonly status: OptionalPluginStatus;
}

export interface DoctorReport {
  readonly platform: string;
  readonly node: string;
  readonly dsh: DshCheck;
  readonly dshHome: string;
  readonly commands: readonly CommandCheck[];
  readonly scripts: readonly ScriptCheck[];
  readonly optionalPlugins: readonly OptionalPluginCheck[];
  readonly roleFile: {
    readonly path: string;
    readonly exists: boolean;
  };
  readonly workspace: WorkspaceCheck;
  readonly mcpCategories?: readonly McpCategoryMatch[];
}

/**
 * The DSH CLI that will load this plugin, measured against the `engines.dsh`
 * range in this package's manifest. DSH refuses to activate a plugin below that
 * range, so a stale CLI explains most "the plugin does nothing" reports.
 */
export interface DshCheck {
  /** The first line of `dsh --version`, minus a leading `v`. */
  readonly version?: string;
  /** The `engines.dsh` range; `"unspecified"` when the manifest carries none. */
  readonly range: string;
  /** `undefined` when no version was found or the range cannot be compared. */
  readonly ok?: boolean;
}

/** What a Cursor project would carry into DSH, and what DSH actually reads. */
export interface WorkspaceCheck {
  /** The directory that was inspected, when one could be resolved. */
  readonly path?: string;
  readonly checked: boolean;
  /** `.mdc` files under `.cursor/rules`, relative to that directory. */
  readonly cursorRules: readonly string[];
  readonly agentsFile: boolean;
  /** Set only when something in the workspace would silently do nothing. */
  readonly hint?: string;
}

export type CommandRunner = (command: string, args: readonly string[]) => string | undefined;

export interface DoctorHost {
  readonly dshHome: string;
  readonly profileDir?: string;
  readonly workspacePath?: string;
  /** Override the declared `engines.dsh` range; tests and forks use this. */
  readonly dshRange?: string;
  readonly runCommand?: CommandRunner;
  readonly exists?: (path: string) => boolean;
  readonly readFile?: (path: string) => string | undefined;
  readonly readDir?: (path: string) => readonly string[];
  readonly resolveWorkspace?: (exec: ToolRunContext) => Promise<string | undefined>;
  readonly toolNames?: readonly string[];
  readonly resolveToolNames?: (exec: ToolRunContext) => readonly string[];
}

const VERSION_ARGS: Readonly<Record<string, readonly (readonly string[])[]>> = {
  ffmpeg: [["-version"], ["--version"]],
  java: [["--version"], ["-version"]],
};

/** `0.2.2-rc.3` and `0.2.2` are the shapes `dsh --version` and `engines.dsh` use. */
const VERSION_TEXT = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

interface ParsedVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: readonly string[];
}

function parseVersionText(text: string): ParsedVersion | undefined {
  const match = VERSION_TEXT.exec(text.trim());
  if (match === null) return undefined;
  const [, major = "", minor = "", patch = "", prerelease] = match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease === undefined ? [] : prerelease.split("."),
  };
}

/** Semver precedence: a release outranks its prereleases, numeric ids sort below text. */
function compareVersions(left: ParsedVersion, right: ParsedVersion): number {
  const core = left.major - right.major || left.minor - right.minor || left.patch - right.patch;
  if (core !== 0) return core;
  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    return left.prerelease.length === right.prerelease.length
      ? 0
      : left.prerelease.length === 0
        ? 1
        : -1;
  }
  const shared = Math.min(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < shared; index += 1) {
    const a = left.prerelease[index] ?? "";
    const b = right.prerelease[index] ?? "";
    if (a === b) continue;
    const numeric = /^\d+$/.test(a);
    if (numeric !== /^\d+$/.test(b)) return numeric ? -1 : 1;
    return numeric ? Number(a) - Number(b) : a < b ? -1 : 1;
  }
  return left.prerelease.length - right.prerelease.length;
}

/** Only `>=`, `>`, and a bare version are meaningful in an `engines.dsh` range. */
function satisfiesRange(version: ParsedVersion, range: string): boolean | undefined {
  const match = /^(>=|>)?\s*(.+)$/.exec(range.trim());
  if (match === null) return undefined;
  const bound = parseVersionText(match[2] ?? "");
  if (bound === undefined) return undefined;
  const comparison = compareVersions(version, bound);
  return match[1] === ">" ? comparison > 0 : comparison >= 0;
}

/** The `engines.dsh` range this package declares, read from its own manifest. */
function declaredDshRange(readFile: (path: string) => string | undefined): string {
  const manifest = readFile(join(PACKAGE_ROOT, "package.json"));
  if (manifest === undefined) return "unspecified";
  try {
    const engines = (JSON.parse(manifest) as { engines?: { dsh?: unknown } }).engines;
    const range = engines?.dsh;
    return typeof range === "string" && range.trim() !== "" ? range.trim() : "unspecified";
  } catch {
    return "unspecified";
  }
}

/** Run one command and return its first output line, or undefined when it is unavailable. */
export function runCommandVersion(
  command: string,
  explicitArgs?: readonly string[],
): string | undefined {
  const attempts =
    explicitArgs !== undefined ? [explicitArgs] : (VERSION_ARGS[command] ?? [["--version"]]);
  for (const args of attempts) {
    const result = spawnSync(command, args, {
      encoding: "utf8",
      timeout: 5_000,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.error !== undefined || result.status !== 0) continue;
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    return output.split(/\r?\n/, 1)[0] || "available";
  }
  return undefined;
}

/** Resolve the active profile directory, deriving it from DSH_HOME when the environment omits it. */
export function resolveProfileDir(
  env: {
    readonly DSH_HOME?: string;
    readonly DSH_PROFILE_DIR?: string;
    readonly DSH_PROFILE?: string;
  },
  dshHome: string,
): string {
  const explicit = env.DSH_PROFILE_DIR?.trim();
  if (explicit) return explicit;
  const profile = env.DSH_PROFILE?.trim() || "desktop";
  return join(dshHome, "profiles", profile);
}

/** Read the current profile's optional-plugin state from its package manifest. */
export function collectOptionalPluginChecks(
  profileDir: string | undefined,
  readFile: (path: string) => string | undefined,
): readonly OptionalPluginCheck[] {
  if (profileDir === undefined) {
    return OPTIONAL_PLUGINS.map((plugin) => ({
      id: plugin.id,
      ...(plugin.bundle === undefined ? {} : { bundle: plugin.bundle }),
      packages: plugin.packages,
      status: "unknown",
    }));
  }

  let manifest: {
    dependencies?: Record<string, unknown>;
    optionalDependencies?: Record<string, unknown>;
    dsh?: { profile?: { bundles?: unknown } };
  };
  try {
    const text = readFile(join(profileDir, "package.json"));
    if (text === undefined) throw new Error("missing package.json");
    manifest = JSON.parse(text) as typeof manifest;
  } catch {
    return OPTIONAL_PLUGINS.map((plugin) => ({
      id: plugin.id,
      ...(plugin.bundle === undefined ? {} : { bundle: plugin.bundle }),
      packages: plugin.packages,
      status: "unknown",
    }));
  }

  const dependencies = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ]);
  const bundles = new Set(
    Array.isArray(manifest.dsh?.profile?.bundles)
      ? manifest.dsh.profile.bundles.filter((name): name is string => typeof name === "string")
      : [],
  );

  return OPTIONAL_PLUGINS.map((plugin) => {
    let status: OptionalPluginStatus;
    if (plugin.bundle !== undefined) {
      status = bundles.has(plugin.bundle)
        ? "enabled"
        : dependencies.has(plugin.bundle)
          ? "installed"
          : "missing";
    } else {
      const installed = plugin.packages.filter((packageName) =>
        dependencies.has(packageName),
      ).length;
      status =
        installed === 0
          ? "missing"
          : installed === plugin.packages.length
            ? "installed"
            : "partial";
    }
    return {
      id: plugin.id,
      ...(plugin.bundle === undefined ? {} : { bundle: plugin.bundle }),
      packages: plugin.packages,
      status,
    };
  });
}

/**
 * Report what a Cursor workspace carries that DSH never reads.
 *
 * DSH loads `AGENTS.md`; `.cursor/rules/*.mdc` is inert. The check stays read-only and
 * names the files, because "my rules stopped working" is otherwise invisible.
 */
export function collectWorkspaceCheck(
  workspacePath: string | undefined,
  exists: (path: string) => boolean,
  readDir: (path: string) => readonly string[],
): WorkspaceCheck {
  if (workspacePath === undefined) {
    return { checked: false, agentsFile: false, cursorRules: [] };
  }
  const rulesDir = join(workspacePath, ".cursor", "rules");
  const cursorRules = readDir(rulesDir)
    .filter((entry) => entry.toLowerCase().endsWith(".mdc"))
    .sort();
  const agentsFile = exists(join(workspacePath, "AGENTS.md"));
  const check: WorkspaceCheck = {
    path: workspacePath,
    checked: true,
    agentsFile,
    cursorRules,
  };
  if (cursorRules.length > 0 && !agentsFile) {
    return {
      ...check,
      hint: "DSH never loads .cursor/rules/*.mdc. Move the rules that must apply into AGENTS.md.",
    };
  }
  return check;
}

const MCP_TOOL_NAME = /^mcp__([a-zA-Z0-9_-]+?)__(.+)$/;

const MCP_CATEGORY_PATTERNS: Readonly<Record<McpEvidenceCategory, RegExp>> = {
  errors: /sentry|bugsnag|rollbar|honeybadger|crashlytics|error|exception|issue_event/i,
  logs: /loki|splunk|cloudwatch|papertrail|axiom|(?:^|[_-])logs?(?:[_-]|$)/i,
  metrics: /prometheus|grafana|newrelic|statsd|metric/i,
  traces: /jaeger|tempo|zipkin|honeycomb|otel|trace|span/i,
  deploys: /vercel|render|railway|argo|deploy|release|workflow_run/i,
  flags: /launchdarkly|statsig|unleash|flagsmith|growthbook|flag|experiment/i,
  Database:
    /postgres|mysql|sqlite|supabase|prisma|planetscale|neon|redis|mongo|(?:^|[_-])(?:db|sql|query)(?:[_-]|$)/i,
  tickets:
    /linear|jira|asana|shortcut|notion|ticket|zendesk|intercom|pagerduty|(?:github|gitlab).*issues?/i,
};

/** Classify mounted `mcp__<server>__<tool>` names into `/why` evidence categories. */
export function classifyMcpTools(toolNames: readonly string[]): readonly McpCategoryMatch[] {
  const buckets = new Map<McpEvidenceCategory, Set<string>>();
  for (const name of toolNames) {
    const match = MCP_TOOL_NAME.exec(name);
    if (match === null) continue;
    const target = `${match[1]}_${match[2]}`;
    for (const category of MCP_EVIDENCE_CATEGORIES) {
      if (MCP_CATEGORY_PATTERNS[category].test(target)) {
        let set = buckets.get(category);
        if (set === undefined) {
          set = new Set<string>();
          buckets.set(category, set);
        }
        set.add(name);
      }
    }
  }
  return MCP_EVIDENCE_CATEGORIES.flatMap((category) => {
    const tools = buckets.get(category);
    if (tools === undefined || tools.size === 0) return [];
    return [{ category, tools: [...tools].sort() }];
  });
}

function collectDshCheck(
  host: DoctorHost,
  run: CommandRunner | undefined,
  readFile: (path: string) => string | undefined,
): DshCheck {
  const range = host.dshRange ?? declaredDshRange(readFile);
  const output = run !== undefined ? run("dsh", ["--version"]) : runCommandVersion("dsh");
  const version = output?.split(/\r?\n/, 1)[0]?.trim().replace(/^v/, "");
  if (version === undefined || version === "") return { range };
  const parsed = parseVersionText(version);
  if (parsed === undefined || range === "unspecified") return { version, range };
  return { version, range, ok: satisfiesRange(parsed, range) };
}

/** Build the report without touching any external service. */
export function collectDoctorReport(host: DoctorHost): DoctorReport {
  const exists = host.exists ?? existsSync;
  const readFile =
    host.readFile ??
    ((path: string): string | undefined => {
      try {
        return readFileSync(path, "utf8");
      } catch {
        return undefined;
      }
    });
  const run = host.runCommand;
  const readDir =
    host.readDir ??
    ((path: string): readonly string[] => {
      try {
        return readdirSync(path);
      } catch {
        return [];
      }
    });
  const commands = CHECKED_COMMANDS.map((command): CommandCheck => {
    const version =
      run !== undefined
        ? run(command, command === "ffmpeg" ? ["-version"] : ["--version"])
        : runCommandVersion(command);
    if (version === undefined) return { name: command, ok: false };
    if (command === "gh") {
      const auth =
        run !== undefined
          ? run("gh", ["auth", "status"])
          : runCommandVersion("gh", ["auth", "status"]);
      return { name: command, ok: true, version, authenticated: auth !== undefined };
    }
    return { name: command, ok: true, version };
  });
  const scripts = SCRIPT_ENTRIES.map((entry) => {
    const path = join(PORT_ROOT, ...entry.assetPath.split("/"));
    return { id: entry.id, path, ok: exists(path) };
  });
  const rolePath = modelsFilePath(host.dshHome);
  return {
    platform: process.platform,
    node: process.versions.node,
    dsh: collectDshCheck(host, run, readFile),
    dshHome: host.dshHome,
    commands,
    scripts,
    optionalPlugins: collectOptionalPluginChecks(host.profileDir, readFile),
    roleFile: { path: rolePath, exists: exists(rolePath) },
    workspace: collectWorkspaceCheck(host.workspacePath, exists, readDir),
    ...(host.toolNames === undefined ? {} : { mcpCategories: classifyMcpTools(host.toolNames) }),
  };
}

export function renderReport(report: DoctorReport): string {
  const requires = report.dsh.range === "unspecified" ? "" : ` (requires ${report.dsh.range})`;
  const dshLine =
    report.dsh.version === undefined
      ? `dsh: not found on PATH${requires}`
      : report.dsh.ok === false
        ? `dsh: ${report.dsh.version} is older than the required ${report.dsh.range}`
        : `dsh: ${report.dsh.version}${requires}`;
  const commandLines = report.commands.map((command) => {
    if (!command.ok) return `- ${command.name}: MISSING`;
    const suffix = command.authenticated === false ? " (unauthenticated)" : "";
    return `- ${command.name}: ${command.version ?? "available"}${suffix}`;
  });
  const scriptLines = report.scripts.map(
    (script) => `- ${script.id}: ${script.ok ? "present" : `MISSING (${script.path})`}`,
  );
  const pluginLines = report.optionalPlugins.map((plugin) => {
    const target = plugin.bundle ?? plugin.packages.join(", ");
    return `- ${plugin.id}: ${plugin.status} (${target})`;
  });
  const workspace = report.workspace;
  const workspaceLines = !workspace.checked
    ? ["workspace: not inspected"]
    : [
        `workspace: ${workspace.path ?? "unknown"}`,
        `AGENTS.md: ${workspace.agentsFile ? "present" : "missing"}`,
        workspace.cursorRules.length === 0
          ? "cursor rules: none"
          : `cursor rules: ${workspace.cursorRules.length} .mdc file(s) under .cursor/rules (${workspace.cursorRules.join(", ")})${workspace.agentsFile ? "; DSH only reads AGENTS.md" : ""}`,
        ...(workspace.hint === undefined ? [] : [`hint: ${workspace.hint}`]),
      ];
  const mcpLines =
    report.mcpCategories === undefined
      ? []
      : [
          "",
          "mcp evidence categories:",
          ...(report.mcpCategories.length === 0
            ? ["- none"]
            : report.mcpCategories.map(
                (entry) => `- ${entry.category}: ${entry.tools.join(", ")}`,
              )),
        ];
  return [
    "pstack doctor",
    `platform: ${report.platform}`,
    `node: ${report.node}`,
    dshLine,
    `DSH home: ${report.dshHome}`,
    "",
    "commands:",
    ...commandLines,
    "",
    "bundled scripts:",
    ...scriptLines,
    "",
    "optional plugins:",
    ...pluginLines,
    "",
    `role file: ${report.roleFile.exists ? "present" : "missing"} (${report.roleFile.path})`,
    "",
    ...workspaceLines,
    ...mcpLines,
  ].join("\n");
}

const OUTPUT_SCHEMA: JsonSchemaNode = {
  type: "object",
  additionalProperties: false,
  properties: {
    platform: { type: "string" },
    node: { type: "string" },
    dsh: {
      type: "object",
      additionalProperties: false,
      properties: {
        version: { type: "string" },
        range: { type: "string" },
        ok: { type: "boolean" },
      },
      required: ["range"],
    },
    dshHome: { type: "string" },
    commands: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          ok: { type: "boolean" },
          version: { type: "string" },
          authenticated: { type: "boolean" },
        },
        required: ["name", "ok"],
      },
    },
    scripts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          path: { type: "string" },
          ok: { type: "boolean" },
        },
        required: ["id", "path", "ok"],
      },
    },
    optionalPlugins: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          bundle: { type: "string" },
          packages: { type: "array", items: { type: "string" } },
          status: {
            type: "string",
            enum: ["enabled", "installed", "partial", "missing", "unknown"],
          },
        },
        required: ["id", "packages", "status"],
      },
    },
    roleFile: {
      type: "object",
      additionalProperties: false,
      properties: {
        path: { type: "string" },
        exists: { type: "boolean" },
      },
      required: ["path", "exists"],
    },
    workspace: {
      type: "object",
      additionalProperties: false,
      properties: {
        path: { type: "string" },
        checked: { type: "boolean" },
        cursorRules: { type: "array", items: { type: "string" } },
        agentsFile: { type: "boolean" },
        hint: { type: "string" },
      },
      required: ["checked", "cursorRules", "agentsFile"],
    },
    mcpCategories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: {
            type: "string",
            enum: [...MCP_EVIDENCE_CATEGORIES],
          },
          tools: { type: "array", items: { type: "string" } },
        },
        required: ["category", "tools"],
      },
    },
  },
  required: [
    "platform",
    "node",
    "dshHome",
    "commands",
    "scripts",
    "optionalPlugins",
    "roleFile",
    "workspace",
  ],
};

const TOOL_DESCRIPTION = [
  "Check the local prerequisites pstack playbooks use: git, gh, node, ffmpeg, mise, java,",
  "the five bundled script artefacts, the role configuration file, the optional plugin",
  "state recorded in the current profile manifest, what the workspace itself expects,",
  "and the `dsh` CLI version measured against this package's `engines.dsh` range.",
  "",
  "Read-only. It reports what is present, never installs anything, and never reads model routes.",
  "Missing commands are reported with their name; a missing script lists the expected path.",
  "A `dsh` below the declared range is called out because DSH refuses to activate the plugin.",
  "The five scripts run on the host's own Node. `gh` matters to `watch-pr`, `mise` and `java`",
  "to `statechart`'s TLC run, and `git` to `worktree-audit`; no bundled script needs `bun` or `jq`.",
  "Optional plugin status is enabled, installed, partial, missing, or unknown.",
  "",
  "The workspace check names `.cursor/rules/*.mdc` files, because DSH loads `AGENTS.md` and never",
  "reads Cursor's rule files. Pass `workspacePath` to inspect a directory other than the session's.",
].join("\n");

export function createPstackDoctorTool(host: DoctorHost): ToolDefinition {
  return {
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        workspacePath: {
          type: "string",
          description:
            "Directory to inspect for Cursor rule files; defaults to the session workspace.",
        },
      },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [
        { type: "text", text: renderReport(value as unknown as DoctorReport) },
      ],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const requested = (args as { readonly workspacePath?: unknown }).workspacePath;
      const workspacePath =
        typeof requested === "string"
          ? requested
          : (host.workspacePath ?? (await host.resolveWorkspace?.(exec)));
      const toolNames = host.toolNames ?? host.resolveToolNames?.(exec);
      return collectDoctorReport({
        ...host,
        workspacePath,
        ...(toolNames === undefined ? {} : { toolNames }),
      });
    },
  };
}

/** The slice of the Cordis context this row uses. */
export interface PstackDoctorHost {
  readonly tools: ToolsHost;
  readonly workingDirectory: WorkingDirectoryHost;
}

/** Register `pstack_doctor`. */
export function apply(ctx: PstackDoctorHost): void {
  ctx.tools.register(
    createPstackDoctorTool({
      dshHome: resolveDshHome(process.env),
      profileDir: resolveProfileDir(process.env, resolveDshHome(process.env)),
      resolveWorkspace: async (exec) => {
        if (exec.agent === undefined) {
          return undefined;
        }
        try {
          return await ctx.workingDirectory.ensure(exec.agent, exec.signal);
        } catch {
          return undefined;
        }
      },
      resolveToolNames: (exec) => {
        try {
          return ctx.tools.schemas(exec.agent).map((schema) => schema.name);
        } catch {
          return [];
        }
      },
    }),
  );
}
