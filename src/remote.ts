/**
 * `pstack_remote`: dispatch one pstack task to a machine the user registered.
 *
 * This package never supplies that machine. A target is either an SSH host that already
 * has `dsh` on its PATH, or an HTTP worker that streams NDJSON, or a local command used
 * by tests and by a machine that runs DSH under a non-default binary. The remote side runs
 * `dsh --profile headless --json`; this tool only records the event stream and enforces the
 * approval policy.
 *
 * Every job is written under `$DSH_HOME/remote/jobs/<jobId>.{json,jsonl}` so a later call
 * can read it even after the Host restarted. A job that was running when the Host exited
 * keeps its last status; this tool never polls a process it no longer owns.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import type { Context } from "@deepseek-ai/cordis";
import type { PreToolDecision, ToolExecution, ToolRunContext } from "@deepseek-ai/dsh-tools";

import type { JsonSchemaNode, ToolDefinition, ToolsHost } from "./host-contract.ts";
import { resolveDshHome } from "./role-config.ts";

/** Cordis row name, used by Loader diagnostics. */
export const name = "pstack-remote";

/** The row only needs the tool registry. */
export const inject = ["tools"];

/** Model-facing tool name. */
export const TOOL_NAME = "pstack_remote";

export const DEFAULT_TIMEOUT_MS = 30 * 60_000;
export const MAX_TIMEOUT_MS = 2 * 60 * 60_000;
export const DEFAULT_PROFILE = "headless";
export const DEFAULT_PERMISSION_MODE = "workspace-write";
export const MAX_TARGETS = 16;

/** How this target is reached. */
export type RemoteTransport = "ssh" | "http" | "local";

export type RemotePermissionMode = "read-only" | "workspace-write" | "danger-full-access";

export type RemoteJobStatus = "running" | "completed" | "failed" | "cancelled" | "timed-out";

export interface RemoteTargetConfig {
  readonly name: string;
  readonly transport: RemoteTransport;
  readonly host?: string;
  readonly url?: string;
  readonly tokenEnv?: string;
  readonly workspaceRoot?: string;
  readonly defaultProfile?: string;
  readonly command?: readonly string[];
}

export interface PstackRemoteConfig {
  readonly mode: "ask" | "allow" | "deny";
  readonly stateDir?: string;
  readonly targets: readonly RemoteTargetConfig[];
}

export type RemoteAction = "list" | "run" | "status" | "logs" | "cancel";

export interface RemoteListArgs {
  readonly action: "list";
}

export interface RemoteRunArgs {
  readonly action: "run";
  readonly target: string;
  readonly task: string;
  readonly workspacePath: string;
  readonly profile: string;
  readonly permissionMode: RemotePermissionMode;
  readonly addDir: readonly string[];
  readonly timeoutMs: number;
}

export interface RemoteStatusArgs {
  readonly action: "status";
  readonly jobId: string;
}

export interface RemoteLogsArgs {
  readonly action: "logs";
  readonly jobId: string;
  readonly offset: number;
  readonly limit: number;
}

export interface RemoteCancelArgs {
  readonly action: "cancel";
  readonly jobId: string;
}

export type RemoteArgs =
  | RemoteListArgs
  | RemoteRunArgs
  | RemoteStatusArgs
  | RemoteLogsArgs
  | RemoteCancelArgs;

/** Raised for an argument or configuration problem, before anything is spawned. */
export class RemoteInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RemoteInputError";
  }
}

/** Raised when the target refused to start the job. */
export class RemoteStartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RemoteStartError";
  }
}

const TARGET_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const HOST_NAME = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,255}$/;
const JOB_ID = /^[0-9a-f-]{36}$/;
const TRANSPORTS: readonly RemoteTransport[] = ["ssh", "http", "local"];
const PERMISSION_MODES: readonly RemotePermissionMode[] = [
  "read-only",
  "workspace-write",
  "danger-full-access",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTarget(raw: unknown, index: number): RemoteTargetConfig {
  const where = `targets[${index}]`;
  if (!isRecord(raw)) throw new RemoteInputError(`${where} must be a mapping`);
  for (const key of Object.keys(raw)) {
    if (
      ![
        "name",
        "transport",
        "host",
        "url",
        "tokenEnv",
        "workspaceRoot",
        "defaultProfile",
        "command",
      ].includes(key)
    ) {
      throw new RemoteInputError(`${where}: unknown field "${key}"`);
    }
  }
  const targetName = raw["name"];
  if (typeof targetName !== "string" || !TARGET_NAME.test(targetName)) {
    throw new RemoteInputError(`${where}: "name" must match ${TARGET_NAME.source}`);
  }
  const transport = raw["transport"];
  if (typeof transport !== "string" || !TRANSPORTS.includes(transport as RemoteTransport)) {
    throw new RemoteInputError(`${where}: "transport" must be one of ${TRANSPORTS.join(", ")}`);
  }
  const host = raw["host"];
  if (transport === "ssh" && (typeof host !== "string" || !HOST_NAME.test(host))) {
    throw new RemoteInputError(`${where}: an ssh target needs a "host"`);
  }
  if (host !== undefined && (typeof host !== "string" || !HOST_NAME.test(host))) {
    throw new RemoteInputError(`${where}: "host" must not contain spaces or shell characters`);
  }
  const url = raw["url"];
  if (transport === "http") {
    if (typeof url !== "string")
      throw new RemoteInputError(`${where}: an http target needs a "url"`);
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new RemoteInputError(`${where}: "url" must be an absolute URL`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new RemoteInputError(`${where}: "url" must use http or https`);
    }
  }
  const tokenEnv = raw["tokenEnv"];
  if (tokenEnv !== undefined && (typeof tokenEnv !== "string" || tokenEnv === "")) {
    throw new RemoteInputError(`${where}: "tokenEnv" must name an environment variable`);
  }
  const workspaceRoot = raw["workspaceRoot"];
  if (workspaceRoot !== undefined && (typeof workspaceRoot !== "string" || workspaceRoot === "")) {
    throw new RemoteInputError(`${where}: "workspaceRoot" must be a non-empty path`);
  }
  const defaultProfile = raw["defaultProfile"];
  if (
    defaultProfile !== undefined &&
    (typeof defaultProfile !== "string" || defaultProfile === "")
  ) {
    throw new RemoteInputError(`${where}: "defaultProfile" must be a non-empty name`);
  }
  const command = raw["command"];
  if (command !== undefined) {
    if (!Array.isArray(command) || command.length === 0) {
      throw new RemoteInputError(`${where}: "command" must be a non-empty array`);
    }
    for (const part of command) {
      if (typeof part !== "string" || part === "") {
        throw new RemoteInputError(`${where}: every "command" entry must be a non-empty string`);
      }
    }
  }
  return {
    name: targetName,
    transport: transport as RemoteTransport,
    ...(host === undefined ? {} : { host: host as string }),
    ...(url === undefined ? {} : { url: url as string }),
    ...(tokenEnv === undefined ? {} : { tokenEnv: tokenEnv as string }),
    ...(workspaceRoot === undefined ? {} : { workspaceRoot: workspaceRoot as string }),
    ...(defaultProfile === undefined ? {} : { defaultProfile: defaultProfile as string }),
    ...(command === undefined ? {} : { command: (command as string[]).slice() }),
  };
}

/** Validate the row config without a Schemastery dependency. */
export function normalizeRemoteConfig(value: unknown): PstackRemoteConfig {
  if (value === undefined || value === null) return { mode: "ask", targets: [] };
  if (!isRecord(value)) throw new RemoteInputError("pstack-remote: config must be a mapping");
  for (const key of Object.keys(value)) {
    if (!["mode", "stateDir", "targets"].includes(key)) {
      throw new RemoteInputError(`pstack-remote: unknown config field "${key}"`);
    }
  }
  const mode = value["mode"] ?? "ask";
  if (mode !== "ask" && mode !== "allow" && mode !== "deny") {
    throw new RemoteInputError('pstack-remote: mode must be "ask", "allow", or "deny"');
  }
  const rawTargets = value["targets"] ?? [];
  if (!Array.isArray(rawTargets)) {
    throw new RemoteInputError("pstack-remote: targets must be an array");
  }
  if (rawTargets.length > MAX_TARGETS) {
    throw new RemoteInputError(`pstack-remote: at most ${MAX_TARGETS} targets are allowed`);
  }
  const targets = rawTargets.map(readTarget);
  const seen = new Set<string>();
  for (const target of targets) {
    if (seen.has(target.name)) {
      throw new RemoteInputError(`pstack-remote: duplicate target name "${target.name}"`);
    }
    seen.add(target.name);
  }
  const stateDir = value["stateDir"];
  if (stateDir !== undefined && (typeof stateDir !== "string" || stateDir === "")) {
    throw new RemoteInputError("pstack-remote: stateDir must be a non-empty path");
  }
  return {
    mode,
    ...(stateDir === undefined ? {} : { stateDir: stateDir as string }),
    targets,
  };
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

/** Validate the raw tool arguments. */
export function parseRemoteArgs(raw: unknown): RemoteArgs {
  if (!isRecord(raw)) throw new RemoteInputError("arguments must be an object");
  const action = raw["action"];
  if (typeof action !== "string" || !["list", "run", "status", "logs", "cancel"].includes(action)) {
    throw new RemoteInputError('"action" must be list, run, status, logs, or cancel');
  }

  if (action === "list") {
    for (const key of Object.keys(raw)) {
      if (key !== "action") throw new RemoteInputError(`unknown argument "${key}"`);
    }
    return { action: "list" };
  }

  if (action === "status" || action === "cancel") {
    for (const key of Object.keys(raw)) {
      if (key !== "action" && key !== "jobId") {
        throw new RemoteInputError(`unknown argument "${key}"`);
      }
    }
    const jobId = raw["jobId"];
    if (typeof jobId !== "string" || !JOB_ID.test(jobId)) {
      throw new RemoteInputError('"jobId" must be a job id returned by this tool');
    }
    return { action, jobId };
  }

  if (action === "logs") {
    for (const key of Object.keys(raw)) {
      if (!["action", "jobId", "offset", "limit"].includes(key)) {
        throw new RemoteInputError(`unknown argument "${key}"`);
      }
    }
    const jobId = raw["jobId"];
    if (typeof jobId !== "string" || !JOB_ID.test(jobId)) {
      throw new RemoteInputError('"jobId" must be a job id returned by this tool');
    }
    const offset = raw["offset"] ?? 0;
    const limit = raw["limit"] ?? 200;
    if (!Number.isInteger(offset) || (offset as number) < 0) {
      throw new RemoteInputError('"offset" must be a non-negative integer');
    }
    if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 500) {
      throw new RemoteInputError('"limit" must be an integer between 1 and 500');
    }
    return { action: "logs", jobId, offset: offset as number, limit: limit as number };
  }

  for (const key of Object.keys(raw)) {
    if (
      ![
        "action",
        "target",
        "task",
        "workspacePath",
        "profile",
        "permissionMode",
        "addDir",
        "timeoutMs",
      ].includes(key)
    ) {
      throw new RemoteInputError(`unknown argument "${key}"`);
    }
  }
  const target = readString(raw, "target");
  if (target === undefined) throw new RemoteInputError('"target" must be a registered target name');
  const task = readString(raw, "task");
  if (task === undefined || task.trim() === "") {
    throw new RemoteInputError('"task" must be the task text to run on the remote machine');
  }
  const workspacePath = readString(raw, "workspacePath");
  if (workspacePath === undefined || workspacePath.trim() === "") {
    throw new RemoteInputError('"workspacePath" must be the directory the remote task runs in');
  }
  if (workspacePath.includes("\0")) {
    throw new RemoteInputError('"workspacePath" must not contain NUL');
  }
  const profile = readString(raw, "profile") ?? DEFAULT_PROFILE;
  const permissionMode = readString(raw, "permissionMode") ?? DEFAULT_PERMISSION_MODE;
  if (!PERMISSION_MODES.includes(permissionMode as RemotePermissionMode)) {
    throw new RemoteInputError(`"permissionMode" must be one of ${PERMISSION_MODES.join(", ")}`);
  }
  const addDir = raw["addDir"] ?? [];
  if (!Array.isArray(addDir) || addDir.some((entry) => typeof entry !== "string" || entry === "")) {
    throw new RemoteInputError('"addDir" must be an array of non-empty paths');
  }
  const timeoutMs = raw["timeoutMs"] ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || (timeoutMs as number) < 1) {
    throw new RemoteInputError('"timeoutMs" must be an integer of at least 1');
  }
  if ((timeoutMs as number) > MAX_TIMEOUT_MS) {
    throw new RemoteInputError(`"timeoutMs" must not exceed ${MAX_TIMEOUT_MS}`);
  }
  return {
    action: "run",
    target,
    task,
    workspacePath,
    profile,
    permissionMode: permissionMode as RemotePermissionMode,
    addDir: (addDir as string[]).slice(),
    timeoutMs: timeoutMs as number,
  };
}

export interface RemoteJobRecord {
  readonly jobId: string;
  readonly target: string;
  readonly transport: RemoteTransport;
  readonly task: string;
  readonly workspacePath: string;
  readonly profile: string;
  readonly permissionMode: RemotePermissionMode;
  readonly startedAt: string;
  readonly status: RemoteJobStatus;
  readonly endedAt?: string;
  readonly exitCode?: number | null;
  readonly signal?: string | null;
  readonly error?: string;
}

/** Durable job records: one JSON metadata file and one NDJSON event file per job. */
export class RemoteJobStore {
  constructor(readonly root: string) {}

  private metadataPath(jobId: string): string {
    return join(this.root, `${jobId}.json`);
  }

  private eventPath(jobId: string): string {
    return join(this.root, `${jobId}.jsonl`);
  }

  create(record: RemoteJobRecord): void {
    mkdirSync(this.root, { recursive: true });
    writeFileSync(this.metadataPath(record.jobId), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  }

  update(jobId: string, patch: Partial<RemoteJobRecord>): RemoteJobRecord | undefined {
    const current = this.read(jobId);
    if (current === undefined) return undefined;
    const next: RemoteJobRecord = { ...current, ...patch };
    writeFileSync(this.metadataPath(jobId), `${JSON.stringify(next, null, 2)}\n`, "utf8");
    return next;
  }

  read(jobId: string): RemoteJobRecord | undefined {
    if (!JOB_ID.test(jobId)) return undefined;
    try {
      return JSON.parse(readFileSync(this.metadataPath(jobId), "utf8")) as RemoteJobRecord;
    } catch {
      return undefined;
    }
  }

  appendEvent(jobId: string, line: string): void {
    mkdirSync(this.root, { recursive: true });
    appendFileSync(this.eventPath(jobId), `${line}\n`, "utf8");
  }

  readEvents(
    jobId: string,
    offset: number,
    limit: number,
  ): { readonly lines: readonly string[]; readonly nextOffset: number } {
    if (!JOB_ID.test(jobId)) return { lines: [], nextOffset: offset };
    const path = this.eventPath(jobId);
    if (!existsSync(path)) return { lines: [], nextOffset: offset };
    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    if (lines.at(-1) === "") lines.pop();
    const slice = lines.slice(offset, offset + limit);
    return { lines: slice, nextOffset: offset + slice.length };
  }

  list(): readonly RemoteJobRecord[] {
    if (!existsSync(this.root)) return [];
    const records: RemoteJobRecord[] = [];
    for (const entry of readdirSync(this.root)) {
      if (!entry.endsWith(".json")) continue;
      const record = this.read(entry.slice(0, -".json".length));
      if (record !== undefined) records.push(record);
    }
    return records.sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  }
}

function quotePosix(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function headlessArguments(args: RemoteRunArgs): readonly string[] {
  const result: string[] = [
    "--profile",
    args.profile,
    "--permission-mode",
    args.permissionMode,
    "--json",
  ];
  for (const dir of args.addDir) result.push("--add-dir", dir);
  return result;
}

const START_GRACE_MS = 15_000;

interface RunningJob {
  readonly record: RemoteJobRecord;
  readonly args: RemoteRunArgs;
  child?: ChildProcess;
  controller?: AbortController;
  timer?: NodeJS.Timeout;
}

/** One runner instance per row. `close()` is test support; production never calls it. */
export class RemoteRunner {
  readonly #store: RemoteJobStore;
  readonly #targets: Map<string, RemoteTargetConfig>;
  readonly #running = new Map<string, RunningJob>();

  constructor(
    readonly config: PstackRemoteConfig,
    stateDir: string,
  ) {
    this.#store = new RemoteJobStore(stateDir);
    this.#targets = new Map(config.targets.map((target) => [target.name, target]));
  }

  get store(): RemoteJobStore {
    return this.#store;
  }

  target(name: string): RemoteTargetConfig | undefined {
    return this.#targets.get(name);
  }

  jobs(): readonly RemoteJobRecord[] {
    const records = this.#store.list();
    return records.map((record) => this.#live(record));
  }

  job(jobId: string): RemoteJobRecord | undefined {
    const record = this.#store.read(jobId);
    return record === undefined ? undefined : this.#live(record);
  }

  #live(record: RemoteJobRecord): RemoteJobRecord {
    if (record.status !== "running") return record;
    if (this.#running.has(record.jobId)) return record;
    // The process that owned this record is gone with the previous Host process.
    return { ...record, status: "failed", error: "the Host that started this job exited" };
  }

  async start(
    args: RemoteRunArgs,
  ): Promise<{ readonly jobId: string; readonly status: RemoteJobStatus }> {
    const target = this.#targets.get(args.target);
    if (target === undefined) {
      throw new RemoteInputError(
        `unknown target "${args.target}"; registered targets: ${[...this.#targets.keys()].join(", ") || "none"}`,
      );
    }
    const workspacePath = this.#workspace(target, args.workspacePath);
    const profile =
      args.profile === DEFAULT_PROFILE && target.defaultProfile !== undefined
        ? target.defaultProfile
        : args.profile;
    const record: RemoteJobRecord = {
      jobId: randomUUID(),
      target: target.name,
      transport: target.transport,
      task: args.task,
      workspacePath,
      profile,
      permissionMode: args.permissionMode,
      startedAt: new Date().toISOString(),
      status: "running",
    };
    this.#store.create(record);
    const running: RunningJob = { record, args: { ...args, workspacePath, profile } };
    this.#running.set(record.jobId, running);
    running.timer = setTimeout(() => {
      this.#settle(running, "timed-out", { error: `no result after ${args.timeoutMs}ms` });
    }, args.timeoutMs);
    running.timer.unref?.();

    try {
      if (target.transport === "http") {
        await this.#startHttp(running, target);
      } else {
        await this.#startProcess(running, target);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.#settle(running, "failed", { error: message });
      throw error;
    }
    return { jobId: record.jobId, status: record.status };
  }

  #workspace(target: RemoteTargetConfig, requested: string): string {
    if (target.workspaceRoot === undefined) return requested;
    if (requested === "") return target.workspaceRoot;
    return requested;
  }

  #append(jobId: string, line: string): void {
    this.#store.appendEvent(jobId, line);
  }

  #settle(
    running: RunningJob,
    status: RemoteJobStatus,
    detail: {
      readonly exitCode?: number | null;
      readonly signal?: string | null;
      readonly error?: string;
    } = {},
  ): void {
    if (!this.#running.has(running.record.jobId)) return;
    this.#running.delete(running.record.jobId);
    if (running.timer !== undefined) clearTimeout(running.timer);
    running.controller?.abort();
    // A settled job must not leave a process behind: a timeout or a cancelled run would
    // otherwise keep writing into a session nobody reads any more.
    running.child?.kill("SIGTERM");
    const child = running.child;
    if (child !== undefined) {
      setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
      }, 2_000).unref?.();
    }
    this.#store.update(running.record.jobId, {
      status,
      endedAt: new Date().toISOString(),
      ...(detail.exitCode === undefined ? {} : { exitCode: detail.exitCode }),
      ...(detail.signal === undefined ? {} : { signal: detail.signal }),
      ...(detail.error === undefined ? {} : { error: detail.error }),
    });
  }

  async #startProcess(running: RunningJob, target: RemoteTargetConfig): Promise<void> {
    const command = target.command ?? ["dsh"];
    const argv = [...command.slice(1), ...headlessArguments(running.args)];
    const bin = command[0] ?? "dsh";
    let child: ChildProcess;
    if (target.transport === "ssh") {
      const remote = `cd ${quotePosix(running.args.workspacePath)} && ${command
        .map(quotePosix)
        .join(" ")} ${headlessArguments(running.args).map(quotePosix).join(" ")}`;
      child = spawn(
        "ssh",
        ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10", "--", target.host ?? "", remote],
        {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        },
      );
    } else {
      child = spawn(bin, argv, {
        cwd: running.args.workspacePath,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
    }
    running.child = child;

    const started = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new RemoteStartError(`"${bin}" did not start within ${START_GRACE_MS}ms`)),
        START_GRACE_MS,
      );
      timer.unref?.();
      child.once("spawn", () => {
        clearTimeout(timer);
        resolve();
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(new RemoteStartError(`${bin}: ${error.message}`));
      });
    });

    const collect = (chunk: Buffer): void => {
      const text = chunk.toString("utf8");
      for (const line of text.split(/\r?\n/)) {
        if (line.trim() !== "") this.#append(running.record.jobId, line);
      }
    };
    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);
    child.stdin?.end(running.args.task);

    child.once("close", (code, signal) => {
      this.#settle(running, signal === null && code === 0 ? "completed" : "failed", {
        exitCode: code,
        signal,
        ...(signal === null && code === 0
          ? {}
          : { error: signal === null ? `exit code ${code ?? "unknown"}` : `signal ${signal}` }),
      });
    });

    await started;
  }

  async #startHttp(running: RunningJob, target: RemoteTargetConfig): Promise<void> {
    const url = `${(target.url ?? "").replace(/\/+$/, "")}/jobs`;
    const headers: Record<string, string> = { "content-type": "application/json" };
    const token = target.tokenEnv === undefined ? undefined : process.env[target.tokenEnv];
    if (token !== undefined && token !== "") headers["authorization"] = `Bearer ${token}`;
    const controller = new AbortController();
    running.controller = controller;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          workspacePath: running.args.workspacePath,
          task: running.args.task,
          profile: running.args.profile,
          permissionMode: running.args.permissionMode,
          addDir: running.args.addDir,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new RemoteStartError(`cannot reach ${url}: ${(error as Error).message}`);
    }
    if (!response.ok) {
      throw new RemoteStartError(`${url} answered ${response.status} ${response.statusText}`);
    }
    const remoteJobId = response.headers.get("x-remote-job-id");
    if (remoteJobId !== null) {
      this.#append(running.record.jobId, JSON.stringify({ type: "remote-job", id: remoteJobId }));
    }
    const body = response.body;
    if (body === null) {
      this.#settle(running, "failed", { error: "the worker returned no event stream" });
      return;
    }
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    void (async () => {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.trim() !== "") this.#append(running.record.jobId, line);
          }
        }
        if (buffer.trim() !== "") this.#append(running.record.jobId, buffer);
        this.#settle(running, "completed");
      } catch (error) {
        if (controller.signal.aborted) return;
        this.#settle(running, "failed", { error: (error as Error).message });
      }
    })();
  }

  cancel(jobId: string): RemoteJobRecord | undefined {
    const record = this.#store.read(jobId);
    if (record === undefined) return undefined;
    const running = this.#running.get(jobId);
    if (running === undefined) return this.#live(record);
    if (running.child !== undefined) {
      running.child.kill("SIGTERM");
      setTimeout(() => {
        if (this.#running.has(jobId)) running.child?.kill("SIGKILL");
      }, 5_000).unref?.();
    }
    running.controller?.abort();
    this.#settle(running, "cancelled");
    return this.#store.read(jobId);
  }

  close(): void {
    for (const running of this.#running.values()) {
      running.child?.kill("SIGKILL");
      running.controller?.abort();
      if (running.timer !== undefined) clearTimeout(running.timer);
    }
    this.#running.clear();
  }
}

/** Resolve the directory that holds job records. */
export function remoteStateDir(config: PstackRemoteConfig, dshHome: string): string {
  return config.stateDir ?? join(dshHome, "remote", "jobs");
}

const TOOL_DESCRIPTION = [
  "Dispatch one pstack task to a machine the user registered, or read what happened there.",
  "",
  "This package never supplies the machine. A target is an SSH host that already has `dsh` on",
  "its PATH, an HTTP worker that streams NDJSON, or a local command used by tests. The remote",
  "side runs `dsh --profile headless --json`; the task text travels on stdin, so it cannot be",
  "read as shell syntax.",
  "",
  "`run` returns a job id immediately: read progress with `status` and `logs`, stop it with",
  "`cancel`. A run is visible in the approval flow first, and the `pstack-remote` row decides",
  "whether that approval is asked, allowed, or denied. Read-only actions (list, status, logs)",
  "never ask.",
  "",
  "Records live under `$DSH_HOME/remote/jobs/`. A job whose Host process exited is reported as",
  "failed with that reason instead of hanging; this tool never adopts a process it did not start.",
  "A chart, a video, or a cloud dashboard is not part of this tool: the remote machine only runs",
  "the task and returns its event stream.",
].join("\n");

export function buildRemoteParameters(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      action: {
        type: "string",
        enum: ["list", "run", "status", "logs", "cancel"],
        description: "list targets and recent jobs, run a task, or read and stop a job.",
      },
      target: {
        type: "string",
        description: "Registered target name; `list` reports the names this row accepts.",
      },
      task: {
        type: "string",
        description: "The task text for the remote `dsh --profile headless` run.",
      },
      workspacePath: {
        type: "string",
        description: "Directory on the remote machine the task runs in.",
      },
      profile: {
        type: "string",
        description: `Remote DSH profile. Defaults to "${DEFAULT_PROFILE}", or to the target's defaultProfile.`,
      },
      permissionMode: {
        type: "string",
        enum: [...PERMISSION_MODES],
        description: `Remote permission mode. Defaults to "${DEFAULT_PERMISSION_MODE}".`,
      },
      addDir: {
        type: "array",
        items: { type: "string" },
        description: "Extra directories the remote session may read or write.",
      },
      timeoutMs: {
        type: "integer",
        description: `Wall-clock limit for the whole remote run. Defaults to ${DEFAULT_TIMEOUT_MS}; at most ${MAX_TIMEOUT_MS}.`,
      },
      jobId: { type: "string", description: "Job id returned by `run`." },
      offset: {
        type: "integer",
        description: "Event line to start from when reading logs; defaults to 0.",
      },
      limit: {
        type: "integer",
        description: "How many event lines to return; defaults to 200, at most 500.",
      },
    },
    required: ["action"],
  };
}

export type RemoteOutcome =
  | {
      readonly kind: "list";
      readonly targets: readonly RemoteTargetConfig[];
      readonly jobs: readonly RemoteJobRecord[];
    }
  | {
      readonly kind: "started";
      readonly jobId: string;
      readonly target: string;
      readonly status: RemoteJobStatus;
    }
  | { readonly kind: "status"; readonly job: RemoteJobRecord }
  | {
      readonly kind: "logs";
      readonly jobId: string;
      readonly lines: readonly string[];
      readonly nextOffset: number;
      readonly done: boolean;
    }
  | { readonly kind: "cancelled"; readonly job: RemoteJobRecord };

export const OUTPUT_SCHEMA: JsonSchemaNode = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", const: "list" },
        targets: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              transport: { type: "string", enum: ["ssh", "http", "local"] },
              host: { type: "string" },
              url: { type: "string" },
              workspaceRoot: { type: "string" },
            },
            required: ["name", "transport"],
          },
        },
        jobs: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              jobId: { type: "string" },
              target: { type: "string" },
              status: { type: "string" },
              startedAt: { type: "string" },
              endedAt: { type: "string" },
              error: { type: "string" },
            },
            required: ["jobId", "target", "status", "startedAt"],
          },
        },
      },
      required: ["kind", "targets", "jobs"],
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", const: "started" },
        jobId: { type: "string" },
        target: { type: "string" },
        status: { type: "string" },
      },
      required: ["kind", "jobId", "target", "status"],
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", const: "status" },
        job: {
          type: "object",
          additionalProperties: false,
          properties: {
            jobId: { type: "string" },
            target: { type: "string" },
            transport: { type: "string" },
            status: { type: "string" },
            task: { type: "string" },
            workspacePath: { type: "string" },
            startedAt: { type: "string" },
            endedAt: { type: "string" },
            exitCode: { oneOf: [{ type: "integer" }, { type: "null" }] },
            signal: { oneOf: [{ type: "string" }, { type: "null" }] },
            error: { type: "string" },
          },
          required: [
            "jobId",
            "target",
            "transport",
            "status",
            "task",
            "workspacePath",
            "startedAt",
          ],
        },
      },
      required: ["kind", "job"],
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", const: "logs" },
        jobId: { type: "string" },
        lines: { type: "array", items: { type: "string" } },
        nextOffset: { type: "integer" },
        done: { type: "boolean" },
      },
      required: ["kind", "jobId", "lines", "nextOffset", "done"],
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", const: "cancelled" },
        job: {
          type: "object",
          additionalProperties: false,
          properties: {
            jobId: { type: "string" },
            target: { type: "string" },
            transport: { type: "string" },
            status: { type: "string" },
            task: { type: "string" },
            workspacePath: { type: "string" },
            startedAt: { type: "string" },
            endedAt: { type: "string" },
            exitCode: { oneOf: [{ type: "integer" }, { type: "null" }] },
            signal: { oneOf: [{ type: "string" }, { type: "null" }] },
            error: { type: "string" },
          },
          required: [
            "jobId",
            "target",
            "transport",
            "status",
            "task",
            "workspacePath",
            "startedAt",
          ],
        },
      },
      required: ["kind", "job"],
    },
  ],
};

/** Render one outcome as text the model reads. */
export function renderRemoteOutcome(outcome: RemoteOutcome): string {
  if (outcome.kind === "list") {
    const targets =
      outcome.targets.length === 0
        ? ["No target is registered. Add one in the pstack-remote row config."]
        : outcome.targets.map((target) => {
            const where = target.host ?? target.url ?? "local command";
            return `- ${target.name} (${target.transport}, ${where})${target.workspaceRoot === undefined ? "" : ` root: ${target.workspaceRoot}`}`;
          });
    const jobs =
      outcome.jobs.length === 0
        ? ["No job has run yet."]
        : outcome.jobs
            .slice(0, 10)
            .map(
              (job) =>
                `- ${job.jobId} ${job.target} ${job.status} started ${job.startedAt}${job.error === undefined ? "" : ` (${job.error})`}`,
            );
    return ["targets:", ...targets, "", "recent jobs:", ...jobs].join("\n");
  }
  if (outcome.kind === "started") {
    return [
      `started ${outcome.jobId} on ${outcome.target} (status: ${outcome.status}).`,
      "Read it with status or logs; stop it with cancel. Do not poll in a tight loop.",
    ].join("\n");
  }
  if (outcome.kind === "logs") {
    if (outcome.lines.length === 0) {
      return `no new events for ${outcome.jobId} at offset ${outcome.nextOffset}${outcome.done ? " (job finished)" : ""}.`;
    }
    return [
      `events ${outcome.lines.length} from ${outcome.jobId}, next offset ${outcome.nextOffset}${outcome.done ? " (job finished)" : ""}:`,
      ...outcome.lines.map((line) => `  ${line}`),
    ].join("\n");
  }
  const job = outcome.job;
  const lines = [
    `${job.jobId} on ${job.target} (${job.transport}): ${job.status}`,
    `workspace: ${job.workspacePath}`,
    `started: ${job.startedAt}${job.endedAt === undefined ? "" : `, ended: ${job.endedAt}`}`,
    job.exitCode === undefined || job.exitCode === null ? "" : `exit code: ${job.exitCode}`,
    job.signal === undefined || job.signal === null ? "" : `signal: ${job.signal}`,
    job.error === undefined ? "" : `error: ${job.error}`,
  ].filter((line) => line !== "");
  if (job.status === "running") lines.push("Read its event stream with logs.");
  if (job.status === "failed" || job.status === "timed-out") {
    lines.push("This run did not succeed. Read the output; do not report success.");
  }
  return lines.join("\n");
}

/** The slices of the Cordis context this row uses. */
export interface PstackRemoteHost {
  readonly tools: ToolsHost;
  readonly config: PstackRemoteConfig;
  readonly dshHome: string;
}

export function createPstackRemoteTool(host: PstackRemoteHost): ToolDefinition {
  const runner = new RemoteRunner(host.config, remoteStateDir(host.config, host.dshHome));
  return {
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: buildRemoteParameters(),
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [
        { type: "text", text: renderRemoteOutcome(value as unknown as RemoteOutcome) },
      ],
    },
    isConcurrencySafe: () => false,
    async execute(rawArgs, _exec: ToolRunContext): Promise<RemoteOutcome> {
      const args = parseRemoteArgs(rawArgs);
      if (args.action === "list") {
        return { kind: "list", targets: host.config.targets, jobs: runner.jobs() };
      }
      if (args.action === "run") {
        const started = await runner.start(args);
        return {
          kind: "started",
          jobId: started.jobId,
          target: args.target,
          status: started.status,
        };
      }
      if (args.action === "cancel") {
        const job = runner.cancel(args.jobId);
        if (job === undefined) throw new RemoteInputError(`unknown job "${args.jobId}"`);
        return { kind: "cancelled", job };
      }
      const job = runner.job(args.jobId);
      if (job === undefined) throw new RemoteInputError(`unknown job "${args.jobId}"`);
      if (args.action === "status") return { kind: "status", job };
      const events = runner.store.readEvents(args.jobId, args.offset, args.limit);
      return {
        kind: "logs",
        jobId: args.jobId,
        lines: events.lines,
        nextOffset: events.nextOffset,
        done: job.status !== "running",
      };
    },
  };
}

/** The decision the row makes for one pending call; exported for tests. */
export function decideRemoteCall(
  mode: PstackRemoteConfig["mode"],
  exec: Pick<ToolExecution, "name" | "arguments">,
):
  | { readonly kind: "next" }
  | { readonly kind: "deny"; readonly reason: string }
  | {
      readonly kind: "ask";
      readonly reason: string;
    } {
  if (exec.name !== TOOL_NAME) return { kind: "next" };
  const action =
    isRecord(exec.arguments) && typeof exec.arguments["action"] === "string"
      ? exec.arguments["action"]
      : "unknown";
  if (action !== "run" && action !== "cancel") return { kind: "next" };
  if (mode === "allow") return { kind: "next" };
  if (mode === "deny") {
    return { kind: "deny", reason: `pstack_remote "${action}" is disabled by policy.` };
  }
  const target =
    isRecord(exec.arguments) && typeof exec.arguments["target"] === "string"
      ? ` on ${exec.arguments["target"]}`
      : "";
  return {
    kind: "ask",
    reason:
      action === "run"
        ? `Run a task${target} on a machine outside this one.`
        : `Stop a remote job${target}.`,
  };
}

/** Register `pstack_remote` and its approval policy. */
export function apply(ctx: Context & { readonly tools: ToolsHost }, rawConfig?: unknown): void {
  const config = normalizeRemoteConfig(rawConfig);
  const tool = createPstackRemoteTool({
    tools: ctx.tools,
    config,
    dshHome: resolveDshHome(process.env),
  });
  ctx.tools.register(tool);
  if (config.mode === "allow") return;
  ctx.on("tools/pre-execute", async (exec, next): Promise<PreToolDecision> => {
    const decision = decideRemoteCall(config.mode, exec);
    if (decision.kind === "next") return next();
    if (decision.kind === "deny") return { kind: "deny", reason: decision.reason };
    return {
      kind: "ask",
      reason: decision.reason,
      displayReason: { en: "Run this task on the remote machine?" },
    };
  });
}
