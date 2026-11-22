import { describe, expect, it } from "vite-plus/test";

import { findPresetDrift, latestPresetFixture } from "../scripts/preset-drift.mjs";

const FIXTURE = [
  "preset:",
  "  groups:",
  "    session:",
  "      rows:",
  "        - id: present",
  "          name: '@deepseek-ai/dsh-tool-present'",
  "",
].join("\n");

describe("preset drift", () => {
  it("treats quote style, CRLF, and trailing whitespace as the same preset", () => {
    const vendor = FIXTURE.replace(
      "'@deepseek-ai/dsh-tool-present'",
      '"@deepseek-ai/dsh-tool-present"',
    )
      .replace(/\n/g, "\r\n")
      .concat("   \r\n");

    expect(findPresetDrift(FIXTURE, vendor)).toEqual({ equal: true, additions: [], removals: [] });
  });

  it("reports a row the vendored fixture does not know about", () => {
    const vendor = FIXTURE.replace(
      "        - id: present",
      [
        "        - id: tool-office",
        "          name: '@deepseek-ai/dsh-tool-office'",
        "        - id: present",
      ].join("\n"),
    );

    expect(findPresetDrift(FIXTURE, vendor)).toEqual({
      equal: false,
      additions: ["- id: tool-office", 'name: "@deepseek-ai/dsh-tool-office"'],
      removals: [],
    });
  });

  it("reports a row the fixture carries but the shipped preset dropped", () => {
    const vendor = FIXTURE.replace("        - id: present\n", "");

    expect(findPresetDrift(FIXTURE, vendor)).toEqual({
      equal: false,
      additions: [],
      removals: ["- id: present"],
    });
  });

  it("picks the newest fixture directory instead of the last one listed", () => {
    expect(
      latestPresetFixture(["dsh-0.2.2-rc.1", "dsh-0.2.2-rc.10", "dsh-0.2.2-rc.5", "fixtures"]),
    ).toBe("dsh-0.2.2-rc.10");
    expect(latestPresetFixture(["fixtures"])).toBeUndefined();
  });
});
