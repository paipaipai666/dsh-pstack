import { describe, expect, it } from "vite-plus/test";

import { GATED_TOOL, apply } from "../src/script-policy.ts";

type Listener = (
  exec: { readonly name: string; readonly arguments: unknown },
  next: () => Promise<unknown>,
) => Promise<unknown>;

function listener(): Listener {
  let captured: Listener | undefined;
  const ctx = {
    on: (event: string, handler: Listener) => {
      if (event === "tools/pre-execute") captured = handler;
      return () => {};
    },
  } as never;
  apply(ctx);
  if (captured === undefined) throw new Error("policy listener was not registered");
  return captured;
}

describe("pstack-script-policy", () => {
  it("asks approval for pstack_script and leaves other tools alone", async () => {
    const policy = listener();
    const ask = await policy({ name: GATED_TOOL, arguments: { id: "log" } }, async () => ({
      kind: "allow",
    }));
    expect(ask).toMatchObject({
      kind: "ask",
      reason: 'Run bundled pstack script "log".',
    });
    const pass = await policy({ name: "read", arguments: {} }, async () => ({ kind: "allow" }));
    expect(pass).toEqual({ kind: "allow" });
  });

  it("uses an unknown id when the pending call has no valid id", async () => {
    const policy = listener();
    const decision = await policy({ name: GATED_TOOL, arguments: {} }, async () => ({
      kind: "allow",
    }));
    expect(decision).toMatchObject({ kind: "ask", reason: 'Run bundled pstack script "unknown".' });
  });
});
