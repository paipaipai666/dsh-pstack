# 破坏面清单

上游（Cursor 的 pstack）和 DSH CLI 都会在不打招呼的情况下改形状。改动的危险程度不由"改了几行"决定，而由"碰到哪一块"决定。这份清单给每一块写下：什么路径的改动会触发它、触发后必须确认什么、过去哪次事故证明了这一点。

`scripts/check-breaking.mjs` 读下面的机器块，从本次 diff 的文件列表里挑出命中的项，通常只有三到十项。它只输出清单，不判定对错：判定是 review 节点的事。

## 机器可读清单

<!-- checklist:begin -->
```json
[
  {
    "id": "runtime-vs-generated",
    "trigger": ["pstack/**", "runtime/**", "port/**"],
    "check": "生成树里每个生产脚本在 `runtime/` 都有同源实现，且 `pnpm run runtime:check` 通过；只改 `pstack/` 不会到用户手里",
    "history": "PR #6 与 #10：上游 statechart 的 janitor/kill 修复只进了生成树，用户装到的仍是旧脚本"
  },
  {
    "id": "preset-rows",
    "trigger": ["cordis.patch.yml", "src/**"],
    "check": "preset 行名、`static inject` 的服务名（尤其 `agentPresets`）在 headless profile 下仍能解析；`pstack-agent-preset-registry` 只在没有同名行时插入",
    "history": "b8acd20：headless 没有 agent-preset-registry，`pstack_subagent` 的独立 preset 全部 pending"
  },
  {
    "id": "dsh-api-surface",
    "trigger": ["src/**", "docs/fork/dsh-api-surface.json", "pnpm-workspace.yaml"],
    "check": "`node scripts/dsh-api-surface.mjs --write` 后快照的 diff 只含预期的增减；任何我们导入过的符号消失都要在 CHANGELOG 写清楚",
    "history": "0.2.2-rc.2 把 `SubagentActivationSpec` 拍平成顶层字段、删掉 `SubagentRuntime.list()`"
  },
  {
    "id": "dsh-version-pins",
    "trigger": ["pnpm-workspace.yaml", "package.json", ".github/workflows/**", "port/audit.lock.json", "port/audit.md"],
    "check": "`pnpm run dsh:pins` 通过：catalog、CI 安装版本、审计基线、`engines.dsh`、`port/audit.md` 必须是同一个版本",
    "history": "catalog 停在 rc.3 而 CI 安装 rc.5，编译面与验证面不同"
  },
  {
    "id": "port-patch-anchors",
    "trigger": ["port/patches/**", "port/dsh.md", "upstream/cursor-plugins/**"],
    "check": "每个 `Find/Replace` 的 Find 段能在上游文件里逐字命中；整段自然段而不是单句，否则上游改一个逗号就静默失效",
    "history": "补丁 Find 段不命中时生成器中止；改成单句后曾出现\"看似应用、实际没改\""
  },
  {
    "id": "upstream-source-digest",
    "trigger": ["upstream/cursor-plugins/**", "port/audit.lock.json", "docs/fork/AUDIT.md"],
    "check": "`vpx port/scan.mjs --check-lock` 通过，`sourceDigest` 指向的 commit 确实是本次同步的上游版本；`AUDIT.md` 的版本戳同时更新",
    "history": "审计锁与上游 commit 脱节时，68 项能力审计会对着旧代码下结论"
  },
  {
    "id": "gate-surface-touch",
    "trigger": ["scripts/**", ".github/**", "package.json", "pnpm-workspace.yaml", "vite.config.ts", "model/**"],
    "check": "PR 必须带维护者打的 `gate-approved` 标签；同时确认新逻辑本身有测试，而不是把检查改松",
    "history": "第二个真实翻车点：自动化 PR 可以改 `check-comments.mjs` 让自己变绿"
  },
  {
    "id": "release-pipeline",
    "trigger": [".github/workflows/release.yml", "package.json"],
    "check": "`npm trust github` 的 `--file` 只写文件名；推 main 时按包版本自动建缺失的 `v*` tag；版本递增与 CHANGELOG 段由 `check-version-bump.mjs` 把关",
    "history": "`--file .github/workflows/release.yml` 直接 404；tag 已存在时发布会报 EEXIST"
  },
  {
    "id": "compat-table",
    "trigger": ["package.json", "src/**", "port/release-compatibility.ts"],
    "check": "`vpx port/release-compatibility.ts` 重新生成 README / README.zh 的兼容表；`check-version-bump.mjs` 会校验表里出现当前版本",
    "history": "改了版本忘了重生成表，`Version bump` 检查直接失败"
  },
  {
    "id": "skill-frontmatter",
    "trigger": ["pstack/skills/**", "runtime/skills/**", "src/**"],
    "check": "每个 `SKILL.md` 的 name/description/allowed-tools 与 `tests/skill-sources.test.ts` 的期望一致；技能名 kebab-case",
    "history": "prepare 阶段把 `dsh-doc` 同步进 `.agents` 后，技能源测试失败"
  },
  {
    "id": "comment-gate",
    "trigger": ["src/**", "scripts/**", "tests/**"],
    "check": "没有新增解释性注释；只允许 `#!`、`/// <reference`、`// @ts-`、eslint/vitest 指令这类机器指令",
    "history": "用户明确要求注释留给代码本身表达；门禁见 `scripts/check-comments.mjs`"
  },
  {
    "id": "workflow-schema",
    "trigger": ["internal/workflow/**", "internal/worker/nodes.go", "internal/config/**"],
    "check": "`Validate` 的规则仍然覆盖：`nodes` 与 `instructions` 互斥、`agent: pi` 只能用 `session: new`、`on_exhausted.retry` 必须等维护者回复、回滚命令不得含 `git push` 或 `gh pr`",
    "history": "workflow-as-data 的边界就是这些规则；放松一条就等于让用户的流程定义可以静默跳过门禁"
  },
  {
    "id": "lease-fence",
    "trigger": ["internal/worker/**", "internal/lease/**", "cmd/issue-autosync/**"],
    "check": "落地仍是 `git push --atomic origin <branch>:refs/heads/<branch> <next>:<leaseRef>` 双 ref 围栏；租约释放推自己持有的 sha",
    "history": "第一版用 `--force-with-lease=<别的ref>`，它不检查无关 ref，围栏形同虚设"
  },
  {
    "id": "evidence-gate",
    "trigger": ["internal/workflow/**", "internal/worker/**"],
    "check": "没有 `verify_commands` 且节点里没有带 `evidence` 的 run 时仍拒绝启动；`DonePassedGate` 保持无条件",
    "history": "`GateBeforeDone` 带前置条件会真空成立；`general` profile 曾静默放行到 done"
  },
  {
    "id": "tla-model",
    "trigger": ["model/**", "internal/workflow/**", "internal/worker/**"],
    "check": "`make model` 全绿、`make model-teeth` 的两个负面配置仍然各自违反对应不变式；TLC 模块名与文件名一致、每 run 独立 `-metadir`",
    "history": "模型与实现脱节时，`LandedNeedsFreshGate` 会证明一个不存在的系统"
  },
  {
    "id": "task-log-privacy",
    "trigger": ["internal/tasklog/**", "internal/worker/**", ".gitignore"],
    "check": "任务日志只写 `/var/log/issue-autosync/task-logs`（0600），不入仓、不进 PR body；`.gitignore` 仍排除 `docs/fork/task-logs`",
    "history": "worker 曾把含主机信息的日志提交进公开仓库"
  }
]
```
<!-- checklist:end -->

## 怎么用

- 人工：改完代码跑 `node scripts/check-breaking.mjs --base origin/fork/main`，命中的项逐条自问"这条我确认了吗"。
- 自动化：`issue-autosync` 在 review 节点前把这份报告塞进提示，review 只针对命中的项给结论，未命中项不占用上下文。
- 加项原则：一项必须能从 diff 的文件路径判定；写不出触发路径的判断，留在 review 的常规提示里，不要放进来。