import { describe, expect, it } from "vite-plus/test";

import { checkVersionBump, compareVersions } from "../scripts/check-version-bump.mjs";

const ROOT = "/repo";

function files(overrides = {}) {
  return {
    "package.json": JSON.stringify({ version: "0.5.1" }),
    "CHANGELOG.md": "# Changelog\n\n## 0.5.1\n\n- Automated task.\n",
    "README.md": "| Release |\n|---|\n| `0.5.1` |\n",
    "README.zh.md": "| 发布 |\n|---|\n| `0.5.1` |\n",
    "FORK.md": "The package reports version `0.5.1`.\n",
    "docs/fork/STATUS.md": "The local package is `0.5.1`.\n",
    ...overrides,
  };
}

function check(overrides = {}, baseVersion = "0.5.0") {
  const disk = files(overrides);
  return checkVersionBump(ROOT, "base-sha", {
    readFile: (path) => {
      const key = path.replaceAll("\\", "/").replace(`${ROOT}/`, "") as keyof typeof disk;
      if (!(key in disk)) throw new Error(`missing test file ${key}`);
      return disk[key];
    },
    gitShow: () => JSON.stringify({ version: baseVersion }),
  });
}

describe("checkVersionBump", () => {
  it("accepts a bumped package with changelog and both compatibility tables", () => {
    expect(check()).toEqual({ base: "0.5.0", current: "0.5.1" });
  });

  it("rejects a package version that did not advance", () => {
    expect(() => check({}, "0.5.1")).toThrow("must be greater than base 0.5.1");
  });

  it("rejects a missing changelog section", () => {
    expect(() => check({ "CHANGELOG.md": "# Changelog\n\n## 0.5.0\n" })).toThrow(
      'CHANGELOG.md has no "## 0.5.1" section',
    );
  });

  it("rejects a compatibility table missing the version", () => {
    expect(() => check({ "README.zh.md": "no version here\n" })).toThrow(
      "README.zh.md compatibility table does not mention 0.5.1",
    );
  });

  it("rejects a stale status document", () => {
    expect(() => check({ "docs/fork/STATUS.md": "The local package is `0.5.0`.\n" })).toThrow(
      "docs/fork/STATUS.md does not mention package version 0.5.1",
    );
  });

  it("rejects a stale fork overview", () => {
    expect(() => check({ "FORK.md": "The package reports version `0.5.0`.\n" })).toThrow(
      "FORK.md does not mention package version 0.5.1",
    );
  });
});

describe("compareVersions", () => {
  it("orders stable versions", () => {
    expect(compareVersions("0.5.1", "0.5.0")).toBeGreaterThan(0);
    expect(compareVersions("0.5.0", "0.5.1")).toBeLessThan(0);
    expect(compareVersions("0.5.0", "0.5.0")).toBe(0);
  });

  it("orders prerelease versions like semver", () => {
    expect(compareVersions("0.5.1-beta.2", "0.5.1-beta.1")).toBeGreaterThan(0);
    expect(compareVersions("0.5.1", "0.5.1-beta.9")).toBeGreaterThan(0);
  });
});
