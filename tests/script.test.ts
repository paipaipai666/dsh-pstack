import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  MAX_TIMEOUT_MS,
  SCRIPT_IDS,
  createPstackScriptTool,
  parseScriptArgs,
  renderScriptOutcome,
  resolveWorkingDirectory,
  runBackground,
  runForeground,
  scriptEnvironment,
  scriptPath,
  serializeLiveSessions,
} from "../src/script.ts";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("pstack_script arguments", () => {
  it("accepts only the shipped script ids", () => {
    expect(SCRIPT_IDS).toEqual(["watch-pr", "worktree-audit", "log", "statechart"]);
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
    const absolute = process.platform === "win32" ? "C:\\absolute\\worktree" : "/absolute/worktree";
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

  it("serializes live sessions and passes DSH_LIVE_SESSIONS_JSON to worktree-audit when --sessions is omitted", async () => {
    const serialized = serializeLiveSessions({
      list: () => [
        {
          id: "live-1",
          header: { cwd: "/repo/wt-live", createdAt: 1700000000000 },
          snapshotEvents: () => [{ time: 1700002000000 }],
        },
      ],
    });
    expect(JSON.parse(serialized ?? "[]")).toEqual([
      { sessionId: "live-1", cwd: "/repo/wt-live", lastEventTime: 1700002000 },
    ]);
    expect(serializeLiveSessions({ list: () => [] })).toBeUndefined();

    if (!existsSync(scriptPath("worktree-audit"))) return;
    const tool = createPstackScriptTool({
      tools: {} as never,
      workingDirectory: { ensure: async () => process.cwd() },
      getSessions: () => ({
        list: () => [{ id: "live-1", header: { cwd: process.cwd(), createdAt: 1700000000000 } }],
      }),
    });
    const outcome = (await tool.execute({ id: "worktree-audit", args: ["--help"] }, {
      signal: new AbortController().signal,
    } as never)) as { exitCode: number; stdout: string };
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain("Usage: worktree-audit.mjs");
  });
});
