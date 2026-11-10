import { describe, expect, it } from "vite-plus/test";

import { highestEffortRoute } from "../playground/cases/subagent-role-route.case.mjs";

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
