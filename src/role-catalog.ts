/**
 * `pstack_roles`: a read-only capability and route query over the role manifest.
 *
 * `pstack_subagent` requires `role` and accepts `roleIndex` for any list role
 * (including individual slots of automatic panels). This tool reports the manifest
 * shapes alongside the routes currently configured in `$DSH_HOME/pstack-models.mdc`.
 */

import type { Context } from "@deepseek-ai/cordis";
import type { JsonSchemaNode, ToolDefinition } from "@deepseek-ai/dsh-tools";

import {
  modelsFilePath,
  readRoleConfiguration,
  resolveDshHome,
  type RoleEntry,
} from "./role-config.ts";
import { ROLE_MANIFEST, type RoleSpec } from "./role-manifest.ts";
import { renderRouteValue } from "./route.ts";

export const name = "pstack-role-catalog";

export const inject = ["tools"];

export const TOOL_NAME = "pstack_roles";

export interface RoleCapability {
  readonly role: string;
  readonly shape: "single" | "list";
  readonly autoPanel: boolean;
  readonly roleIndex: "not-applicable" | "optional";
  readonly usage: string;
  readonly configured?: boolean;
  readonly routes?: readonly string[];
}

/** Derive one role's capability record. */
export function roleCapability(
  spec: RoleSpec,
  entry?: RoleEntry,
  includeRoutes = false,
): RoleCapability {
  const routeFields = includeRoutes
    ? {
        configured: entry !== undefined,
        routes:
          entry === undefined
            ? ["inherit-parent"]
            : entry.routes.map((route) => renderRouteValue([route])),
      }
    : {};
  if (spec.autoPanel) {
    return {
      role: spec.key,
      shape: spec.shape,
      autoPanel: true,
      roleIndex: "optional",
      usage:
        "starts one child per configured entry, or one child on the selected entry when roleIndex is given",
      ...routeFields,
    };
  }
  if (spec.shape === "list") {
    return {
      role: spec.key,
      shape: spec.shape,
      autoPanel: false,
      roleIndex: "optional",
      usage: "starts one child on the selected entry",
      ...routeFields,
    };
  }
  return {
    role: spec.key,
    shape: spec.shape,
    autoPanel: false,
    roleIndex: "not-applicable",
    usage: "starts one child on the role's single route",
    ...routeFields,
  };
}

/** Every role's capability record in manifest order, optionally enriched from `$DSH_HOME/pstack-models.mdc`. */
export function roleCapabilities(dshHome?: string): readonly RoleCapability[] {
  if (dshHome === undefined) {
    return ROLE_MANIFEST.map((spec) => roleCapability(spec));
  }
  const config = readRoleConfiguration(modelsFilePath(dshHome));
  if (config.status === "unreadable") {
    return ROLE_MANIFEST.map((spec) => roleCapability(spec));
  }
  const roles = config.status === "loaded" ? config.roles : undefined;
  return ROLE_MANIFEST.map((spec) => roleCapability(spec, roles?.get(spec.key), true));
}

/** Render the capabilities for the model. */
export function renderRoleCapabilities(roles: readonly RoleCapability[]): string {
  return [
    "pstack roles. Pass the exact `role` key. `roleIndex` is optional for list and automatic panel roles, and null otherwise.",
    "",
    ...roles.map(
      (role) =>
        `- ${role.role} — shape=${role.shape}${role.autoPanel ? ", autoPanel=true" : ""}; roleIndex=${role.roleIndex}; ${role.usage}${role.routes === undefined ? "" : `; routes=${role.routes.length === 0 ? "inherit-parent" : role.routes.join(", ")}`}`,
    ),
  ].join("\n");
}

const OUTPUT_SCHEMA: JsonSchemaNode = {
  type: "object",
  additionalProperties: false,
  properties: {
    roles: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          role: { type: "string" },
          shape: { type: "string", enum: ["single", "list"] },
          autoPanel: { type: "boolean" },
          roleIndex: { type: "string", enum: ["not-applicable", "optional"] },
          usage: { type: "string" },
          configured: { type: "boolean" },
          routes: { type: "array", items: { type: "string" } },
        },
        required: ["role", "shape", "autoPanel", "roleIndex", "usage"],
      },
    },
  },
  required: ["roles"],
};

const TOOL_DESCRIPTION = [
  "List every pstack role with its `shape`, `autoPanel`, and configured routes from `$DSH_HOME/pstack-models.mdc`, so a `pstack_subagent` call passes the right `role` and `roleIndex` before it starts.",
  "",
  "Read-only. Use `pstack_models` to inspect all live routes this deployment serves.",
  "",
  "`roleIndex` applies to list roles (`arena cross-judge pool`, `swarm workers`) and optionally selects a single slot from an automatic panel (`arena runners`, `interrogate reviewers`). Pass null for every single role or to spawn a full automatic panel.",
].join("\n");

/** Build the tool definition. */
export function createPstackRolesTool(dshHome: string = resolveDshHome()): ToolDefinition {
  return {
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: { type: "object", additionalProperties: false, properties: {} },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [
        {
          type: "text",
          text: renderRoleCapabilities(
            (value as unknown as { roles: readonly RoleCapability[] }).roles,
          ),
        },
      ],
    },
    isConcurrencySafe: () => true,
    async execute() {
      return { roles: roleCapabilities(dshHome) };
    },
  };
}

export function apply(ctx: Context): void {
  ctx.tools.register(createPstackRolesTool());
}
