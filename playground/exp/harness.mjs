/**
 * Shared plumbing for the pstack experiments: a per-arm DSH home, the credential
 * bridge, the headless spawn, and the event-stream helpers.
 *
 * An experiment never invents a second profile root: every arm is another
 * profile inside `playground/.dsh`, so the runtime sees one home and one bundle.
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as yaml from "js-yaml";

export const EXP_DIR = dirname(fileURLToPath(import.meta.url));
export const PLAYGROUND_DIR = dirname(EXP_DIR);
export const REPO_ROOT = resolve(PLAYGROUND_DIR, "..");
export const DSH_HOME = join(PLAYGROUND_DIR, ".dsh");
export const PACKAGE_NAME = "@paipaipai666/dsh-pstack";

/** Write (or refresh) one arm's profile: its manifest, its patch, and its link. */
export function ensureProfile(profileName, patchText) {
  const profileDir = join(DSH_HOME, "profiles", profileName);
  mkdirSync(join(profileDir, "node_modules", "@paipaipai666"), { recursive: true });
  const manifest = {
    name: `dsh-profile-${profileName}`,
    private: true,
    dependencies: { [PACKAGE_NAME]: `link:${REPO_ROOT}` },
    dsh: {
      profile: { bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-headless", PACKAGE_NAME] },
    },
  };
  writeFileSync(join(profileDir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(profileDir, "cordis.patch.yml"), patchText);
  const link = join(profileDir, "node_modules", "@paipaipai666", "dsh-pstack");
  let linked = false;
  try {
    linked = lstatSync(link).isSymbolicLink() || lstatSync(link).isDirectory();
  } catch {
    linked = false;
  }
  if (!linked) symlinkSync(REPO_ROOT, link, process.platform === "win32" ? "junction" : "dir");
}

/** Export every credential in the playground home so a headless child can reach the gateway. */
export function loadCredentials() {
  const file = join(DSH_HOME, ".credentials.yaml");
  if (!existsSync(file)) return 0;
  const parsed = yaml.load(readFileSync(file, "utf8"));
  let count = 0;
  for (const [envName, secret] of Object.entries(parsed?.refs ?? {})) {
    if (typeof secret !== "string" || secret === "") continue;
    if (process.env[envName]) continue;
    process.env[envName] = secret;
    count += 1;
  }
  return count;
}

/** Resolve the deployment's CLI, rewriting an Electron binary into its Node mode. */
export function resolveDshSpawn(extraArgs) {
  const bin = process.env.DSH_BIN || process.env.DSH_NODE_EXECUTABLE || "dsh";
  const cliPath = (root) =>
    resolve(
      root,
      "resources",
      "app.asar",
      "dsh",
      "node_modules",
      "@deepseek-ai",
      "dsh-desktop-host",
      "lib",
      "cli.js",
    );
  if (/\.exe$/i.test(bin)) {
    return {
      command: bin,
      args: ["--expose-internals", cliPath(dirname(bin)), ...extraArgs],
      shell: false,
    };
  }
  if (/[\\/]dsh\.cmd$/i.test(bin)) {
    const exe = resolve(dirname(bin), "..", "..", "..", "..", "DeepSeek Harness.exe");
    const cliJs = resolve(
      dirname(bin),
      "..",
      "..",
      "..",
      "app.asar",
      "dsh",
      "node_modules",
      "@deepseek-ai",
      "dsh-desktop-host",
      "lib",
      "cli.js",
    );
    return { command: exe, args: ["--expose-internals", cliJs, ...extraArgs], shell: false };
  }
  return { command: `"${bin}"`, args: extraArgs, shell: process.platform === "win32" };
}

/** Read the newline-delimited JSON the headless CLI prints. */
export function parseEvents(stdout) {
  const events = [];
  for (const line of stdout.split("\n")) {
    const text = line.trim();
    if (!text) continue;
    try {
      events.push(JSON.parse(text));
    } catch {
      // Loader diagnostics can share stdout with the JSON stream.
    }
  }
  return events;
}

/** One headless run. `cwd` stays the repo root so every arm sees the same tree. */
export function runHeadless(prompt, profile, timeoutMs) {
  const launch = resolveDshSpawn(["--profile", profile, "--json", prompt]);
  const started = Date.now();
  const result = spawnSync(launch.command, launch.args, {
    cwd: REPO_ROOT,
    env: { ...process.env, DSH_HOME, ELECTRON_RUN_AS_NODE: "1" },
    shell: launch.shell,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
  });
  return { result, events: parseEvents(result.stdout ?? ""), elapsedMs: Date.now() - started };
}

/** Every tool call, joined to nothing else: the argument object is enough here. */
export function collectCalls(events) {
  const calls = [];
  for (const event of events) {
    if (event.type === "tool_call") calls.push({ tool: event.tool, input: event.input ?? {} });
  }
  return calls;
}

/** Prompt tokens the model saw, counted over every step. */
export function usageTotals(events) {
  const steps = events.filter((event) => event.type === "status" && event.phase === "step_end");
  const sum = (key) => steps.reduce((total, event) => total + (event.usage?.[key] ?? 0), 0);
  // `inputTokens` counts only the uncached prompt; `cacheReadTokens` is the rest.
  const promptTokens = steps.reduce(
    (total, event) => total + (event.usage?.inputTokens ?? 0) + (event.usage?.cacheReadTokens ?? 0),
    0,
  );
  return {
    steps: steps.length,
    promptTokens,
    firstStepPromptTokens:
      (steps[0]?.usage?.inputTokens ?? 0) + (steps[0]?.usage?.cacheReadTokens ?? 0),
    outputTokens: sum("outputTokens"),
  };
}
