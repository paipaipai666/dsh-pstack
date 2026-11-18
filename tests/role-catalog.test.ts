import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { ROLE_MANIFEST } from "../src/role-manifest.ts";
import {
  TOOL_NAME,
  createPstackRolesTool,
  renderRoleCapabilities,
  roleCapabilities,
} from "../src/role-catalog.ts";

const directories: string[] = [];

afterEach(() => {
  for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("pstack_roles", () => {
  it("reports every manifest role in order", () => {
    expect(roleCapabilities().map((role) => role.role)).toEqual(
      ROLE_MANIFEST.map((role) => role.key),
    );
  });

  it("marks automatic panels and list selectors as accepting optional roleIndex", () => {
    const roles = roleCapabilities();
    for (const key of ["arena runners", "interrogate reviewers"]) {
      expect(roles.find((role) => role.role === key)?.roleIndex).toBe("optional");
      expect(roles.find((role) => role.role === key)?.autoPanel).toBe(true);
    }
    expect(roles.filter((role) => role.roleIndex === "optional").map((role) => role.role)).toEqual([
      "arena runners",
      "arena cross-judge pool",
      "swarm workers",
      "interrogate reviewers",
    ]);
  });

  it("renders the classification", () => {
    const text = renderRoleCapabilities(roleCapabilities());
    expect(text).toContain("arena runners — shape=list, autoPanel=true; roleIndex=optional");
    expect(text).toContain("arena cross-judge pool — shape=list; roleIndex=optional");
  });

  it("enriches roles with live routes from pstack-models.mdc", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pstack-role-catalog-"));
    directories.push(dir);
    writeFileSync(
      join(dir, "pstack-models.mdc"),
      "arena cross-judge pool: p/a [high], q/b [high]\n",
    );
    const tool = createPstackRolesTool(dir);
    expect(tool.name).toBe(TOOL_NAME);
    const result = (await tool.execute({}, { signal: new AbortController().signal } as never)) as {
      roles: readonly { role: string; configured?: boolean; routes?: readonly string[] }[];
    };
    expect(result.roles).toHaveLength(ROLE_MANIFEST.length);
    const judge = result.roles.find((r) => r.role === "arena cross-judge pool");
    expect(judge).toMatchObject({
      configured: true,
      routes: ["p/a [high]", "q/b [high]"],
    });
    const bugFix = result.roles.find((r) => r.role === "bug-fix");
    expect(bugFix).toMatchObject({
      configured: false,
      routes: ["inherit-parent"],
    });
    const rendered = renderRoleCapabilities(result.roles as never);
    expect(rendered).toContain("routes=p/a [high], q/b [high]");
  });
});
