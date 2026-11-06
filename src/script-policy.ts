/**
 * `pstack-script-policy`: the approval gate for `pstack_script`.
 *
 * This row owns policy, not execution. `pstack_script` remains a thin launcher, and the
 * shared `tools/pre-execute` pipeline turns the returned `ask` into one `ctx.approval`
 * request. A deployment without an approval answerer therefore denies the call before the
 * script starts. The policy also leaves every other tool unchanged.
 */

import type { Context } from "@deepseek-ai/cordis";
import type { PreToolDecision, ToolExecution } from "@deepseek-ai/dsh-tools";

/** Cordis row name, used by Loader diagnostics. */
export const name = "pstack-script-policy";

/** The model-facing tool this policy gates. */
export const GATED_TOOL = "pstack_script";

export type PolicyMode = "ask" | "allow" | "deny";

export interface PstackScriptPolicyConfig {
  readonly mode: PolicyMode;
}

/** Validate the row config without a Schemastery dependency. */
export function normalizePolicyConfig(value: unknown): PstackScriptPolicyConfig {
  if (value === undefined || value === null) return { mode: "ask" };
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("pstack-script-policy: config must be a mapping");
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== "mode") throw new Error(`pstack-script-policy: unknown config field "${key}"`);
  }
  const mode = record["mode"];
  if (mode !== undefined && mode !== "ask" && mode !== "allow" && mode !== "deny") {
    throw new Error('pstack-script-policy: mode must be "ask", "allow", or "deny"');
  }
  return { mode: (mode ?? "ask") as PolicyMode };
}

/** Read the script id from a pending call, without trusting its type. */
function scriptId(exec: ToolExecution): string {
  const args = exec.arguments;
  if (typeof args === "object" && args !== null && "id" in args) {
    const id = (args as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  return "unknown";
}

/** Register the pre-execute policy. */
export function apply(ctx: Context, rawConfig?: unknown): void {
  const { mode } = normalizePolicyConfig(rawConfig);
  ctx.on("tools/pre-execute", async (exec, next): Promise<PreToolDecision> => {
    if (exec.name !== GATED_TOOL) return next();
    if (mode === "allow") return next();
    const id = scriptId(exec);
    if (mode === "deny") {
      return { kind: "deny", reason: `pstack_script "${id}" is disabled by policy.` };
    }
    return {
      kind: "ask",
      reason: `Run bundled pstack script "${id}".`,
      displayReason: { en: `Run pstack script "${id}"?` },
    };
  });
}
