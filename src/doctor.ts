/**
 * `pstack_doctor`: a read-only preflight for the local prerequisites pstack playbooks use.
 *
 * It checks the commands that must exist on PATH, the five bundled script artefacts, and
 * the role configuration file. It never installs anything and never reads model routes;
 * `pstack_models` owns those.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { JsonSchemaNode, ToolDefinition, ToolsHost } from "./internal/host-contract.ts";
import { OPTIONAL_PLUGINS, type OptionalPluginId } from "./internal/optional-plugins.ts";
import { PORT_ROOT } from "./internal/paths.ts";
import { modelsFilePath, resolveDshHome } from "./internal/role-config.ts";
import { SCRIPT_ENTRIES } from "./internal/script-registry.ts";

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
  readonly dshHome: string;
  readonly commands: readonly CommandCheck[];
  readonly scripts: readonly ScriptCheck[];
  readonly optionalPlugins: readonly OptionalPluginCheck[];
  readonly roleFile: {
    readonly path: string;
    readonly exists: boolean;
  };
}

export type CommandRunner = (command: string, args: readonly string[]) => string | undefined;

export interface DoctorHost {
  readonly dshHome: string;
  readonly profileDir?: string;
  readonly runCommand?: CommandRunner;
  readonly exists?: (path: string) => boolean;
  readonly readFile?: (path: string) => string | undefined;
}

/** Run one command and return its first output line, or undefined when it is unavailable. */
export function runCommandVersion(command: string): string | undefined {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    timeout: 5_000,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined || result.status !== 0) return undefined;
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return output.split(/\r?\n/, 1)[0] || "available";
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
      const installed = plugin.packages.filter((packageName) => dependencies.has(packageName)).length;
      status =
        installed === 0 ? "missing" : installed === plugin.packages.length ? "installed" : "partial";
    }
    return {
      id: plugin.id,
      ...(plugin.bundle === undefined ? {} : { bundle: plugin.bundle }),
      packages: plugin.packages,
      status,
    };
  });
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
  const run = host.runCommand ?? ((command: string) => runCommandVersion(command));
  const commands = CHECKED_COMMANDS.map((command) => {
    const version = run(command, ["--version"]);
    return version === undefined
      ? { name: command, ok: false }
      : { name: command, ok: true, version };
  });
  const scripts = SCRIPT_ENTRIES.map((entry) => {
    const path = join(PORT_ROOT, ...entry.assetPath.split("/"));
    return { id: entry.id, path, ok: exists(path) };
  });
  const rolePath = modelsFilePath(host.dshHome);
  return {
    platform: process.platform,
    node: process.versions.node,
    dshHome: host.dshHome,
    commands,
    scripts,
    optionalPlugins: collectOptionalPluginChecks(host.profileDir, readFile),
    roleFile: { path: rolePath, exists: exists(rolePath) },
  };
}

function renderReport(report: DoctorReport): string {
  const commandLines = report.commands.map(
    (command) => `- ${command.name}: ${command.ok ? command.version ?? "available" : "MISSING"}`,
  );
  const scriptLines = report.scripts.map(
    (script) => `- ${script.id}: ${script.ok ? "present" : `MISSING (${script.path})`}`,
  );
  const pluginLines = report.optionalPlugins.map((plugin) => {
    const target = plugin.bundle ?? plugin.packages.join(", ");
    return `- ${plugin.id}: ${plugin.status} (${target})`;
  });
  return [
    "pstack doctor",
    `platform: ${report.platform}`,
    `node: ${report.node}`,
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
  ].join("\n");
}

const OUTPUT_SCHEMA: JsonSchemaNode = {
  type: "object",
  additionalProperties: false,
  properties: {
    platform: { type: "string" },
    node: { type: "string" },
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
          status: { type: "string", enum: ["enabled", "installed", "partial", "missing", "unknown"] },
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
  },
  required: ["platform", "node", "dshHome", "commands", "scripts", "optionalPlugins", "roleFile"],
};

const TOOL_DESCRIPTION = [
  "Check the local prerequisites pstack playbooks use: git, gh, node, ffmpeg, mise, java,",
  "the five bundled script artefacts, the role configuration file, and the optional plugin",
  "state recorded in the current profile manifest.",
  "",
  "Read-only. It reports what is present, never installs anything, and never reads model routes.",
  "Missing commands are reported with their name; a missing script lists the expected path.",
  "Optional plugin status is enabled, installed, partial, missing, or unknown.",
].join("\n");

export function createPstackDoctorTool(host: DoctorHost): ToolDefinition {
  return {
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [
        { type: "text", text: renderReport(value as unknown as DoctorReport) },
      ],
    },
    isConcurrencySafe: () => true,
    async execute() {
      return collectDoctorReport(host);
    },
  };
}

/** The slice of the Cordis context this row uses. */
export interface PstackDoctorHost {
  readonly tools: ToolsHost;
}

/** Register `pstack_doctor`. */
export function apply(ctx: PstackDoctorHost): void {
  ctx.tools.register(
    createPstackDoctorTool({
      dshHome: resolveDshHome(process.env),
      profileDir: process.env.DSH_PROFILE_DIR,
    }),
  );
}
