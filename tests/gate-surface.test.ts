import { describe, expect, it } from "vite-plus/test";

import {
  APPROVAL_LABEL,
  decide,
  isProtectedPath,
  manifestBeyondVersion,
  protectedChanges,
} from "../scripts/gate-surface.mjs";

const manifest = (version: string, extra = "") =>
  JSON.stringify(
    {
      name: "@paipaipai666/dsh-pstack",
      version,
      private: false,
      scripts: { build: "vp run build", test: "vp test" },
    },
    null,
    2,
  ) + extra;

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

describe("a release number is not a gate change", () => {
  it("sees that a manifest differs only in its version", () => {
    expect(manifestBeyondVersion(manifest("0.5.6"), manifest("0.5.7"))).toBe(false);
  });

  it("sees a manifest that changed something a check depends on", () => {
    const before = manifest("0.5.6");
    const after = JSON.parse(before);
    after.scripts.test = "true";
    expect(manifestBeyondVersion(before, JSON.stringify(after, null, 2))).toBe(true);
  });

  it("treats an unreadable manifest as a real change", () => {
    expect(manifestBeyondVersion("{", manifest("0.5.7"))).toBe(true);
  });

  it("drops package.json from the protected list when only the version moved", () => {
    expect(protectedChanges(["package.json"], { versionOnlyManifest: true })).toEqual([]);
    expect(
      protectedChanges(["package.json", "scripts/check-comments.mjs"], {
        versionOnlyManifest: true,
      }),
    ).toEqual(["scripts/check-comments.mjs"]);
  });

  it("still protects package.json when the version rule is not claimed", () => {
    expect(protectedChanges(["package.json"])).toEqual(["package.json"]);
    expect(protectedChanges(["package.json"], { versionOnlyManifest: false })).toEqual([
      "package.json",
    ]);
  });

  it("lets an automated release land without an approval it cannot give itself", () => {
    const verdict = decide(["package.json"], [], { versionOnlyManifest: true });
    expect(verdict.ok).toBe(true);
    expect(verdict.reason).toContain("version");
  });
});
