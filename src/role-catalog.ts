/**
 * `pstack_roles`: a read-only capability query over the role manifest.
 *
 * `pstack_subagent` requires `role` and accepts `roleIndex` only for a
 * list-valued role that is not an automatic panel. This tool reports those
 * facts before a caller starts a child.
 */

import type { Context } from "@deepseek-ai/cordis";
import type { JsonSchemaNode, ToolDefinition } from "@deepseek-ai/dsh-tools";

import { ROLE_MANIFEST, type RoleSpec } from "./role-manifest.ts";

export const name = "pstack-role-catalog";

export const inject = ["tools"];

export const TOOL_NAME = "pstack_roles";

export interface RoleCapability {
  readonly role: string;
  readonly shape: "single" | "list";
  readonly autoPanel: boolean;
  readonly roleIndex: "not-applicable" | "optional";
  readonly usage: string;
}

/** Derive one role's capability record. */
export function roleCapability(spec: RoleSpec): RoleCapability {
  if (spec.autoPanel) {
    return {
      role: spec.key,
      shape: spec.shape,
      autoPanel: true,
      roleIndex: "not-applicable",
      usage: "starts one child per configured entry",
    };
  }
  if (spec.shape === "list") {
    return {
      role: spec.key,
      shape: spec.shape,
      autoPanel: false,
      roleIndex: "optional",
      usage: "starts one child on the selected entry",
    };
  }
  return {
    role: spec.key,
    shape: spec.shape,
    autoPanel: false,
    roleIndex: "not-applicable",
    usage: "starts one child on the role's single route",
  };
}

/** Every role's capability record in manifest order. */
export function roleCapabilities(): readonly RoleCapability[] {
  return ROLE_MANIFEST.map(roleCapability);
}

/** Render the capabilities for the model. */
export function renderRoleCapabilities(roles: readonly RoleCapability[]): string {
  return [
    "pstack roles. Pass the exact `role` key. `roleIndex` is null unless the role is a list that is not an automatic panel.",
    "",
    ...roles.map(
      (role) =>
        `- ${role.role} — shape=${role.shape}${role.autoPanel ? ", autoPanel=true" : ""}; roleIndex=${role.roleIndex}; ${role.usage}`,
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
        },
        required: ["role", "shape", "autoPanel", "roleIndex", "usage"],
      },
    },
  },
  required: ["roles"],
};

const TOOL_DESCRIPTION = [
  "List every pstack role with its `shape` and `autoPanel`, so a `pstack_subagent` call passes the right `role` and `roleIndex` before it starts.",
  "",
  "Read-only. It reports the role manifest, not the routes in `$DSH_HOME/pstack-models.mdc`; use `pstack_models` for the routes this deployment actually serves.",
  "",
  "`roleIndex` applies only to a list role that is not an automatic panel: `arena cross-judge pool` and `swarm workers`. Pass null for every single role and for an automatic panel.",
].join("\n");

/** Build the tool definition. */
export function createPstackRolesTool(): ToolDefinition {
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
      return { roles: roleCapabilities() };
    },
  };
}

export function apply(ctx: Context): void {
  ctx.tools.register(createPstackRolesTool());
}
