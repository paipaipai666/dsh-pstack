<div align="center">
  <img src="./assets/logo.png" width="144" alt="dsh-pstack logo" />

  <h1>dsh-pstack</h1>

  <p>
    <strong>把 pstack 的严格代理工作流带进 DeepSeek Harness</strong>
  </p>

  <p><a href="./README.md">English</a> · 中文</p>

  <p>
    <a href="https://npmx.dev/package/dsh-pstack"><img src="https://img.shields.io/npm/v/dsh-pstack?style=flat-square&colorA=080f12&colorB=1fa669" alt="npm version" /></a>
    <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/dsh-%3E%3D0.2.2--alpha.3-1f6feb?style=flat-square" alt="dsh >=0.2.2-alpha.3" /></a>
    <a href="https://github.com/cursor/plugins/tree/main/pstack"><img src="https://img.shields.io/badge/pstack-0.15.36-d97706?style=flat-square" alt="pstack 0.15.36" /></a>
    <a href="https://github.com/l246804/dsh-pstack/blob/main/LICENSE"><img src="https://img.shields.io/github/license/l246804/dsh-pstack?style=flat-square&colorA=080f12&colorB=1fa669" alt="license" /></a>
    <a href="https://www.jsdocs.io/package/dsh-pstack"><img src="https://img.shields.io/badge/jsdocs-reference-080f12?style=flat-square&colorA=080f12&colorB=1fa669" alt="JSDoc reference" /></a>
  </p>

  <table>
    <tr>
      <td align="center"><strong>58</strong><br /><sub>pstack 技能</sub></td>
      <td align="center"><strong>23</strong><br /><sub>playbook</sub></td>
      <td align="center"><strong>5</strong><br /><sub>原生工具</sub></td>
      <td align="center"><strong>2</strong><br /><sub>agent preset</sub></td>
      <td align="center"><strong>5</strong><br /><sub>随包脚本</sub></td>
    </tr>
  </table>

  <p>
    <a href="#quick-start">🚀 快速开始</a> ·
    <a href="#️-常用命令">⌨️ 常用命令</a> ·
    <a href="#-能力">🧩 能力</a> ·
    <a href="#-可选-dsh-插件">🔌 可选插件</a> ·
    <a href="#️-仍存在的缺口">⚠️ 仍存在的缺口</a> ·
    <a href="#-兼容性">📦 兼容性</a>
  </p>
</div>

---

`dsh-pstack` 将 [pstack](https://github.com/cursor/plugins/tree/main/pstack) 移植到 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH），保留其技能、playbook 与参考文档，并提供原生技能路由、按角色配置模型、子代理和 Node.js 脚本。

完整的移植审查见[能力对照表](./pstack/README.md)。

> [!IMPORTANT]
> 要求 DSH `>=0.2.2-alpha.3`、Node.js `>=24.21.1`。旧版 DSH 请根据[兼容性](#-兼容性)选择对应的插件版本。

<a id="quick-start"></a>

## 🚀 快速开始

1. **安装插件。**

   ```sh
   dsh plugin --profile web add dsh-pstack
   ```

   也可以在 Web 或 Desktop 的「插件」页面安装。

2. **重启对应的 profile，或新开一个 Session。**

3. **初始化角色模型路由。**

   ```text
   /setup-pstack
   ```

   该命令将可用路由写入 `$DSH_HOME/pstack-models.mdc`。缺少此文件时，角色继承父级模型。

4. **开始工作流。**

   ```text
   /poteto-mode
   ```

   如果希望整段会话都保持该模式，新建 Session 时选择 **pstack** agent preset。

### ⚙️ 配置角色模型

初始化后，打开 **插件 → 已安装插件 → dsh-pstack → 配置**，即可查看或修改路由。

<p align="center">
  <img src="assets/pstack-config-entry.png" width="800" alt="插件配置入口" />
</p>

## ⌨️ 常用命令

| 工作流 | 命令 |
|---|---|
| 规划与实现 | `/poteto-mode`、`/architect`、`/arena`、`/swarm` |
| 理解与调查 | `/how`、`/why`、`/teach` |
| 验证 | `/create-verification-skill`、`/statechart` |
| 审查与维护 | `/show-me-your-work`、`/retro`、`/docs-drift` |

## 🧩 能力

### 🛠️ 原生工具

| 工具 | 作用 |
|---|---|
| `pstack_skill` | 按名称加载隐藏的 pstack 技能及其相对资源。 |
| `pstack_models` | 列出可用的 provider、model 和 reasoning effort。 |
| `pstack_roles` | 展示角色 shape 与自动面板状态，确保委派时使用正确的参数。 |
| `pstack_doctor` | 报告缺失的外部命令、随包脚本与角色配置文件。 |
| `pstack_subagent` | 应用角色路由与 agent preset，支持并行子代理。 |
| `pstack_script` | 用 Node.js 运行 `check-plan`、`watch-pr`、`worktree-audit`、`log` 或 `statechart`。 |

`pstack` preset 用于让 `poteto-mode` 在整段会话中常驻；`poteto-agent` preset 用于实现型委派，`comment-sicko` preset 用于只读评论审查。

> [!CAUTION]
> `pstack_script` 运行前会请求 the agent harness 审批服务；没有应答者时按拒绝处理。
> 它仍绕过文件系统沙箱，请将其视为受信入口。

### 📚 额外技能

随包提供六个独立于 pstack 维护的技能。

| 技能 | 来源 | 作用 |
|---|---|---|
| `writing-for-agents` | `vendored` | 编写技能与清晰的 agent 文档。 |
| `retro` | `vendored` | 只读复盘 agent 环境，不修改仓库。 |
| `decision-write` | `authored` | 创建、落地和取代决策记录。 |
| `decision-audit` | `authored` | 审计决策记录状态与关联关系。 |
| `setup-project-docs` | `authored` | 搭建可持续维护的项目文档。 |
| `docs-drift` | `authored` | 检查文档漂移并修复获批项。 |

vendored 技能的来源与哈希记录在 [`skills/skills-lock.json`](./skills/skills-lock.json)。

## 🔌 可选 DSH 插件

可选插件用于扩展特定工作流，安装 dsh-pstack 时无需一并安装。

要启用插件，请在 **插件 → 添加插件** 中选择对应的包，然后重启 profile。

| 使用场景 | 插件 | 限制与冲突 |
|---|---|---|
| worktree 与 GitHub PR | `@deepseek-ai/dsh-experimental-forge-bundle` | 提供 **Change requests & worktrees** 开关和 `create_worktree`，GitHub 状态需要已登录的 `gh`。 |
| 历史会话 | `@deepseek-ai/dsh-experimental-session-search` | 只读，要求 `cwd` 完全相同；子代理 transcript 覆盖范围未证实。 |
| 浏览器验证 | `@deepseek-ai/dsh-browser-use` 与一个 provider | 每个 Session 使用一个 provider，截图需要支持图像的模型，不支持录屏。 |
| 桌面验证 | `@deepseek-ai/dsh-cua-bundle` | 仅支持 macOS PTC Session，Windows 支持尚不完整，不支持录屏。 |
| 持久终端 | `@deepseek-ai/dsh-experimental-terminal-bundle` | 六个持久 shell 与 REPL 工具，不支持 GUI 控制或录屏。 |
| MCP 集成 | `@deepseek-ai/dsh-mcp-client` | 默认无 server，需要显式配置；不会自动发现证据类别。 |
| agent team | `@deepseek-ai/dsh-experimental-agent-team-profile` | 与 `pstack_subagent` 冲突；没有 pstack 的 PR frontier、ledger 或 stack verdict。 |
| 自主循环 | `@deepseek-ai/dsh-experimental-ralph-bundle` | 每轮使用新子代理，不提供同一 Session 的常驻循环或事件 watcher。 |

多数包随 DSH 提供，`@deepseek-ai/dsh-cua-bundle` 按需安装。除 MCP client 外，以上插件均为实验性插件。

### 🌐 浏览器 provider

为 `@deepseek-ai/dsh-browser-use` 选择一个 provider：

- `@deepseek-ai/dsh-experimental-browser-use-stagehand-native`：还需要 Chromium 和受支持的非 DeepSeek 模型。
- `@deepseek-ai/dsh-experimental-browser-use-playwright-mcp`
- `@deepseek-ai/dsh-experimental-browser-use-chrome-devtools-mcp`

不同 provider 的工具名与 selector 不同。浏览器和桌面控制各自使用一个 provider 槽。

配置页默认推荐 Change requests & worktrees 和会话搜索，不会自动启用任何插件。Agent Teams 仅作为冲突警告，不属于推荐项。

> [!WARNING]
> Agent Teams 与 `pstack_subagent` 只能二选一。Agent Teams 会禁用 DSH 原生子代理工具。

未启用可选插件时，依赖它的步骤会标记为 skipped 或 blocked，不会标记为通过。没有 forge bundle 时通过 `bash` 使用 `gh` 与 `git worktree add`。安装与降级方案见 [DSH 适配文档](./pstack/harness/docs/harness/dsh.md#optional-plugins)。

## ⚠️ 仍存在的缺口

即使启用所有推荐插件，以下限制仍然存在。

| 领域 | 限制 |
|---|---|
| Cursor 平台服务 | 不支持 Automations、Cursor webhook、`SendToUser`、云代理和持久云端 Projects。 |
| Bugbot | 无法启动、配置或等待 Bugbot；已有 Bugbot 评论仍可作为 PR review 处理。 |
| PR 编排 | 没有模型侧变更请求工具，也没有 Agent Teams 的 PR frontier 与 ledger；`watch-pr` 仍提供 stack verdict。 |
| Custom Mode | 没有常驻根 `poteto-mode` 或 Option+Enter 开关；每个任务需调用 `/poteto-mode`。 |
| 事件驱动循环 | 不订阅 forge 事件；本地 goal、定时任务和 watcher 并非等价替代。 |
| 视频证据 | 没有内置录屏与逐帧验证，需要外部录屏或 FFmpeg 工具。 |
| 桌面覆盖 | computer use 仅支持 macOS PTC Session，Windows 支持尚不完整。 |
| MCP 发现 | 不会自动发现证据类别，需要显式配置并识别 MCP 工具。 |

## 📦 兼容性

每行列出最新兼容的 dsh-pstack 发布版本及其包含的 pstack 版本。较新的 DSH 兼容分界排在上方。

| DSH 版本 | 最新兼容的 dsh-pstack 发布版本 | 包含的 pstack 版本 |
|---|---|---|
| `0.2.2-alpha.3` 及更新版本 | `v0.3.0-beta.1` | `0.15.36` |
| `0.2.2-alpha.2` 及更早版本 | `v0.2.1` | `0.15.36` |

DSH 出现破坏性更新并产生新的兼容分界时，追加一行。

## 💛 鸣谢

- [pstack](https://github.com/cursor/plugins/tree/main/pstack) 由 Lauren Tan 与 Cursor 团队设计并开源。`poteto-mode`、23 个 playbook 和 24 条 principle 都来自上游。
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 由 DeepSeek 团队提供。DSH 的插件、bundle、agent preset、subagent 和工具宿主接口让这次移植能以原生工具落地。
- [mattpocock/skills](https://github.com/mattpocock/skills) 提供 vendored 的 `writing-for-agents` 与 `retro`。

本项目是社区移植，不是 Cursor 或 DeepSeek 官方发行。

## 📄 License

本仓原创代码与文档采用 [MIT License](./LICENSE) © [leiwang](https://github.com/l246804)。上游项目及 vendored 技能保留各自的许可证与声明。
