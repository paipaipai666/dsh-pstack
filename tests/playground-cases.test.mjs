import { readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vite-plus/test";

import { highestEffortRoute } from "../playground/cases/subagent-role-route.case.mjs";

const casesDir = join(import.meta.dirname, "..", "playground", "cases");

function route(effort) {
  return { provider: "cpa", model: "model-a", effort };
}

describe("playground effort selection", () => {
  it("selects the highest known effort, not the first configured value", () => {
    expect(highestEffortRoute([route("low"), route("high")])).toEqual(route("high"));
    expect(highestEffortRoute([route("medium"), route("max"), route("xhigh")])).toEqual(
      route("max"),
    );
  });

  it("skips a custom effort vocabulary that cannot be ranked", () => {
    expect(highestEffortRoute([route("minimal"), route("none")])).toBeUndefined();
    expect(highestEffortRoute([route("low")])).toBeUndefined();
  });
});

describe("playground case definitions", () => {
  it("loads all 17 case files and every case can build a runnable assertion", async () => {
    const files = readdirSync(casesDir)
      .filter((name) => name.endsWith(".case.mjs"))
      .sort();
    const cases = [];
    for (const file of files) {
      const module = await import(pathToFileURL(join(casesDir, file)).href);
      const definition = module.default;
      expect(definition.id, file).toMatch(/^CASE-[A-Z0-9-]+-\d+$/);
      expect(typeof definition.build, file).toBe("function");
      const routes = [
        { provider: "cpa", model: "model-a", effort: undefined, label: "cpa/model-a" },
        { provider: "cpa", model: "model-b", effort: "high", label: "cpa/model-b [high]" },
      ];
      const built = definition.build(routes);
      if (built.skip === undefined) {
        expect(typeof built.prompt, file).toBe("string");
        expect(built.prompt.length, file).toBeGreaterThan(10);
        expect(typeof built.verify, file).toBe("function");
      }
      cases.push(definition.id);
    }
    expect(new Set(cases).size).toBe(cases.length);
    expect(cases.length).toBe(17);
  });
});
