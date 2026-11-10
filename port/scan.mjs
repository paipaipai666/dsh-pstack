#!/usr/bin/env node
// 上游 pstack 能力扫描。逐项列出 Cursor 能力在源树中的出现位置，并校验 port/audit.md 的引用是否仍然成立。

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "upstream/cursor-plugins/pstack");
const TSV = join(ROOT, ".audit/scan/capability-scan.tsv");

/** Forward-slash form of a relative path, so the scan matches on every platform. */
const relPath = (from, to) => relative(from, to).replaceAll(sep, "/");

/** Text with LF endings, so digests do not depend on the checkout's autocrlf setting. */
function readText(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const TERMS = [
  // Cursor 工具
  ["Task", "tool", /`Task`|\bTask (tool|subagent|call)/],
  ["AskQuestion", "tool", /AskQuestion/],
  ["TodoWrite", "tool", /\bTodoWrite\b|Open a todolist|\btodo ?list\b/i],
  ["Skill", "tool", /`Skill` tool|\bSkill tool\b|the \*\*[a-z0-9-]+\*\* skill|`\/[a-z0-9-]+`/],
  ["Read", "tool", /`Read`|\bRead (it|the file|this file)\b/],
  ["Write", "tool", /`Write`/],
  ["Edit", "tool", /`Edit`|\bEdit tool\b/],
  ["Grep", "tool", /`Grep`/],
  ["Glob", "tool", /`Glob`/],
  ["Bash", "tool", /`Bash`|\bBash\b/],
  // Task 字段
  ["subagent_type", "field", /subagent_type/],
  ["generalPurpose", "field", /generalPurpose/],
  ["poteto-agent", "field", /poteto-agent/],
  ["comment-sicko", "field", /comment-sicko/],
  [
    "readonly",
    "field",
    /readonly: (true|false)|readonly\/Ask|`readonly`|\breadonly (agent|subagent|reviewer)\b/,
  ],
  ["environment", "field", /environment: "(cloud|local)"/],
  ["cloud_base_branch", "field", /cloud_base_branch/],
  ["run_in_background", "field", /run_in_background/],
  ["resume", "field", /`resume`/],
  ["file_attachments", "field", /file_attachments/],
  // 模型与角色
  ["claude-slug", "model", /\bclaude-[a-z]+-\d/],
  ["grok-slug", "model", /\bgrok-\d/],
  ["gpt-slug", "model", /\bgpt-\d/],
  ["inherit-parent", "model", /inherit-parent/],
  ["auto-model", "model", /`auto`|`model`/],
  ["pstack-models.mdc", "model", /pstack-models\.mdc/],
  ["setup-pstack", "model", /setup-pstack/],
  // Cursor 路径
  [".cursor/skills", "path", /\.cursor\/skills/],
  [".cursor/rules", "path", /\.cursor\/rules|always-applied rule|\.mdc\b/],
  [".cursor/plugins", "path", /\.cursor\/plugins|\.cursor-plugin/],
  [".cursor/settings.json", "path", /\.cursor\/settings\.json/],
  ["agent-transcripts", "path", /agent-transcripts|\.cursor\/projects/],
  // Cursor 平台与云服务
  ["Cursor Automations", "platform", /Cursor Automation|api2\.cursor\.sh|\.cursor\/automations/],
  ["routine", "platform", /\broutine\b|update_state|SOURCE_THREAD_TS|SendToUser/],
  ["Slack", "platform", /\bSlack\b/],
  ["Bugbot", "platform", /Bugbot/],
  ["cloud agent", "platform", /[Cc]loud [Aa]gent/],
  [
    "built-in PR tool",
    "platform",
    /built-in PR tool|PR (dashboard|tool) in Cursor|Cursor.*\bPR tool\b/,
  ],
  ["/loop", "platform", /\/loop\b/],
  ["/plugin", "platform", /\/plugin\b|\/add-plugin\b/],
  ["/verify", "platform", /\/verify\b/],
  ["/visualize", "platform", /\/visualize\b/],
  ["create-skill", "platform", /\bcreate-skill\b/],
  ["tailscale", "platform", /\btailscale\b/i],
  ["Pele", "platform", /\bPele\b|pele@|pele\.run/],
  ["plan mode", "platform", /plan mode|Plan mode/],
  ["Custom Mode", "platform", /Custom Modes?/i],
  ["MCP", "platform", /\bMCP\b|\.mcp\.json/],
  ["webhook", "platform", /webhook/],
  // 依赖的其他 Cursor 插件
  ["cursor-team-kit", "cross-plugin", /cursor-team-kit/],
  ["control-ui", "cross-plugin", /control-ui/],
  ["control-cli", "cross-plugin", /control-cli/],
  ["deslop", "cross-plugin", /deslop/],
  ["gt", "cross-plugin", /`gt`|\bgt (command|CLI)\b|Graphite/],
  ["origin", "cross-plugin", /\borigin (CLI|command|tool)\b|command -v origin|`origin`/],
  // 脚本与外部运行时
  ["bun", "runtime", /\bbun\b|bun\.lock/],
  ["mise", "runtime", /\bmise\b/],
  ["tlc", "runtime", /\btlc\b|TLA\+/],
  ["java", "runtime", /\bjava\b|\.java\b/],
  ["gh", "runtime", /\bgh\b/],
  ["check-plan.mjs", "script", /check-plan/],
  ["watch-pr", "script", /watch-pr/],
  ["worktree-audit", "script", /worktree-audit/],
  ["log.sh", "script", /log\.sh|show-me-your-work\/scripts/],
  ["statechart", "script", /statechart/],
  ["bootstrap.ts", "script", /bootstrap\.ts/],
  [
    "视频渲染",
    "runtime",
    /silent landscape video|\bmp4\b|render (one|the) (silent )?(landscape )?video/i,
  ],
  [
    "性能测量",
    "runtime",
    /\buptime\b|\bnproc\b|\bpidstat\b|py-spy|node --cpu-prof|\bstrace\b|\bperf\b/,
  ],
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === ".DS_Store" || name === "node_modules") return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

// 脚本与配置也参与扫描。形式化验证语料的输出文件是生成物，扫描只会带来噪声，所以排除。
const TEXT = /\.(md|sh|mjs|cjs|js|ts|json|ya?ml|toml)$/;
const SKIP = /\/(test|corpus)\/|bun\.lock$|skills-lock\.json$/;
const isEntry = (path) =>
  (statSync(path).mode & 0o111) !== 0 || readFileSync(path).subarray(0, 2).toString() === "#!";
const scanned = walk(SOURCE)
  .map((path) => ({ path, rel: relPath(SOURCE, path) }))
  .filter(({ path, rel }) => !SKIP.test(`/${rel}`) && (TEXT.test(rel) || isEntry(path)))
  .map(({ path }) => path);
const files = scanned.filter((path) => path.endsWith(".md"));
const code = scanned.filter((path) => !path.endsWith(".md"));
const rows = [];
const found = new Map(TERMS.map(([key, cat]) => [key, { cat, count: 0, skills: new Set() }]));

for (const path of scanned) {
  const rel = relPath(SOURCE, path);
  const owner = rel.startsWith("skills/") ? rel.split("/")[1] : rel.split("/")[0];
  readText(path)
    .split("\n")
    .forEach((line, index) => {
      for (const [key, , re] of TERMS) {
        if (!re.test(line)) continue;
        found.get(key).count += 1;
        found.get(key).skills.add(owner);
        rows.push([key, rel, index + 1, line.trim().slice(0, 160)].join("\t"));
      }
    });
}

const argv = process.argv.slice(2);

function digestFor(key) {
  const lines = rows
    .filter((row) => row.split("\t")[0] === key)
    .map((row) => {
      const [, rel, , text] = row.split("\t");
      return `${rel}\t${text}`;
    })
    .sort((a, b) => a.localeCompare(b));
  return `sha256:${createHash("sha256").update(lines.join("\n")).digest("hex")}`;
}

if (argv.includes("--check-lock")) {
  const lockPath = join(ROOT, "port/audit.lock.json");
  if (!existsSync(lockPath)) {
    console.error("usage: vpx port/scan.mjs --check-lock（缺少 port/audit.lock.json）");
    process.exit(2);
  }
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  const problems = [];
  const lockKeys = new Set(Object.values(lock.items).map((item) => item.key));
  const currentKeys = new Set(TERMS.map(([key]) => key));
  for (const [id, item] of Object.entries(lock.items)) {
    if (!currentKeys.has(item.key)) {
      problems.push(`MISSING ${id} ${item.key}`);
      continue;
    }
    if (item.sourceDigest !== digestFor(item.key)) problems.push(`CHANGED ${id} ${item.key}`);
  }
  for (const key of currentKeys) {
    if (!lockKeys.has(key)) problems.push(`NEW ${key}`);
  }
  if (problems.length) {
    for (const problem of problems) console.log(problem);
    console.log(
      `${problems.length} 项需要重新审核，其余 ${Object.keys(lock.items).length} 项沿用。`,
    );
    process.exit(1);
  }
  console.log(`LOCK OK ${Object.keys(lock.items).length} 项，全部沿用。`);
  process.exit(0);
}

if (argv.includes("--check")) {
  const doc = argv[argv.indexOf("--check") + 1];
  if (!doc) {
    console.error("usage: vpx port/scan.mjs --check port/audit.md");
    process.exit(2);
  }
  const stale = [];
  let checked = 0;
  let current = null;
  const unmatched = [];
  for (const line of readFileSync(resolve(ROOT, doc), "utf8").split("\n")) {
    const header = line.match(/^### (CAP-\d+) (.+)$/);
    if (header) {
      const title = header[2].split("　")[0].replace(/`/g, "").toLowerCase();
      current =
        [...TERMS]
          .sort((a, b) => b[0].length - a[0].length)
          .find(
            ([key]) => title === key.toLowerCase() || title.startsWith(`${key.toLowerCase()} `),
          ) ?? null;
      if (!current) unmatched.push(`${header[1]} ${title}`);
    }
    if (!current || !(line.startsWith("- 使用位置") || line.startsWith("| 📍 使用位置 |")))
      continue;
    for (const [, rel, rawLine] of line.matchAll(/`([^`]+):(\d+)`/g)) {
      checked += 1;
      const path = join(SOURCE, rel);
      const text = existsSync(path)
        ? readFileSync(path, "utf8").split("\n")[Number(rawLine) - 1]
        : undefined;
      if (text === undefined) stale.push(`${rel}:${rawLine} 文件缺失`);
      else if (!current[2].test(text)) stale.push(`${rel}:${rawLine} 不再匹配 ${current[0]}`);
    }
  }
  for (const problem of stale) console.log(`FAIL ${problem}`);
  for (const header of unmatched) console.log(`SKIP ${header}`);
  console.log(
    stale.length
      ? `${stale.length}/${checked} 引用过期。按新上游基线重做审核。`
      : `${checked} 条引用全部成立。`,
  );
  process.exit(stale.length ? 1 : 0);
}

mkdirSync(dirname(TSV), { recursive: true });
writeFileSync(TSV, `${rows.join("\n")}\n`);
console.log(
  `source ${relative(ROOT, SOURCE)}  md ${files.length}  code ${code.length}  hits ${rows.length}`,
);
for (const cat of [
  "tool",
  "field",
  "model",
  "path",
  "platform",
  "cross-plugin",
  "runtime",
  "script",
]) {
  const entries = [...found].filter(([, value]) => value.cat === cat && value.count > 0);
  console.log(`\n## ${cat}`);
  for (const [key, value] of entries) {
    console.log(
      `  ${key}  n=${value.count}  skills=${[...value.skills].sort((a, b) => a.localeCompare(b)).join(",")}`,
    );
  }
  const missing = [...found]
    .filter(([, value]) => value.cat === cat && value.count === 0)
    .map(([key]) => key);
  if (missing.length) console.log(`  (无出现) ${missing.join(",")}`);
}
