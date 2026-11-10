/**
 * `pstack_skill`: trusted loading of pstack skills by name.
 *
 * `dsh-tool-skill` applies the model-invocation policy at the catalog boundary.
 * `ctx.skills.get()` is invocation-neutral, which is the seam this tool uses to
 * load a skill that `disable-model-invocation: true` hides from the model.
 */

import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

import type { Context } from "@deepseek-ai/cordis";
import type { SkillDefinition, SkillRegistry, SkillResourceBase } from "@deepseek-ai/dsh-skill";
import type { JsonSchemaNode, ToolDefinition, ToolRunContext } from "@deepseek-ai/dsh-tools";

import { toDshText } from "./native-text.ts";

export const name = "pstack-skill";

export const inject = ["skills", "tools"];

export const TOOL_NAME = "pstack_skill";

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface SkillResourceResult {
  readonly path: string;
  readonly content: string;
}

export interface LoadSkillResult {
  readonly name: string;
  readonly provider: string;
  readonly resourceBase?: SkillResourceBase;
  readonly content: string;
  readonly resource?: SkillResourceResult;
}

/** Render one loaded skill in the shape DSH skill tools use. */
export function renderLoadedSkill(result: LoadSkillResult): string {
  const lines = [`<skill_content name="${escapeAttribute(result.name)}">`, "<skill_resources>"];
  if (result.resourceBase === undefined) {
    lines.push(
      `Resources for this skill are managed by provider "${escapeText(result.provider)}".`,
      "Load referenced resources only as needed.",
    );
  } else if (result.resourceBase.kind === "directory") {
    lines.push(
      `Base directory for this skill: ${escapeText(result.resourceBase.path)}`,
      "Resolve relative paths mentioned by this skill against the base directory before using them. Load referenced resources only as needed.",
    );
  } else if (result.resourceBase.kind === "url") {
    lines.push(
      `Base URL for this skill: ${escapeText(result.resourceBase.url)}`,
      "Resolve relative URLs mentioned by this skill against the base URL before using them. Load referenced resources only as needed.",
    );
  } else {
    lines.push(
      `Resources for this skill: ${escapeText(result.resourceBase.description)}`,
      "Load referenced resources only as needed.",
    );
  }
  lines.push(
    "</skill_resources>",
    "",
    "<skill_instructions>",
    result.content,
    "</skill_instructions>",
  );
  if (result.resource !== undefined) {
    lines.push(
      "",
      `<skill_resource path="${escapeAttribute(result.resource.path)}">`,
      result.resource.content,
      "</skill_resource>",
    );
  }
  lines.push("</skill_content>");
  return lines.join("\n");
}

/** Read one resource relative to a directory-backed skill. */
export async function readSkillResource(
  definition: SkillDefinition,
  resource: string,
): Promise<SkillResourceResult> {
  const base = definition.resourceBase;
  if (base === undefined || base.kind !== "directory") {
    throw new Error(`skill "${definition.name}" does not expose a directory resource base`);
  }
  if (resource.trim() === "" || resource.includes("\0")) {
    throw new Error("resource must be a non-empty relative path");
  }
  if (resource.startsWith("/") || resource.startsWith("\\") || /^[a-zA-Z]:[\\/]/.test(resource)) {
    throw new Error(`resource "${resource}" must be relative to the skill directory`);
  }
  const root = resolve(base.path);
  const target = resolve(root, resource);
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error(`resource "${resource}" escapes the skill directory`);
  }
  try {
    return { path: resource, content: toDshText(await readFile(target, "utf8")) };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EISDIR") {
      throw new Error(`resource "${resource}" is not available for skill "${definition.name}"`);
    }
    throw error;
  }
}

const OUTPUT_SCHEMA: JsonSchemaNode = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    provider: { type: "string" },
    resourceBase: {
      oneOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            kind: { type: "string", const: "directory" },
            path: { type: "string" },
          },
          required: ["kind", "path"],
        },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            kind: { type: "string", const: "url" },
            url: { type: "string" },
          },
          required: ["kind", "url"],
        },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            kind: { type: "string", const: "opaque" },
            description: { type: "string" },
          },
          required: ["kind", "description"],
        },
      ],
    },
    content: { type: "string" },
    resource: {
      type: "object",
      additionalProperties: false,
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path", "content"],
    },
  },
  required: ["name", "provider", "content"],
};

const TOOL_DESCRIPTION = [
  "Load the full instructions of any pstack skill by name, including skills hidden from the model catalog.",
  "",
  "Use this when a pstack skill tells you to route through another pstack skill and the `skill` tool cannot see it because the skill disables model invocation.",
  "",
  "Pass `resource` with a path relative to the skill directory to read one reference or playbook beside its `SKILL.md`. The path cannot leave the skill directory.",
].join("\n");

/** Build the tool for one skills registry. */
export function createPstackSkillTool(skills: SkillRegistry): ToolDefinition {
  return {
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
          description: "Exact kebab-case skill name, such as `how` or `principle-prove-it-works`.",
        },
        resource: {
          type: "string",
          description: "Optional path relative to the skill directory.",
        },
      },
      required: ["name"],
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [
        { type: "text", text: renderLoadedSkill(value as unknown as LoadSkillResult) },
      ],
    },
    isConcurrencySafe: () => true,
    async execute(rawArgs, exec: ToolRunContext) {
      if (typeof rawArgs !== "object" || rawArgs === null || Array.isArray(rawArgs)) {
        throw new Error("pstack_skill takes an object argument");
      }
      const args = rawArgs as Record<string, unknown>;
      const skillName = args["name"];
      const resource = args["resource"];
      if (typeof skillName !== "string" || !SKILL_NAME.test(skillName)) {
        throw new Error(`invalid skill name "${String(skillName)}"`);
      }
      if (resource !== undefined && typeof resource !== "string") {
        throw new Error("resource must be a string when present");
      }
      const definition = await skills.get(skillName, {
        signal: exec.signal,
        ...(exec.agent === undefined ? {} : { scope: exec.agent }),
      });
      if (definition === undefined) {
        throw new Error(`skill "${skillName}" is unknown or no longer available`);
      }
      const result: LoadSkillResult = {
        name: definition.name,
        provider: definition.provider,
        ...(definition.resourceBase === undefined ? {} : { resourceBase: definition.resourceBase }),
        content: toDshText(definition.content),
        ...(resource === undefined
          ? {}
          : { resource: await readSkillResource(definition, resource) }),
      };
      return result;
    },
  };
}

export function apply(ctx: Context): void {
  ctx.tools.register(createPstackSkillTool(ctx.skills));
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
