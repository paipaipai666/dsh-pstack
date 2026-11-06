/**
 * 能力自动化 runner（入口 playground/cases-run.mjs 经 Vite runnerImport 加载本文件）。
 *
 * 读取 playground/config.json（每个 provider 一层：apiKey + 模型 -> 思考等级），
 * 逐条能力用例：先校验路由属于本机部署，再按用例自动写 playground/.dsh/pstack-models.mdc，
 * 用 `dsh headless --json` 跑一次真实会话，解析事件流里的 tool_call / tool_result 做
 * 「能力级」断言（child 数量、route 互异、脚本输出等），最后输出 pass/fail 报告。
 *
 * 它只断言工具契约的可观察事实，不写死插件文案或 UI 内容；真实会话证据仍在
 * playground/.dsh/sessions 下（可用 zstdcat 复核）。
 *
 * 用法（经 playground/cases-run.mjs 用 Vite runnerImport 运行，或 vp run cases）：
 *   node playground/cases-run.mjs --list          # 列出用例与就绪状态（不跑模型）
 *   node playground/cases-run.mjs --check         # 校验配置+部署+路由，不跑模型
 *   node playground/cases-run.mjs                 # 跑全部可跑用例
 *   node playground/cases-run.mjs --case CASE-PANEL-01
 *
 * 前置：playground 至少启动过一次（playground/.dsh/cordis.patch.yml 存在），
 *       并复制 config.example.json 为 config.json，填入 provider 的 apiKey 与模型。
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(HERE);
const DSH_HOME = join(HERE, ".dsh");
const ROLE_FILE = join(DSH_HOME, "pstack-models.mdc");
const HOME_PATCH = join(DSH_HOME, "cordis.patch.yml");
const PROFILE_NAME = "pstack-headless";
const PROFILE_DIR = join(DSH_HOME, "profiles", PROFILE_NAME);
const REPORT_DIR = join(DSH_HOME, "cases-report");
const CONFIG_FILE = join(HERE, "config.json");
const DSH_BIN = process.env.DSH_BIN || "dsh";
const CASE_TIMEOUT = Number(process.env.PSTACK_CASE_TIMEOUT_MS ?? 180000);

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const opts = {
  list: argv.includes("--list"),
  check: argv.includes("--check") || argv.includes("--dry-run"),
  help: argv.includes("--help") || argv.includes("-h"),
  caseId: argValue("--case"),
  config: argValue("--config") ?? CONFIG_FILE,
};

function argValue(flag) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : undefined;
}

function die(message, code = 2) {
  console.error(`\n[run-cases] ${message}\n`);
  process.exit(code);
}

if (opts.help) {
  console.log(
    [
      "playground/cases-run.mjs — 移植能力自动化用例",
      "",
      "  --list            列出用例与就绪状态",
      "  --check           只校验配置/部署/路由（不跑模型）",
      "  --case <id>       只跑一条用例",
      "  --config <path>   配置文件，默认 playground/config.json",
      "",
      "环境变量：",
      "  PSTACK_CASE_TIMEOUT_MS       单用例超时，默认 180000",
      "  DSH_BIN                      dsh 可执行文件，默认 dsh",
    ].join("\n"),
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 配置：playground/config.json（每个 provider 一层：apiKey + 模型 -> 思考等级）
// ---------------------------------------------------------------------------

function expandModels(providerId, models) {
  const entries = [];
  if (Array.isArray(models)) {
    for (const model of models) {
      if (model === null || typeof model !== "object") {
        die(`config: provider "${providerId}" 的 models 数组项必须是对象`);
      }
      entries.push([String(model.id ?? "").trim(), model.efforts]);
    }
  } else if (models !== null && typeof models === "object") {
    for (const [id, efforts] of Object.entries(models)) entries.push([id.trim(), efforts]);
  } else {
    die(`config: provider "${providerId}" 缺少 models`);
  }
  const routes = [];
  for (const [model, rawEfforts] of entries) {
    if (!model) die(`config: provider "${providerId}" 有空的 model id`);
    const efforts = Array.isArray(rawEfforts)
      ? rawEfforts.map((e) => String(e).trim()).filter(Boolean)
      : [];
    const list = efforts.length > 0 ? efforts : [undefined];
    for (const effort of list) {
      routes.push({
        provider: providerId,
        model,
        effort,
        label:
          effort === undefined ? `${providerId}/${model}` : `${providerId}/${model} [${effort}]`,
      });
    }
  }
  return routes;
}

function loadConfig() {
  if (!existsSync(opts.config)) {
    die(
      [
        `未找到配置文件：${opts.config}`,
        "复制 config.example.json 为 config.json 后按本机真实 provider/model 填写：",
        "  cp playground/config.example.json playground/config.json",
      ].join("\n"),
    );
  }
  let doc;
  try {
    doc = JSON.parse(readFileSync(opts.config, "utf8"));
  } catch (error) {
    die(`${opts.config}: JSON 解析失败：${error instanceof Error ? error.message : String(error)}`);
  }
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    die(`${opts.config}: 顶层必须是对象`);
  }
  const rawProviders = doc.providers;
  if (rawProviders === null || typeof rawProviders !== "object" || Array.isArray(rawProviders)) {
    die(`${opts.config}: 缺少 providers 对象`);
  }
  const providers = new Map();
  const routes = [];
  for (const [providerId, provider] of Object.entries(rawProviders)) {
    if (provider === null || typeof provider !== "object") {
      die(`${opts.config}: providers.${providerId} 必须是对象`);
    }
    const apiKey = typeof provider.apiKey === "string" ? provider.apiKey.trim() : "";
    providers.set(providerId, { apiKey });
    routes.push(...expandModels(providerId, provider.models));
  }
  if (routes.length === 0) die(`${opts.config}: 没有解析出任何模型路由`);
  return { source: opts.config, providers, routes };
}

// ---------------------------------------------------------------------------
// 本机部署校验
// ---------------------------------------------------------------------------

function loadDeployment() {
  if (!existsSync(HOME_PATCH)) {
    die(
      [
        `未找到 ${HOME_PATCH}。`,
        "playground 尚未初始化：先运行 `vp run playground` 启动一次，让它同步宿主模型配置。",
      ].join("\n"),
    );
  }
  let entries;
  try {
    entries = yaml.load(readFileSync(HOME_PATCH, "utf8"));
  } catch (error) {
    die(`${HOME_PATCH}: YAML 解析失败：${error instanceof Error ? error.message : String(error)}`);
  }
  if (!Array.isArray(entries)) die(`${HOME_PATCH}: 顶层必须是数组`);
  const llm = entries.find((entry) => entry && entry.id === "llm-pi-ai");
  const defaults = entries.find((entry) => entry && entry.id === "agent-default-model");
  if (!llm || !llm.config || typeof llm.config.providers !== "object") {
    die(`${HOME_PATCH}: 缺少 llm-pi-ai.providers，无法校验路由`);
  }
  const providers = new Map();
  for (const [id, provider] of Object.entries(llm.config.providers)) {
    const models = new Map();
    for (const model of provider.models ?? []) {
      const efforts = new Set(Object.keys(model.reasoningEfforts ?? {}));
      models.set(model.id, efforts);
    }
    providers.set(id, {
      models,
      apiKeyEnv: typeof provider.apiKeyEnv === "string" ? provider.apiKeyEnv : undefined,
    });
  }
  const parent =
    defaults && defaults.config
      ? `${defaults.config.provider}/${defaults.config.model}`
      : "(unknown)";
  const parentProvider = defaults && defaults.config ? defaults.config.provider : undefined;
  return { providers, parent, parentProvider };
}

function validateRoutes(routes, deployment) {
  const problems = [];
  for (const route of routes) {
    const provider = deployment.providers.get(route.provider);
    if (!provider) {
      problems.push(
        `${route.label}: provider "${route.provider}" 不在部署中（有 ${[...deployment.providers.keys()].join(", ")}）`,
      );
      continue;
    }
    const efforts = provider.models.get(route.model);
    if (!efforts) {
      problems.push(`${route.label}: model "${route.model}" 不在 provider "${route.provider}" 下`);
      continue;
    }
    if (route.effort !== undefined && !efforts.has(route.effort)) {
      problems.push(
        `${route.label}: effort "${route.effort}" 不被该模型声明（有 ${[...efforts].join(", ") || "无"}）`,
      );
    }
  }
  if (problems.length > 0) {
    die(["允许路由里有本机部署不支持的路由：", ...problems.map((p) => `  - ${p}`)].join("\n"));
  }
}

/**
 * 把 config.json 里各 provider 的 apiKey 注入到部署声明的 apiKeyEnv 变量，
 * 并返回缺失项。父会话 provider 与每条路由的 provider 都需要可用 key。
 */
function prepareCredentials(config, deployment, routes) {
  const providerIds = new Set();
  if (deployment.parentProvider) providerIds.add(deployment.parentProvider);
  for (const route of routes) providerIds.add(route.provider);

  const missing = [];
  const notes = [];
  for (const providerId of providerIds) {
    const dep = deployment.providers.get(providerId);
    if (!dep) {
      missing.push(`provider "${providerId}" 不在本机部署中`);
      notes.push(`${providerId}=MISSING`);
      continue;
    }
    const apiKeyEnv = dep.apiKeyEnv;
    let apiKey = config.providers.get(providerId)?.apiKey ?? "";
    if (apiKey.startsWith("<") && apiKey.endsWith(">")) apiKey = "";
    if (!apiKey && apiKeyEnv && process.env[apiKeyEnv]) apiKey = process.env[apiKeyEnv];
    if (apiKeyEnv && !apiKey) {
      missing.push(`${providerId}: 缺少 apiKey（config.providers["${providerId}"].apiKey）`);
      notes.push(`${providerId}=MISSING`);
      continue;
    }
    if (apiKey && apiKeyEnv) process.env[apiKeyEnv] = apiKey;
    notes.push(`${providerId}=ok`);
  }
  return { missing, note: notes.join(", ") || "(无需 key)" };
}

// ---------------------------------------------------------------------------
// Headless profile
// ---------------------------------------------------------------------------

function ensureHeadlessProfile() {
  mkdirSync(join(PROFILE_DIR, "node_modules"), { recursive: true });
  const manifest = {
    name: "dsh-profile-pstack-headless",
    private: true,
    dependencies: { "@paipaipai666/dsh-pstack": `link:${REPO_ROOT}` },
    dsh: {
      profile: {
        bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-headless", "@paipaipai666/dsh-pstack"],
      },
    },
  };
  writeFileSync(join(PROFILE_DIR, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  mkdirSync(join(PROFILE_DIR, "node_modules", "@paipaipai666"), { recursive: true });
  const link = join(PROFILE_DIR, "node_modules", "@paipaipai666", "dsh-pstack");
  let linked = false;
  try {
    linked = lstatSync(link).isSymbolicLink() || lstatSync(link).isDirectory();
  } catch {
    linked = false;
  }
  if (!linked) {
    try {
      symlinkSync(REPO_ROOT, link, "dir");
    } catch (error) {
      die(
        `无法为 headless profile 链接 dsh-pstack：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 事件流解析
// ---------------------------------------------------------------------------

function parseEvents(stdout) {
  const events = [];
  for (const line of stdout.split("\n")) {
    const text = line.trim();
    if (!text) continue;
    try {
      events.push(JSON.parse(text));
    } catch {
      // 非 JSON 行（例如 loader 诊断混入 stdout）跳过
    }
  }
  return events;
}

function collectToolCalls(events) {
  const byId = new Map();
  for (const event of events) {
    if (event.type === "tool_call") {
      byId.set(event.callId, { callId: event.callId, tool: event.tool, input: event.input });
    } else if (event.type === "tool_result") {
      const call = byId.get(event.callId);
      if (call) call.result = event;
    }
  }
  return [...byId.values()];
}

// ---------------------------------------------------------------------------
// 用例注册：每个 cases/*.case.mjs 默认导出一个用例对象（import.meta.glob 动态注册）
// ---------------------------------------------------------------------------

const caseModules =
  typeof import.meta.glob === "function"
    ? import.meta.glob("./cases/*.case.mjs", { eager: true })
    : {};
const CASES = Object.values(caseModules)
  .map((entry) => entry?.default ?? entry)
  .filter((entry) => entry && typeof entry.build === "function" && typeof entry.id === "string")
  .sort((left, right) => left.id.localeCompare(right.id));

if (CASES.length === 0) {
  console.error(
    "[run-cases] 未加载到任何用例：import.meta.glob 需要经 Vite 模块运行器展开。\n" +
      "请用 `vp run cases`（内部走 playground/cases-run.mjs 的 runnerImport）。",
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// 执行
// ---------------------------------------------------------------------------

function withRoleFile(lines, run) {
  const previous = existsSync(ROLE_FILE) ? readFileSync(ROLE_FILE, "utf8") : null;
  try {
    const body = lines.length > 0 ? `${lines.join("\n")}\n` : "# case probe: no role lines\n";
    writeFileSync(ROLE_FILE, body);
    return run();
  } finally {
    if (previous !== null) writeFileSync(ROLE_FILE, previous);
    else rmSync(ROLE_FILE, { force: true });
  }
}

function runHeadless(prompt) {
  const result = spawnSync(DSH_BIN, ["--profile", PROFILE_NAME, "--json", prompt], {
    cwd: REPO_ROOT,
    env: { ...process.env, DSH_HOME },
    encoding: "utf8",
    timeout: CASE_TIMEOUT,
    maxBuffer: 32 * 1024 * 1024,
  });
  return {
    status: result.status,
    signal: result.signal,
    error: result.error,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function main() {
  const config = loadConfig();
  const { source, routes } = config;
  const deployment = loadDeployment();
  validateRoutes(routes, deployment);
  const credentials = prepareCredentials(config, deployment, routes);
  const missingCreds = credentials.missing;
  const credentialNote = credentials.note;

  const selected = opts.caseId ? CASES.filter((c) => c.id === opts.caseId) : CASES;
  if (opts.caseId && selected.length === 0) die(`未知用例 ${opts.caseId}；用 --list 查看`);

  if (opts.list) {
    console.log(`允许路由来源：${source}`);
    console.log(`父会话默认模型：${deployment.parent}`);
    console.log(`provider key：${credentialNote}`);
    console.log("");
    for (const c of CASES) {
      const built = c.build(routes);
      const state = built.skip ? `SKIP (${built.skip})` : "ready";
      console.log(`- ${c.id}  ${c.title}  -> ${state}`);
    }
    return 0;
  }

  if (opts.check) {
    console.log("[run-cases] 配置与部署校验通过。");
    console.log(`  允许路由来源：${source}`);
    console.log(`  父会话默认模型：${deployment.parent}`);
    console.log(`  路由：${routes.map((r) => r.label).join(", ")}`);
    console.log(`  provider key：${credentialNote}`);
    for (const c of selected) {
      const built = c.build(routes);
      console.log(`  - ${c.id}: ${built.skip ? `SKIP (${built.skip})` : "ready"}`);
    }
    return 0;
  }

  if (missingCreds.length > 0) {
    die(
      [
        "缺少 provider key：",
        ...missingCreds.map((item) => `  - ${item}`),
        `在 ${opts.config} 的对应 provider 下填 apiKey 后重跑。`,
      ].join("\n"),
    );
  }

  ensureHeadlessProfile();

  const results = [];
  for (const c of selected) {
    const built = c.build(routes);
    if (built.skip) {
      results.push({ id: c.id, title: c.title, status: "SKIP", detail: built.skip });
      console.log(`- ${c.id} SKIP  ${built.skip}`);
      continue;
    }
    process.stdout.write(`- ${c.id} 跑… `);
    const outcome = withRoleFile(built.roleLines, () => {
      const run = runHeadless(built.prompt);
      const events = parseEvents(run.stdout);
      const calls = collectToolCalls(events);
      const final = events.find((e) => e.type === "final");
      const verify = built.verify({ calls, events, final, run });
      const completed = run.status === 0 && final?.reason?.kind === "completed";
      if (!completed && verify.ok) {
        return bad(
          `会话未正常完成（exit=${run.status}, reason=${final?.reason?.kind ?? "无 final"}）`,
        );
      }
      return verify;
    });
    const status = outcome.ok ? "PASS" : "FAIL";
    results.push({ id: c.id, title: c.title, status, detail: outcome.detail });
    console.log(`${status}  ${outcome.detail}`);
  }

  const reportPath = writeReport(results, { source, routes }, deployment);
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n报告：${reportPath}`);
  console.log(
    `结果：${results.filter((r) => r.status === "PASS").length} pass / ${failed} fail / ${results.filter((r) => r.status === "SKIP").length} skip`,
  );
  return failed > 0 ? 1 : 0;
}

function writeReport(results, routesInfo, deployment) {
  mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const lines = [
    "# 能力自动化用例报告",
    "",
    `- 时间：${new Date().toISOString()}`,
    `- 允许路由来源：${routesInfo.source}`,
    `- 父会话默认模型：${deployment.parent}`,
    `- 路由：${routesInfo.routes.map((r) => r.label).join(", ")}`,
    "",
    "| 用例 | 能力 | 结果 | 说明 |",
    "|---|---|---|---|",
    ...results.map((r) => `| ${r.id} | ${r.title} | ${r.status} | ${escapeCell(r.detail)} |`),
    "",
    "> 真实会话证据在 `playground/.dsh/sessions/**/session.v4.jsonl.zstd`；报告只记能力级可观察结果。",
    "",
  ];
  const body = lines.join("\n");
  const path = join(REPORT_DIR, `report-${stamp}.md`);
  writeFileSync(path, body);
  writeFileSync(join(REPORT_DIR, "latest.md"), body);
  return path;
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

try {
  process.exitCode = main();
} catch (error) {
  die(error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error), 1);
}
