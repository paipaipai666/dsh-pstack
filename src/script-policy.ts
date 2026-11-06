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
export function apply(ctx: Context): void {
  ctx.on("tools/pre-execute", async (exec, next): Promise<PreToolDecision> => {
    if (exec.name !== GATED_TOOL) return next();
    const id = scriptId(exec);
    return {
      kind: "ask",
      reason: `Run bundled pstack script "${id}".`,
      displayReason: { en: `Run pstack script "${id}"?` },
    };
  });
}
