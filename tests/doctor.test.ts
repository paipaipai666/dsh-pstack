import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

import {
  collectDoctorReport,
  collectWorkspaceCheck,
  createPstackDoctorTool,
  renderReport,
  resolveProfileDir,
  runCommandVersion,
} from "../src/doctor.ts";

const host = {
  dshHome: "/tmp/dsh-home",
  runCommand: (command: string) => (command === "git" ? "git version 2.51.0" : undefined),
  exists: (path: string) => path.endsWith(".mjs") || path.endsWith("pstack-models.mdc"),
};

describe("pstack_doctor", () => {
  it("reads the version from a real executable", () => {
    expect(runCommandVersion(process.execPath)).toMatch(/^v\d+/);
  });

  it("reports installed and missing commands without throwing", () => {
    const report = collectDoctorReport(host);
    const git = report.commands.find((command) => command.name === "git");
    const gh = report.commands.find((command) => command.name === "gh");
    expect(git).toMatchObject({ ok: true, version: "git version 2.51.0" });
    expect(gh).toMatchObject({ ok: false });
    expect(report.scripts.every((script) => script.ok)).toBe(true);
    expect(report.roleFile.exists).toBe(true);
  });

  it("returns the same report from the tool", async () => {
    const tool = createPstackDoctorTool(host);
    const result = (await tool.execute({}, {
      signal: new AbortController().signal,
    } as never)) as ReturnType<typeof collectDoctorReport>;
    expect(result.platform).toBe(process.platform);
    expect(result.commands).toHaveLength(8);
    expect(result.scripts).toHaveLength(5);
    expect(result.optionalPlugins).toHaveLength(8);
    expect(result.optionalPlugins.every((plugin) => plugin.status === "unknown")).toBe(true);
  });

  it("derives the profile directory from DSH_HOME when the environment omits it", () => {
    expect(resolveProfileDir({}, "/tmp/dsh-home")).toBe(
      join("/tmp/dsh-home", "profiles", "desktop"),
    );
    expect(resolveProfileDir({ DSH_PROFILE: "headless" }, "/tmp/dsh-home")).toBe(
      join("/tmp/dsh-home", "profiles", "headless"),
    );
    expect(resolveProfileDir({ DSH_PROFILE_DIR: "/explicit" }, "/tmp/dsh-home")).toBe("/explicit");
  });

  it("reports enabled, installed, partial, and missing optional plugins from the profile manifest", () => {
    const report = collectDoctorReport({
      ...host,
      profileDir: "/profile",
      readFile: () =>
        JSON.stringify({
          dependencies: {
            "@deepseek-ai/dsh-experimental-session-search": "1.0.0",
            "@deepseek-ai/dsh-mcp-client": "1.0.0",
            "@deepseek-ai/dsh-browser-use": "1.0.0",
          },
          dsh: {
            profile: {
              bundles: ["@deepseek-ai/dsh-experimental-session-search"],
            },
          },
        }),
    });
    const byId = Object.fromEntries(report.optionalPlugins.map((plugin) => [plugin.id, plugin]));
    expect(byId["OPT-06"]).toMatchObject({ status: "enabled" });
    expect(byId["OPT-07"]).toMatchObject({ status: "installed" });
    expect(byId["OPT-03"]).toMatchObject({ status: "partial" });
    expect(byId["OPT-09"]).toMatchObject({ status: "missing" });
  });

  it("flags Cursor rule files that DSH never loads", () => {
    const check = collectWorkspaceCheck(
      "/work",
      () => false,
      (path) =>
        /[\\/]\.cursor[\\/]rules$/.test(path) ? ["zeta.mdc", "Alpha.mdc", "notes.md"] : [],
    );
    expect(check).toMatchObject({
      checked: true,
      agentsFile: false,
      cursorRules: ["Alpha.mdc", "zeta.mdc"],
    });
    expect(check.hint).toContain("DSH never loads .cursor/rules/*.mdc");
  });

  it("stays quiet when AGENTS.md already carries the rules", () => {
    const check = collectWorkspaceCheck(
      "/work",
      (path) => /[\\/]AGENTS\.md$/.test(path),
      () => ["style.mdc"],
    );
    expect(check).toMatchObject({ checked: true, agentsFile: true, cursorRules: ["style.mdc"] });
    expect(check.hint).toBeUndefined();
  });

  it("renders an uninspected workspace without inventing a path", () => {
    expect(
      collectWorkspaceCheck(
        undefined,
        () => false,
        () => [],
      ),
    ).toEqual({
      checked: false,
      agentsFile: false,
      cursorRules: [],
    });
    const report = collectDoctorReport(host);
    expect(report.workspace.checked).toBe(false);
    expect(renderReport(report)).toContain("workspace: not inspected");
  });

  it("inspects the workspace path passed to the tool", async () => {
    const tool = createPstackDoctorTool({
      ...host,
      readDir: (path) => (/[\\/]\.cursor[\\/]rules$/.test(path) ? ["a.mdc"] : []),
    });
    const result = (await tool.execute({ workspacePath: "/repo" }, {
      signal: new AbortController().signal,
    } as never)) as ReturnType<typeof collectDoctorReport>;
    expect(result.workspace).toMatchObject({
      path: "/repo",
      checked: true,
      cursorRules: ["a.mdc"],
    });
    expect(result.workspace.hint).toContain("AGENTS.md");
  });
});
