import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import type { ToolDefinition } from "../src/host-contract.ts";
import {
  decideRemoteCall,
  normalizeRemoteConfig,
  parseRemoteArgs,
  RemoteInputError,
  RemoteRunner,
  createPstackRemoteTool,
  remoteStateDir,
  apply,
} from "../src/remote.ts";

const FAKE_DSH = `import { readFileSync } from "node:fs";

const task = readFileSync(0, "utf8");
const mode = process.env.FAKE_DSH_MODE ?? "ok";
console.log(JSON.stringify({ type: "started", task }));
if (mode === "fail") process.exit(2);
if (mode === "sleep") {
  setInterval(() => {}, 1000);
} else {
  console.log(JSON.stringify({ type: "text", text: "hello from the remote machine" }));
}
`;

let work: string;
let fixture: string;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "pstack-remote-"));
  fixture = join(work, "fake-dsh.mjs");
  writeFileSync(fixture, FAKE_DSH, "utf8");
});

async function removeDir(path: string): Promise<void> {
  // Windows keeps a directory busy for a moment after the child that used it as its cwd exits.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      rmSync(path, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 39) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

afterEach(async () => {
  await removeDir(work);
});

function runnerWith(overrides: Record<string, unknown> = {}): RemoteRunner {
  return new RemoteRunner(
    normalizeRemoteConfig({
      targets: [
        {
          name: "here",
          transport: "local",
          command: [process.execPath, fixture],
        },
      ],
      ...overrides,
    }),
    join(work, "jobs"),
  );
}

async function waitFor(
  check: () => string | undefined,
  expected: string,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check() === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`timed out waiting for status "${expected}", last was "${check()}"`);
}

describe("normalizeRemoteConfig", () => {
  it("defaults to asking before a run", () => {
    expect(normalizeRemoteConfig(undefined)).toEqual({ mode: "ask", targets: [] });
    expect(normalizeRemoteConfig({ targets: [] }).mode).toBe("ask");
  });

  it("rejects unknown fields, duplicate names, and an ssh target without a host", () => {
    expect(() => normalizeRemoteConfig({ targets: [], mode2: "ask" })).toThrow(RemoteInputError);
    expect(() => normalizeRemoteConfig({ targets: [{ name: "a", transport: "ssh" }] })).toThrow(
      /needs a "host"/,
    );
    expect(() =>
      normalizeRemoteConfig({
        targets: [
          { name: "a", transport: "local" },
          { name: "a", transport: "local" },
        ],
      }),
    ).toThrow(/duplicate target/);
  });

  it("requires an absolute http url for an http target", () => {
    expect(() => normalizeRemoteConfig({ targets: [{ name: "a", transport: "http" }] })).toThrow(
      /needs a "url"/,
    );
    expect(() =>
      normalizeRemoteConfig({ targets: [{ name: "a", transport: "http", url: "unix:/tmp/sock" }] }),
    ).toThrow(/http or https/);
    expect(
      normalizeRemoteConfig({ targets: [{ name: "a", transport: "http", url: "https://x.test" }] })
        .targets,
    ).toHaveLength(1);
  });
});

describe("parseRemoteArgs", () => {
  it("requires a target, task, and workspace for run", () => {
    expect(() => parseRemoteArgs({ action: "run", target: "here" })).toThrow(/task/);
    expect(() => parseRemoteArgs({ action: "run", target: "here", workspacePath: "/x" })).toThrow(
      /task/,
    );
    expect(() => parseRemoteArgs({ action: "run", task: "t", workspacePath: "/x" })).toThrow(
      /target/,
    );
  });

  it("bounds the log window and the job id shape", () => {
    expect(() => parseRemoteArgs({ action: "logs", jobId: "nope" })).toThrow(/jobId/);
    expect(() =>
      parseRemoteArgs({
        action: "logs",
        jobId: "00000000-0000-4000-8000-000000000000",
        limit: 900,
      }),
    ).toThrow(/limit/);
    expect(
      parseRemoteArgs({ action: "status", jobId: "00000000-0000-4000-8000-000000000000" }).action,
    ).toBe("status");
  });

  it("rejects an unknown action and unknown fields", () => {
    expect(() => parseRemoteArgs({ action: "launch" })).toThrow(/action/);
    expect(() => parseRemoteArgs({ action: "list", target: "here" })).toThrow(/unknown argument/);
  });
});

describe("decideRemoteCall", () => {
  const exec = (args: Record<string, unknown>) =>
    ({ name: "pstack_remote", arguments: args }) as never;

  it("never gates read-only actions", () => {
    expect(decideRemoteCall("deny", exec({ action: "list" })).kind).toBe("next");
    expect(decideRemoteCall("ask", exec({ action: "logs" })).kind).toBe("next");
  });

  it("asks, allows, or denies depending on the row mode", () => {
    const run = exec({ action: "run", target: "here", task: "t", workspacePath: "/x" });
    expect(decideRemoteCall("allow", run).kind).toBe("next");
    expect(decideRemoteCall("deny", run).kind).toBe("deny");
    const asked = decideRemoteCall("ask", run);
    expect(asked.kind).toBe("ask");
    expect(asked.kind === "ask" ? asked.reason : "").toContain("machine outside this one");
  });
});

describe("RemoteRunner", () => {
  it("runs a task, records its events, and reports completion", async () => {
    const runner = runnerWith();
    const started = await runner.start({
      action: "run",
      target: "here",
      task: "say hello",
      workspacePath: work,
      profile: "headless",
      permissionMode: "workspace-write",
      addDir: [],
      timeoutMs: 20_000,
    });
    await waitFor(() => runner.job(started.jobId)?.status, "completed");
    const job = runner.job(started.jobId);
    expect(job?.exitCode).toBe(0);
    const events = runner.store.readEvents(started.jobId, 0, 50);
    expect(events.lines.join("\n")).toContain("say hello");
    expect(events.lines.join("\n")).toContain("hello from the remote machine");
  });

  it("marks a non-zero exit as failed and keeps the exit code", async () => {
    process.env["FAKE_DSH_MODE"] = "fail";
    try {
      const runner = runnerWith();
      const started = await runner.start({
        action: "run",
        target: "here",
        task: "fail",
        workspacePath: work,
        profile: "headless",
        permissionMode: "workspace-write",
        addDir: [],
        timeoutMs: 20_000,
      });
      await waitFor(() => runner.job(started.jobId)?.status, "failed");
      expect(runner.job(started.jobId)?.exitCode).toBe(2);
    } finally {
      delete process.env["FAKE_DSH_MODE"];
    }
  });

  it("refuses an unregistered target", async () => {
    const runner = runnerWith();
    await expect(
      runner.start({
        action: "run",
        target: "elsewhere",
        task: "t",
        workspacePath: work,
        profile: "headless",
        permissionMode: "workspace-write",
        addDir: [],
        timeoutMs: 1_000,
      }),
    ).rejects.toThrow(/unknown target/);
  });

  it("cancels a running job", async () => {
    process.env["FAKE_DSH_MODE"] = "sleep";
    try {
      const runner = runnerWith();
      const started = await runner.start({
        action: "run",
        target: "here",
        task: "sleep",
        workspacePath: work,
        profile: "headless",
        permissionMode: "workspace-write",
        addDir: [],
        timeoutMs: 60_000,
      });
      expect(runner.job(started.jobId)?.status).toBe("running");
      const cancelled = runner.cancel(started.jobId);
      expect(cancelled?.status).toBe("cancelled");
      runner.close();
    } finally {
      delete process.env["FAKE_DSH_MODE"];
    }
  });

  it("times a job out instead of leaking it", async () => {
    process.env["FAKE_DSH_MODE"] = "sleep";
    try {
      const runner = runnerWith();
      const started = await runner.start({
        action: "run",
        target: "here",
        task: "sleep",
        workspacePath: work,
        profile: "headless",
        permissionMode: "workspace-write",
        addDir: [],
        timeoutMs: 120,
      });
      await waitFor(() => runner.job(started.jobId)?.status, "timed-out");
      runner.close();
    } finally {
      delete process.env["FAKE_DSH_MODE"];
    }
  });

  it("reports a running record whose host exited as failed", async () => {
    const runner = runnerWith();
    const store = runner.store;
    store.create({
      jobId: "11111111-1111-4111-8111-111111111111",
      target: "here",
      transport: "local",
      task: "orphan",
      workspacePath: work,
      profile: "headless",
      permissionMode: "workspace-write",
      startedAt: new Date().toISOString(),
      status: "running",
    });
    const fresh = runnerWith();
    const job = fresh.job("11111111-1111-4111-8111-111111111111");
    expect(job?.status).toBe("failed");
    expect(job?.error).toContain("Host that started this job exited");
  });

  it("streams events from an http worker", async () => {
    const server = createServer((request, response) => {
      if (request.method !== "POST" || request.url !== "/jobs") {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, {
        "content-type": "application/x-ndjson",
        "x-remote-job-id": "remote-1",
      });
      response.write(`${JSON.stringify({ type: "started" })}\n`);
      response.end(`${JSON.stringify({ type: "text", text: "from the worker" })}\n`);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address !== null ? address.port : 0;
    try {
      const runner = new RemoteRunner(
        normalizeRemoteConfig({
          targets: [{ name: "worker", transport: "http", url: `http://127.0.0.1:${port}` }],
        }),
        join(work, "jobs"),
      );
      const started = await runner.start({
        action: "run",
        target: "worker",
        task: "t",
        workspacePath: "/remote/ws",
        profile: "headless",
        permissionMode: "workspace-write",
        addDir: [],
        timeoutMs: 5_000,
      });
      await waitFor(() => runner.job(started.jobId)?.status, "completed");
      const events = runner.store.readEvents(started.jobId, 0, 10);
      expect(events.lines.join("\n")).toContain("from the worker");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

describe("pstack_remote tool", () => {
  it("lists targets and jobs, then reads one job", async () => {
    const runner = runnerWith();
    const started = await runner.start({
      action: "run",
      target: "here",
      task: "t",
      workspacePath: work,
      profile: "headless",
      permissionMode: "workspace-write",
      addDir: [],
      timeoutMs: 20_000,
    });
    await waitFor(() => runner.job(started.jobId)?.status, "completed");

    const tool = createPstackRemoteTool({
      tools: { register: () => {} } as never,
      config: normalizeRemoteConfig({
        targets: [{ name: "here", transport: "local", command: [process.execPath, fixture] }],
      }),
      dshHome: join(work, "home"),
    });
    const list = (await tool.execute({ action: "list" }, {} as never)) as {
      kind: string;
      targets: unknown[];
      jobs: unknown[];
    };
    expect(list.kind).toBe("list");
    expect(list.targets).toHaveLength(1);
  });

  it("reports an unknown job id as an input error", async () => {
    const tool = createPstackRemoteTool({
      tools: { register: () => {} } as never,
      config: normalizeRemoteConfig({}),
      dshHome: join(work, "home"),
    });
    await expect(
      tool.execute(
        { action: "status", jobId: "22222222-2222-4222-8222-222222222222" },
        {} as never,
      ),
    ).rejects.toThrow(/unknown job/);
  });
});

describe("apply", () => {
  it("registers the tool and skips the approval hook in allow mode", () => {
    const registered: ToolDefinition[] = [];
    const hooks: string[] = [];
    const ctx = {
      tools: { register: (tool: ToolDefinition) => registered.push(tool) },
      on: (event: string) => hooks.push(event),
    } as never;
    apply(ctx, { mode: "allow", targets: [] });
    expect(registered.map((tool) => tool.name)).toEqual(["pstack_remote"]);
    expect(hooks).toEqual([]);

    const second = {
      tools: { register: () => {} },
      on: (event: string) => hooks.push(event),
    } as never;
    apply(second, { mode: "ask", targets: [] });
    expect(hooks).toEqual(["tools/pre-execute"]);
  });

  it("states the default job directory", () => {
    expect(remoteStateDir({ mode: "ask", targets: [] }, "/home/u/.dsh")).toBe(
      join("/home/u/.dsh", "remote", "jobs"),
    );
    expect(
      remoteStateDir({ mode: "ask", targets: [], stateDir: "/var/jobs" }, "/home/u/.dsh"),
    ).toBe("/var/jobs");
  });
});
