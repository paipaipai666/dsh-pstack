# dsh-pstack 插件审查

审查对象：`paipaipai666/dsh-pstack`，`fork/main` 提交 `1733187`
上游基线：`cursor/plugins` 的 pstack `0.15.36`，提交 `ae5650f`
审查方式：只读审查，对照上游资产、当前源码、测试、CI 和安装态

## Overview

当前 fork 已经具备完整的上游 pstack 资产，核心调用层已经改成 the agent harness 的接口，并且有 Linux、Windows 和隔离安装三条 CI 验证路径。它不是“能装但跑不起来”的移植版本。

审查结论是“结构完整、可以继续维护”，但仍有 2 个会影响实际使用的高优先级缺口，集中在运行时文本转译的覆盖范围，以及审批服务缺失时的运行降级。

## Key Concepts

- 生成树 `pstack/pstack/` 保留上游 pstack 原文，用于同步和审计。
- 运行时适配层 `src/internal/native-text.ts` 在 skill provider 返回内容时翻译 Cursor 名称。
- `pstack_skill` 是隐藏技能加载器，负责按名称加载 `SKILL.md` 和相对资源。
- `pstack_subagent` 负责角色路由、子代理 preset 和并行委派。
- `pstack_script` 负责五个随包脚本，并在运行前请求 Host 审批。
- `pstack` preset 是常驻 `poteto-mode`，`poteto-agent` 和 `comment-sicko` 是委派 preset。

## How It Works

1. DSH 加载 `dsh-pstack` bundle，`cordis.patch.yml` 注册 6 个原生工具、3 个 preset 和 1 个 skill provider。
2. 用户输入 `/poteto-mode` 或选择 `pstack` preset，模型读取 `poteto-mode` 技能。
3. `poteto-mode` 通过 `pstack_skill` 加载 `how`、`why`、`architect` 等隐藏技能，或通过 `pstack_subagent` 派发子代理。
4. `pstack_subagent` 按 `$DSH_HOME/pstack-models.mdc` 解析角色，启动子代理并转发完成通知。
5. `pstack_script` 在执行 `check-plan`、`watch-pr`、`worktree-audit`、`log`、`statechart` 前请求审批。
6. `pstack_doctor` 检查外部命令、随包脚本和角色文件。

## Where Things Live

| 路径 | 职责 |
|---|---|
| `src/index.ts` | bundle 主入口和工具注册 |
| `src/subagent.ts` | `pstack_subagent`、角色计划、深度与子代理启动 |
| `src/skill.ts` | `pstack_skill`、相对资源读取、skill 输出渲染 |
| `src/script.ts` | `pstack_script`、审批、前后台执行 |
| `src/doctor.ts` | `pstack_doctor` 预检 |
| `src/internal/skill-provider.ts` | skill 索引和 `toDshText` 接入点 |
| `src/internal/native-text.ts` | Cursor 名称到 DSH 名称的运行时转译 |
| `cordis.patch.yml` | bundle 行、三个 preset、`maxDepth: 3` |
| `pstack/pstack/` | 上游 0.15.36 生成树，58 skills、23 playbooks、24 principles |
| `tests/` | 22 个测试文件，约 138 个用例 |

## Findings

| 级别 | 发现 | 证据 | 影响 | 建议 |
|---|---|---|---|---|
| **P1** | `pstack_skill` 的 `resource` 读取没有走 `toDshText` | `src/skill.ts:153` 直接 `readFile` 返回原文；`pstack_skill` 的 `resource` 是加载 playbook/reference 的主路径 | 模型通过 `pstack_skill` 读 playbook 时仍会看到 `Task`、`subagent_type`、`.cursor` 和 Cursor 模型 slug | 在 `readSkillResource` 返回前调用 `toDshText`，并加资源级测试 |
| **P1** | `poteto-agent` 子代理读取的是原始 `POTETO_MODE_SKILL_PATH` | `src/subagent.ts:445-449` 把绝对路径注入子代理 prompt；子代理用 `read` 读取文件，绕过 skill provider 的转译 | 委派子代理看到 Cursor 版 `poteto-mode` 正文，可能出现错误的 Task/subagent_type 调用 | 注入一份转译后的临时文件路径，或要求子代理通过 `pstack_skill` 加载 `poteto-mode` |
| **P1** | `pstack_script` 在缺少审批服务时整体 fail closed | `src/script.ts` 的 `getApproval` 为 undefined 且 `requireApproval` 默认 true 时直接抛错 | headless、自动化或没有审批 answerer 的 profile 无法运行任何 pstack 脚本 | 为 headless 提供显式 machine answerer 或配置开关，同时保留安全默认 |
| **P1** | `pstack_doctor` 的命令探测在真实 Host 中未验证，当前实现使用 `execFileSync` 的管道 IO | `src/doctor.ts:65-72`；用安装后的 `doctor.mjs` 调用 `runCommandVersion("git")` 返回 undefined，而 shell 中 `git --version` 正常 | 如果 DSH Host 也限制子进程管道，doctor 会误报所有命令缺失，playbook 会被错误拦截 | 在真实 Desktop Host 跑一次 doctor；改用可捕获 stderr 且不依赖管道的执行方式 |
| **P2** | `pstack_doctor` 对 `java -version` 可能误报缺失 | `runCommandVersion` 使用 `stdio: ["ignore", "pipe", "ignore"]`，只读 stdout；Java 版本输出到 stderr | 用户看到 java 缺失，但实际已安装，导致 `/statechart` 被误判不可用 | 捕获 stderr，或对命令做 stderr 合并 |
| **P2** | `pstack_doctor` 不检查 `gh` 登录状态和可选插件启用状态 | 当前只检查命令是否存在、脚本是否存在、角色文件是否存在 | `gh` 存在但未登录时，PR playbook 仍会失败；可选插件缺失也不会被提前发现 | 增加 `gh auth status` 和插件管理器查询 |
| **P2** | `pstack` preset 只有静态配置和 boot 验证，没有真实 session 测试 | CI 的 install smoke 只做 `--dump-config`，没有创建带 preset 的会话 | preset 的 persona、工具集和实际会话行为未被端到端证明 | 增加一个不依赖模型回复的 session 创建 smoke，或真实模型 e2e |
| **P3** | 上游资产测试只做数量与名称检查 | `tests/upstream-parity.test.ts` 校验 58/23/24/2/11 和 skill 目录名 | 上游文件内容发生变化但数量不变时不会报警 | 记录上游提交树哈希或关键文件的 hash，做 drift 检查 |
| **P3** | 没有覆盖率门槛 | CI 只跑 `vp test`，没有 coverage gate | 新增代码可能漏测，回归靠用例数量而非覆盖 | 接入 `vitest --coverage`，先设合理阈值 |
| **P3** | `pstack_doctor` 顺序执行六个命令，单次最长 5 秒 | `runCommandVersion` 每个命令独立 `timeout: 5_000` | 六个命令最坏约 30 秒，交互式体验差 | 并行探测或缩短超时 |

## Quality Evidence

- 最新 CI 全绿，运行 [42164834366](https://github.com/paipaipai666/dsh-pstack/actions/runs/42164834366)
  - Linux typecheck、build、test、generated-tree check、tarball
  - Windows typecheck、build、script smoke
  - Linux Install smoke 使用真实 `@deepseek-ai/dsh@0.2.2-rc.1` 安装 tarball 到隔离 `DSH_HOME`
- 资产盘点与上游一致，58 skills、23 playbooks、24 principles、2 agents、11 guide pages
- 测试规模 22 个文件、约 138 个用例

## Recommendation

先修 P1 的两个转译盲区，再处理 `pstack_script` 的 headless 审批降级。P1 修复应只补测试和运行时路径，不扩大功能面。P2 可以作为下一轮维护项，不需要现在重构架构。

## Fix status

修复提交 `61a4fa4` 已处理以下两项：

- `pstack_skill` 的 `resource` 读取现在经过 `toDshText`，并新增资源级测试。
- `poteto-agent` 的委派 prompt 改为调用 `pstack_skill` 加载 `poteto-mode`，不再注入原始 `SKILL.md` 路径；旧 `POTETO_MODE_SKILL_PATH` 已移除。
- `pstack_doctor` 改用 `spawnSync` 同时读取 stdout 和 stderr，并增加真实可执行文件版本探测测试。

`pstack_script` 的 headless 审批策略仍是待决策项，当前保持 fail-closed 安全默认。
