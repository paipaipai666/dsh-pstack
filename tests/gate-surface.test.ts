import { describe, expect, it } from "vite-plus/test";

import {
  APPROVAL_LABEL,
  decide,
  isProtectedPath,
  protectedChanges,
} from "../scripts/gate-surface.mjs";

describe("gate surface", () => {
  it("treats the checks themselves as protected", () => {
    expect(isProtectedPath("scripts/check-comments.mjs")).toBe(true);
    expect(isProtectedPath(".github/workflows/ci.yml")).toBe(true);
    expect(isProtectedPath("package.json")).toBe(true);
    expect(isProtectedPath("vite.config.ts")).toBe(true);
    expect(isProtectedPath("port/generate.mjs")).toBe(true);
    expect(isProtectedPath("model/IssueAutomation.tla")).toBe(true);
    expect(isProtectedPath("docs/fork/dsh-api-surface.json")).toBe(true);
    expect(isProtectedPath("docs/fork/BREAKING-CHECKLIST.md")).toBe(true);
    expect(isProtectedPath("docs/fork/GATES.md")).toBe(false);
  });

  it("leaves ordinary source changes alone", () => {
    expect(isProtectedPath("src/subagent.ts")).toBe(false);
    expect(isProtectedPath("README.md")).toBe(false);
    expect(isProtectedPath("tests/subagent.test.ts")).toBe(false);
  });

  it("reports only the protected files that changed", () => {
    expect(
      protectedChanges([
        "src/a.ts",
        "scripts/check-comments.mjs",
        "scripts/check-comments.mjs",
        "README.md",
      ]),
    ).toEqual(["scripts/check-comments.mjs"]);
  });

  it("passes a pull request that only touches source files", () => {
    const verdict = decide(["src/a.ts", "README.md"], []);
    expect(verdict.ok).toBe(true);
    expect(verdict.reason).toContain("no protected files changed");
  });

  it("blocks a pull request that edits the gate without approval", () => {
    const verdict = decide(["scripts/check-comments.mjs"], []);
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain(APPROVAL_LABEL);
    expect(verdict.reason).toContain("scripts/check-comments.mjs");
  });

  it("allows an approved change to the gate", () => {
    const verdict = decide(["scripts/check-comments.mjs"], [APPROVAL_LABEL]);
    expect(verdict.ok).toBe(true);
  });

  it("does not accept an unrelated label as approval", () => {
    expect(decide([".github/workflows/ci.yml"], ["gate-approve", "approved"]).ok).toBe(false);
  });
});
