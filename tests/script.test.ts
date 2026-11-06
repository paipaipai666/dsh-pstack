import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  MAX_TIMEOUT_MS,
  SCRIPT_IDS,
  parseScriptArgs,
  renderScriptOutcome,
  resolveWorkingDirectory,
  runBackground,
  runForeground,
  scriptEnvironment,
  scriptPath,
} from "../src/script.ts";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("pstack_script arguments", () => {
  it("accepts only the shipped script ids", () => {
    expect(SCRIPT_IDS).toEqual(["check-plan", "watch-pr", "worktree-audit", "log", "statechart"]);
    expect(parseScriptArgs({ id: "statechart", args: ["spec.tla"] })).toMatchObject({
      id: "statechart",
      args: ["spec.tla"],
      background: false,
    });
    expect(() => parseScriptArgs({ id: "orch" })).toThrow(/must be one of/);
    expect(() => parseScriptArgs({ id: "../package.json" })).toThrow(/must be one of/);
  });

  it("rejects malformed args, cwd, and timeout before spawning", () => {
    expect(() => parseScriptArgs({ id: "log", args: [1] })).toThrow(/only strings/);
    expect(() => parseScriptArgs({ id: "log", cwd: "" })).toThrow(/non-empty/);
    expect(() => parseScriptArgs({ id: "log", timeoutMs: MAX_TIMEOUT_MS + 1 })).toThrow(/at most/);
    expect(() => parseScriptArgs({ id: "log", unknown: true })).toThrow(/unknown argument/);
  });

  it("resolves a relative cwd against the session directory and keeps an absolute one", () => {
    const session = process.platform === "win32" ? "C:\\session" : "/session";
    const relative = process.platform === "win32" ? "C:\\session\\worktree" : "/session/worktree";
    const absolute =
      process.platform === "win32" ? "C:\\absolute\\worktree" : "/absolute/worktree";
    expect(resolveWorkingDirectory(undefined, session)).toBe(session);
    expect(resolveWorkingDirectory("worktree", session)).toBe(relative);
    expect(resolveWorkingDirectory(absolute, session)).toBe(absolute);
  });

  it("passes the caller environment through, adding the Electron selector only under Electron", () => {
    expect(scriptEnvironment({ PATH: "/bin" }, {})).toEqual({ PATH: "/bin" });
    expect(scriptEnvironment({ PATH: "/bin" }, { electron: "38.0.0" })).toEqual({
      PATH: "/bin",
      ELECTRON_RUN_AS_NODE: "1",
    });
  });

  it("renders a failed run with its exit code and captured output", () => {
    const rendered = renderScriptOutcome({
      kind: "foreground",
      id: "log",
      exitCode: 1,
      signal: null,
      timedOut: false,
      stdout: "",
      stderr: "usage: log.mjs\n",
      durationMs: 3,
    });
    expect(rendered).toContain("log exited with code 1");
    expect(rendered).toContain("stderr (exact bytes):");
    expect(rendered).toContain("do not report success");
  });

  it("refuses a background run when the Host has no jobs service", async () => {
    await expect(
      runBackground(parseScriptArgs({ id: "log", background: true }), {}),
    ).rejects.toThrow(/needs the Host jobs service/);
  });
});

describe("pstack_script execution", () => {
  it("runs a bundled script through the built package", async () => {
    if (!existsSync(scriptPath("log")))
      throw new Error(
        `missing shipped script at ${scriptPath("log")}; run \`vp run build\` before \`vp test\``,
      );
    const directory = mkdtempSync(join(tmpdir(), "pstack-script-"));
    directories.push(directory);
    const file = join(directory, "log.tsv");
    const result = await runForeground(
      parseScriptArgs({
        id: "log",
        args: [file, "phase", "decision", "why", "evidence", "result"],
      }),
    );
    expect(result.exitCode).toBe(0);
  });
});
