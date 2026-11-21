import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vite-plus/test";

import { scriptPath } from "../src/script.ts";

/**
 * These assertions inspect the package tree after `vp run build`. The statechart
 * skill is replaced from `runtime/`, so a new generated helper must have a
 * matching runtime build output or it disappears from the installed package.
 */
describe("shipped runtime overrides", () => {
  it("ships the statechart janitor and kill helpers from runtime", () => {
    const scripts = dirname(scriptPath("statechart"));
    expect(existsSync(join(scripts, "janitor.mjs"))).toBe(true);
    expect(existsSync(join(scripts, "kill.mjs"))).toBe(true);
  });
});
