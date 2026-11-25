/**
 * Skill-discovery experiment: does an agent load the right pstack skill when the
 * skill's name is in context?
 *
 * Three arms, one variable — what the model can see about the 59 hidden pstack
 * skills:
 *   a  nothing (baseline: every pstack skill is `disable-model-invocation`)
 *   b  the full catalog (a filesystem provider whose copies drop that flag)
 *   c  a one-line index of names (the `pstack-skill-index` row under test)
 *
 * Every arm keeps the same preset, prompt, model route, and workspace. Results
 * land in `.tmp/exp/runs.jsonl`, one JSON object per run.
 *
 * Usage:
 *   vp run exp:discovery                       # all arms, all tasks
 *   vp run exp:discovery -- --arms a,c --tasks unslop,statechart
 *   vp run exp:discovery -- --report           # re-render the table from runs.jsonl
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as yaml from "js-yaml";

import { TASKS } from "./exp/tasks.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const DSH_HOME = join(HERE, ".dsh");
const OUT_DIR = join(REPO_ROOT, ".tmp", "exp");
const RAW_DIR = join(OUT_DIR, "raw");
const RUNS_FILE = join(OUT_DIR, "runs.jsonl");
const PACKAGE_NAME = "@paipaipai666/dsh-pstack";
const VISIBLE_DIR = join(OUT_DIR, "visible");
const CASE_TIMEOUT = Number(process.env.PSTACK_EXP_TIMEOUT_MS ?? 300000);

const args = process.argv.slice(2);
function argValue(name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}
const ONLY_ARMS = argValue("arms")?.split(",").filter(Boolean);
const ONLY_TASKS = argValue("tasks")?.split(",").filter(Boolean);
const REPORT_ONLY = args.includes("--report");

const BASE_PATCH = [
  "- id: pstack-agent-preset-registry",
  "  config:",
  "    default: poteto-mode",
  "- id: pstack-script-policy",
  "  config:",
  "    mode: allow",
  "",
].join("\n");

const VISIBLE_PATCH = [
  BASE_PATCH,
  "- insert:",
  "    - id: pstack-visible-skills",
  '      name: "@deepseek-ai/dsh-skill-filesystem"',
  "      config:",
  "        providerName: pstack-visible",
  "        includeDefaultRoots: false",
  "        watch: false",
  "        customSkillDirs:",
  `          - '${VISIBLE_DIR.replaceAll("\\", "/")}'`,
  "",
].join("\n");

const INDEX_PATCH = [
  BASE_PATCH,
  "- insert:",
  "    - id: pstack-skill-index",
  '      name: "@paipaipai666/dsh-pstack/skill-index"',
  "      config:",
  "        maxDescriptionChars: 96",
  "",
].join("\n");

const TRIGGER_PATCH = [
  BASE_PATCH,
  "- insert:",
  "    - id: pstack-skill-index",
  '      name: "@paipaipai666/dsh-pstack/skill-index"',
  "      config:",
  "        maxDescriptionChars: 110",
  "",
].join("\n");

const CURATED_PATCH = [
  BASE_PATCH,
  "- insert:",
  "    - id: pstack-visible-skills",
  '      name: "@deepseek-ai/dsh-skill-filesystem"',
  "      config:",
  "        providerName: pstack-visible",
  "        includeDefaultRoots: false",
  "        watch: false",
  "        customSkillDirs:",
  `          - '${join(REPO_ROOT, ".tmp", "exp", "curated").replaceAll("\\", "/")}'`,
  "",
].join("\n");

const ARMS = {
  a: { label: "baseline (hidden)", profile: "exp-a", patch: BASE_PATCH },
  b: { label: "full catalog", profile: "exp-b", patch: VISIBLE_PATCH },
  c: { label: "compact index", profile: "exp-c", patch: INDEX_PATCH },
  d: { label: "trigger index", profile: "exp-d", patch: TRIGGER_PATCH },
  e: { label: "curated catalog", profile: "exp-e", patch: CURATED_PATCH },
};

function ensureProfile(profileName, patchText) {
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
function loadCredentials() {
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

function resolveDshSpawn(extraArgs) {
  const bin = process.env.DSH_BIN || process.env.DSH_NODE_EXECUTABLE || "dsh";
  if (/\.exe$/i.test(bin)) {
    const cliJs = resolve(
      dirname(bin),
      "resources",
      "app.asar",
      "dsh",
      "node_modules",
      "@deepseek-ai",
      "dsh-desktop-host",
      "lib",
      "cli.js",
    );
    return { command: bin, args: ["--expose-internals", cliJs, ...extraArgs], shell: false };
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

function parseEvents(stdout) {
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

const SKILL_TOOLS = new Set(["pstack_skill", "skill"]);

function summarize(task, arm, result, events) {
  const calls = new Map();
  for (const event of events) {
    if (event.type === "tool_call")
      calls.set(event.callId, { tool: event.tool, input: event.input });
  }
  const skillLoads = [];
  const loadTools = [];
  const otherTools = [];
  for (const call of calls.values()) {
    if (SKILL_TOOLS.has(call.tool)) {
      skillLoads.push(String(call.input?.name ?? ""));
      loadTools.push(call.tool);
    } else {
      otherTools.push(call.tool);
    }
  }
  const usage = events.filter((event) => event.type === "status" && event.phase === "step_end");
  const sum = (key) => usage.reduce((total, event) => total + (event.usage?.[key] ?? 0), 0);
  // `inputTokens` counts only the uncached prompt; `cacheReadTokens` is the rest of
  // it, so the prompt the model actually saw is their sum.
  const promptTokens = usage.reduce(
    (total, event) => total + (event.usage?.inputTokens ?? 0) + (event.usage?.cacheReadTokens ?? 0),
    0,
  );
  const final = events.find((event) => event.type === "final");
  return {
    arm,
    task: task.id,
    expect: task.expect,
    status: result.status,
    completed: final?.reason?.kind === "completed",
    firstLoad: skillLoads[0] ?? null,
    loads: skillLoads,
    loadTools,
    firstHit: skillLoads[0] === task.expect,
    anyHit: skillLoads.includes(task.expect),
    falseLoads: skillLoads.filter((name) => name !== task.expect),
    otherTools,
    steps: usage.length,
    inputTokens: sum("inputTokens"),
    cacheReadTokens: sum("cacheReadTokens"),
    promptTokens,
    outputTokens: sum("outputTokens"),
    firstStepInputTokens: usage[0]?.usage?.inputTokens ?? 0,
    textChars: final?.text?.length ?? 0,
    stderrTail: (result.stderr ?? "").split("\n").filter(Boolean).slice(-3).join(" | "),
    at: new Date().toISOString(),
  };
}

function renderReport() {
  if (!existsSync(RUNS_FILE)) {
    console.log("no runs yet");
    return;
  }
  const rows = readFileSync(RUNS_FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const byArm = new Map();
  for (const row of rows) {
    if (!byArm.has(row.arm)) byArm.set(row.arm, []);
    byArm.get(row.arm).push(row);
  }
  const header = ["task", ...[...byArm.keys()].map((arm) => `${arm}: ${ARMS[arm]?.label ?? arm}`)];
  const lines = [`| ${header.join(" | ")} |`, `|${header.map(() => "---").join("|")}|`];
  const taskIds = [...new Set(rows.map((row) => row.task))];
  for (const taskId of taskIds) {
    const cells = [taskId];
    for (const arm of byArm.keys()) {
      const row = byArm.get(arm).find((item) => item.task === taskId);
      if (!row) {
        cells.push("–");
        continue;
      }
      const mark = row.firstHit ? "✓" : row.anyHit ? "~" : "✗";
      cells.push(`${mark} ${row.firstLoad ?? "none"} · ${Math.round(row.promptTokens / 1000)}k`);
    }
    lines.push(`| ${cells.join(" | ")} |`);
  }
  const totals = ["hit-rate"];
  for (const [arm, armRows] of byArm) {
    const hits = armRows.filter((row) => row.firstHit).length;
    const tokens = armRows.reduce((total, row) => total + row.promptTokens, 0);
    totals.push(`${hits}/${armRows.length} · ${Math.round(tokens / armRows.length / 1000)}k avg`);
  }
  lines.push(`| ${totals.join(" | ")} |`);
  console.log(lines.join("\n"));
}

if (REPORT_ONLY) {
  renderReport();
  process.exit(0);
}

const selectedArms = ONLY_ARMS ?? Object.keys(ARMS);
const selectedTasks =
  ONLY_TASKS === undefined ? TASKS : TASKS.filter((task) => ONLY_TASKS.includes(task.id));

mkdirSync(RAW_DIR, { recursive: true });
for (const arm of selectedArms) {
  if (!ARMS[arm]) throw new Error(`unknown arm ${arm}`);
  ensureProfile(ARMS[arm].profile, ARMS[arm].patch);
}
const credentialCount = loadCredentials();
console.log(
  `[exp] arms=${selectedArms.join(",")} tasks=${selectedTasks.length} credentials=${credentialCount}`,
);

const REPEAT = Number(argValue("repeat") ?? 1);
if (args.includes("--fresh")) rmSync(RUNS_FILE, { force: true });

for (const arm of selectedArms) {
  for (const task of selectedTasks) {
    for (let rep = 0; rep < REPEAT; rep += 1) {
      const launch = resolveDshSpawn(["--profile", ARMS[arm].profile, "--json", task.prompt]);
      const started = Date.now();
      const result = spawnSync(launch.command, launch.args, {
        cwd: REPO_ROOT,
        env: { ...process.env, DSH_HOME, ELECTRON_RUN_AS_NODE: "1" },
        shell: launch.shell,
        encoding: "utf8",
        timeout: CASE_TIMEOUT,
        maxBuffer: 64 * 1024 * 1024,
      });
      const events = parseEvents(result.stdout ?? "");
      const rawName = `${arm}-${task.id}${REPEAT > 1 ? `-r${rep}` : ""}.jsonl`;
      writeFileSync(join(RAW_DIR, rawName), result.stdout ?? "");
      const row = { ...summarize(task, arm, result, events), rep };
      writeFileSync(RUNS_FILE, `${JSON.stringify(row)}\n`, { flag: "a" });
      console.error(
        `[${arm}] ${task.id.padEnd(18)} ${row.firstHit ? "HIT " : row.anyHit ? "LATE" : "MISS"} ` +
          `loads=[${row.loads.join(",")}] prompt=${row.promptTokens} steps=${row.steps} ` +
          `${Math.round((Date.now() - started) / 1000)}s`,
      );
    }
  }
}

renderReport();

// A clean report is the deliverable; keep the artifact directory out of git.
rmSync(join(OUT_DIR, ".keep"), { force: true });
