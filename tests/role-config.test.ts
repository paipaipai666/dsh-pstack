import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  ensureRoleBaseline,
  parseRoleConfiguration,
  readRoleConfiguration,
  renderBaselineRoleFile,
  selectRoutes,
} from "../src/role-config.ts";
import { parseRoute } from "../src/route.ts";
import { findRole } from "../src/role-manifest.ts";

const directories: string[] = [];

function homeWithRoles(text: string | undefined): string {
  const directory = mkdtempSync(join(tmpdir(), "pstack-roles-"));
  directories.push(directory);
  if (text !== undefined) writeFileSync(join(directory, "pstack-models.mdc"), text);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("role manifest and parser", () => {
  it("keeps commas that belong to a role key", () => {
    expect(findRole("feature, refactoring")?.key).toBe("feature, refactoring");
    expect(findRole("  FEATURE ,  REFACTORING ")?.key).toBe("feature, refactoring");
  });

  it("parses an exact route with an effort token", () => {
    expect(parseRoute("provider/model [high]").route).toEqual({
      kind: "route",
      provider: "provider",
      model: "model",
      effort: "high",
    });
    expect(parseRoute("inherit-parent").route).toEqual({
      kind: "inherit",
      alias: "inherit-parent",
    });
    expect(parseRoute("AUTO").route).toEqual({ kind: "inherit", alias: "auto" });
  });

  it("rejects whitespace in provider, model, or effort", () => {
    expect(parseRoute("provider name/model").route).toBeUndefined();
    expect(parseRoute("provider/model name").route).toBeUndefined();
    expect(parseRoute("provider/model [high tier]").route).toBeUndefined();
  });

  it("parses a role document and keeps the winning duplicate", () => {
    const parsed = parseRoleConfiguration(
      [
        "# budget: large (xhigh)",
        "bug-fix: provider/model [high]",
        "bug-fix: provider/other [low]",
        "arena runners: provider/a [high], provider/b [low]",
      ].join("\n"),
      "/home/user/.dsh/pstack-models.mdc",
    );
    expect(parsed.status).toBe("loaded");
    if (parsed.status !== "loaded") return;
    expect(parsed.budget).toBe("large (xhigh)");
    expect(parsed.roles.get("bug-fix")?.routes[0]).toMatchObject({ model: "other" });
    expect(parsed.issues.some((issue) => issue.message.includes("line 3 wins"))).toBe(true);
  });

  it("reports malformed and unknown lines by line number", () => {
    const parsed = parseRoleConfiguration("bug-fix: nope\nretired role: auto\n", "/x");
    expect(parsed.status).toBe("loaded");
    if (parsed.status !== "loaded") return;
    expect(parsed.issues).toEqual([
      {
        line: 1,
        message:
          'bug-fix: "nope" is not a route; use `inherit-parent`, `auto`, or `<provider>/<model> [effort]`',
      },
      { line: 2, message: 'unknown pstack role "retired role"' },
    ]);
  });

  it("writes an inherit-parent baseline once and never overwrites it", () => {
    const path = join(homeWithRoles(undefined), "pstack-models.mdc");
    expect(existsSync(path)).toBe(false);

    expect(ensureRoleBaseline(path)).toBe(true);
    const parsed = readRoleConfiguration(path);
    expect(parsed.status).toBe("loaded");
    if (parsed.status !== "loaded") return;
    expect(parsed.issues).toEqual([]);
    expect(parsed.roles.size).toBe(17);
    expect([...parsed.roles.values()].every((role) => role.routes[0]?.kind === "inherit")).toBe(
      true,
    );

    writeFileSync(path, "bug-fix: inherit-parent\n");
    expect(ensureRoleBaseline(path)).toBe(false);
    expect(readFileSync(path, "utf8")).toBe("bug-fix: inherit-parent\n");
    expect(renderBaselineRoleFile()).toContain("feature, refactoring: inherit-parent");
  });

  it("distinguishes a missing file from an unreadable path", () => {
    expect(readRoleConfiguration(join(homeWithRoles(undefined), "pstack-models.mdc")).status).toBe(
      "missing",
    );
    expect(readRoleConfiguration(homeWithRoles(undefined)).status).toBe("unreadable");
  });

  it("expands automatic panels and selects a list entry", () => {
    const parsed = parseRoleConfiguration(
      "arena runners: p/a [high], p/b [low]\nswarm workers: p/a [high], p/b [low]\n",
      "/x",
    );
    expect(parsed.status).toBe("loaded");
    if (parsed.status !== "loaded") return;
    const panel = selectRoutes(
      findRole("arena runners")!,
      parsed.roles.get("arena runners"),
      undefined,
    );
    expect(panel.mode).toBe("panel");
    expect(panel.routes).toHaveLength(2);
    const selected = selectRoutes(findRole("swarm workers")!, parsed.roles.get("swarm workers"), 1);
    expect(selected.mode).toBe("selected");
    expect(selected.routes[0]).toMatchObject({ model: "b" });
  });

  it("rejects roleIndex on a single role or an automatic panel", () => {
    const parsed = parseRoleConfiguration("bug-fix: p/a\narena runners: p/a, p/b\n", "/x");
    expect(parsed.status).toBe("loaded");
    if (parsed.status !== "loaded") return;
    expect(() => selectRoutes(findRole("bug-fix")!, parsed.roles.get("bug-fix"), 0)).toThrow(
      /single route/,
    );
    expect(() =>
      selectRoutes(findRole("arena runners")!, parsed.roles.get("arena runners"), 0),
    ).toThrow(/automatic panel/);
  });
});
