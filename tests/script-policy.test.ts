import { describe, expect, it } from "vite-plus/test";

import { GATED_TOOL, apply, normalizePolicyConfig } from "../src/script-policy.ts";

type Listener = (
  exec: { readonly name: string; readonly arguments: unknown },
  next: () => Promise<unknown>,
) => Promise<unknown>;

function listener(config?: unknown): Listener {
  let captured: Listener | undefined;
  const ctx = {
    on: (event: string, handler: Listener) => {
      if (event === "tools/pre-execute") captured = handler;
      return () => {};
    },
  } as never;
  apply(ctx, config);
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

  it("supports explicit allow and deny modes for trusted or locked profiles", async () => {
    const allow = listener({ mode: "allow" });
    expect(
      await allow({ name: GATED_TOOL, arguments: { id: "log" } }, async () => ({ kind: "allow" })),
    ).toEqual({ kind: "allow" });

    const deny = listener({ mode: "deny" });
    expect(
      await deny({ name: GATED_TOOL, arguments: { id: "log" } }, async () => ({ kind: "allow" })),
    ).toMatchObject({ kind: "deny", reason: 'pstack_script "log" is disabled by policy.' });
  });

  it("rejects invalid policy modes at configuration time", () => {
    expect(normalizePolicyConfig(undefined)).toEqual({ mode: "ask" });
    expect(() => normalizePolicyConfig({ mode: "sometimes" })).toThrow(/mode must be/);
    expect(() => normalizePolicyConfig({ extra: true })).toThrow(/unknown config field/);
  });
});
