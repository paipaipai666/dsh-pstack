/**
 * Playbook-routing experiment: does a router that names the playbook make the
 * agent open it?
 *
 * Two arms, one variable — whether the `pstack-playbook-router` row is mounted:
 *   a  baseline, no router
 *   r  router on: one routing call per user message, then a short notice
 *
 * The measured question is not "did the answer look better" but the cheaper,
 * falsifiable one: did the session read a playbook, which one, and at what
 * prompt cost. The router's own decisions land in `.tmp/exp/router-trace.jsonl`
 * so a run that silently failed cannot be mistaken for a run that chose nothing.
 *
 * Usage:
 *   vp run exp:router                       # both arms, every task
 *   vp run exp:router -- --arms r --tasks plan-entry
 *   vp run exp:router -- --report
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  REPO_ROOT,
  collectCalls,
  ensureProfile,
  loadCredentials,
  runHeadless,
  usageTotals,
} from "./exp/harness.mjs";
import { PLAYBOOK_TASKS } from "./exp/playbook-tasks.mjs";

const OUT_DIR = join(REPO_ROOT, ".tmp", "exp");
const RAW_DIR = join(OUT_DIR, "raw-router");
const RUNS_FILE = join(OUT_DIR, "router-runs.jsonl");
const TRACE_FILE = join(OUT_DIR, "router-trace.jsonl");
const CASE_TIMEOUT = Number(process.env.PSTACK_EXP_TIMEOUT_MS ?? 300000);

const args = process.argv.slice(2);
const argValue = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
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

const ROUTER_PATCH = [
  BASE_PATCH,
  "- insert:",
  "    - id: pstack-playbook-router",
  '      name: "@paipaipai666/dsh-pstack/playbook-router"',
  "      config:",
  "        timeoutMs: 15000",
  `        tracePath: '${TRACE_FILE.replaceAll("\\", "/")}'`,
  "",
].join("\n");

const ARMS = {
  a: { label: "baseline", profile: "exp-a", patch: BASE_PATCH },
  r: { label: "router", profile: "exp-router", patch: ROUTER_PATCH },
};

const PLAYBOOK_RESOURCE = /^playbooks\/(.+)\.md$/;

function summarize(task, arm, run) {
  const calls = collectCalls(run.events);
  const playbookReads = [];
  const skillLoads = [];
  for (const call of calls) {
    if (call.tool !== "pstack_skill" && call.tool !== "skill") continue;
    const name = String(call.input?.name ?? "");
    if (name !== "") skillLoads.push(name);
    const match = PLAYBOOK_RESOURCE.exec(String(call.input?.resource ?? ""));
    if (match?.[1] !== undefined) playbookReads.push(match[1]);
  }
  const firstPlaybook = playbookReads[0] ?? null;
  const final = run.events.find((event) => event.type === "final");
  const usage = usageTotals(run.events);
  return {
    arm,
    task: task.id,
    expect: task.expect,
    status: run.result.status,
    completed: final?.reason?.kind === "completed",
    firstPlaybook,
    playbookReads,
    skillLoads,
    hit: firstPlaybook !== null && task.expect.includes(firstPlaybook),
    anyHit: playbookReads.some((id) => task.expect.includes(id)),
    // A control expects no workflow at all; reading one is the false positive.
    falsePositive: task.expect.length === 0 && playbookReads.length > 0,
    steps: usage.steps,
    promptTokens: usage.promptTokens,
    firstStepPromptTokens: usage.firstStepPromptTokens,
    outputTokens: usage.outputTokens,
    elapsedMs: run.elapsedMs,
    textChars: final?.text?.length ?? 0,
    stderrTail: (run.result.stderr ?? "").split("\n").filter(Boolean).slice(-3).join(" | "),
    at: new Date().toISOString(),
  };
}

/** The decisions the router wrote during the last run. */
function readTrace() {
  if (!existsSync(TRACE_FILE)) return [];
  return readFileSync(TRACE_FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { decision: { kind: "unparseable-trace" } };
      }
    });
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
  const arms = [...new Set(rows.map((row) => row.arm))];
  const header = ["task", ...arms.map((arm) => `${arm}: ${ARMS[arm]?.label ?? arm}`)];
  const lines = [`| ${header.join(" | ")} |`, `|${header.map(() => "---").join("|")}|`];
  for (const taskId of new Set(rows.map((row) => row.task))) {
    const cells = [taskId];
    for (const arm of arms) {
      const row = rows.find((item) => item.arm === arm && item.task === taskId);
      if (row === undefined) {
        cells.push("–");
        continue;
      }
      const mark = row.hit ? "✓" : row.falsePositive ? "!" : "✗";
      const said = row.firstPlaybook ?? "none";
      cells.push(`${mark} ${said} · ${Math.round(row.promptTokens / 1000)}k · ${row.steps}st`);
    }
    lines.push(`| ${cells.join(" | ")} |`);
  }
  const totals = ["hits"];
  for (const arm of arms) {
    const armRows = rows.filter((row) => row.arm === arm);
    const hits = armRows.filter((row) => row.hit).length;
    const falsePositives = armRows.filter((row) => row.falsePositive).length;
    const scored = armRows.filter((row) => row.expect.length > 0).length;
    totals.push(`${hits}/${scored} hits · ${falsePositives} false`);
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
  ONLY_TASKS === undefined
    ? PLAYBOOK_TASKS
    : PLAYBOOK_TASKS.filter((task) => ONLY_TASKS.includes(task.id));

mkdirSync(RAW_DIR, { recursive: true });
for (const arm of selectedArms) {
  if (ARMS[arm] === undefined) throw new Error(`unknown arm ${arm}`);
  ensureProfile(ARMS[arm].profile, ARMS[arm].patch);
}
console.log(
  `[exp] arms=${selectedArms.join(",")} tasks=${selectedTasks.length} credentials=${loadCredentials()}`,
);

const REPEAT = Number(argValue("repeat") ?? 1);
if (args.includes("--fresh")) rmSync(RUNS_FILE, { force: true });

for (const arm of selectedArms) {
  for (const task of selectedTasks) {
    for (let rep = 0; rep < REPEAT; rep += 1) {
      rmSync(TRACE_FILE, { force: true });
      const run = runHeadless(task.prompt, ARMS[arm].profile, CASE_TIMEOUT);
      const row = { ...summarize(task, arm, run), decisions: readTrace(), rep };
      writeFileSync(
        join(RAW_DIR, `${arm}-${task.id}${REPEAT > 1 ? `-r${rep}` : ""}.jsonl`),
        run.result.stdout ?? "",
      );
      writeFileSync(RUNS_FILE, `${JSON.stringify(row)}\n`, { flag: "a" });
      const said = row.decisions
        .map((entry) => entry.decision?.id ?? entry.decision?.kind)
        .join(",");
      console.error(
        `[${arm}] ${task.id.padEnd(18)} ${row.hit ? "HIT " : row.falsePositive ? "FP  " : "MISS"} ` +
          `read=[${row.playbookReads.join(",")}] routed=[${said}] ` +
          `prompt=${row.promptTokens} steps=${row.steps} ${Math.round(row.elapsedMs / 1000)}s`,
      );
    }
  }
}

renderReport();
