import { describe, expect, it } from "vite-plus/test";

import { ROLE_MANIFEST } from "../src/role-manifest.ts";
import {
  TOOL_NAME,
  createPstackRolesTool,
  renderRoleCapabilities,
  roleCapabilities,
} from "../src/role-catalog.ts";

describe("pstack_roles", () => {
  it("reports every manifest role in order", () => {
    expect(roleCapabilities().map((role) => role.role)).toEqual(
      ROLE_MANIFEST.map((role) => role.key),
    );
  });

  it("marks automatic panels and list selectors distinctly", () => {
    const roles = roleCapabilities();
    for (const key of ["arena runners", "architect runners", "interrogate reviewers"]) {
      expect(roles.find((role) => role.role === key)?.roleIndex).toBe("not-applicable");
      expect(roles.find((role) => role.role === key)?.autoPanel).toBe(true);
    }
    expect(roles.filter((role) => role.roleIndex === "optional").map((role) => role.role)).toEqual([
      "arena cross-judge pool",
      "swarm workers",
    ]);
  });

  it("renders the classification", () => {
    const text = renderRoleCapabilities(roleCapabilities());
    expect(text).toContain("arena runners — shape=list, autoPanel=true; roleIndex=not-applicable");
    expect(text).toContain("arena cross-judge pool — shape=list; roleIndex=optional");
  });

  it("returns every role through the tool", async () => {
    const tool = createPstackRolesTool();
    expect(tool.name).toBe(TOOL_NAME);
    const result = (await tool.execute({}, { signal: new AbortController().signal } as never)) as {
      roles: readonly unknown[];
    };
    expect(result.roles).toHaveLength(ROLE_MANIFEST.length);
  });
});
