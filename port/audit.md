# pstack 能力审核

本文件是本轮 0→1 的审核记录。事实按下方基线取证，处置结论由你确认。审核完成后，本文件作为插件实现的依据。

## 本轮基线

- DSH：`@deepseek-ai/dsh` 0.2.2-rc.1。
- 能力基线：DSH Web profile 的标准模式。headless 只用于 playground 自动化，不参与能力判定。
- pstack：`upstream/cursor-plugins` 提交 `ae5650febf4320793844c12c4adaa937f417f8da`，插件版本 0.15.36。
- 审核日期：2026-11-05。
- 工具清单取自运行时 `Tool.listTools`。官方插件状态取自当前 Web profile 的 `dsh.profile.bundles`。
- `list_subagent_models` 由 `@deepseek-ai/dsh-tool-subagent` 的 `modelDiscovery` 注册。`modelDiscovery` 为 false 时工具根本不注册，不是隐藏或空列表。默认 false，Web 与 Desktop 标准预设设为 true，headless、SDK、ACP 不包含。
- `subagent` 的 `agent_preset` 由 `allowedAgentPresets` 开启。预设是 Cordis 插件组合，子代理启动时按所选预设挂载，系统提示与工具随组合加载。
- 扫描器：`vpx port/scan.mjs` 输出 `.audit/scan/capability-scan.tsv`，覆盖 136 个 Markdown 文件与 50 个脚本或配置文件。`vpx port/scan.mjs --check port/audit.md` 校验本文件引用的行号。

## 处置状态

本轮已确认处置 68 项。

- `直接映射`：DSH 标准模式已经提供。
- `官方插件`：启用 DSH 随附的官方插件即可。
- `插件实现`：本插件需要开发，按 `插件要求与验收` 实现。
- `舍弃`：不实现，不宣称等价。

需要补充意见时，在审核清单的 `备注` 列写。

## 审核看板

| 指标 | 数值 |
|:--|--:|
| 能力总数 | 68 |
| 已确认处置 | 68 |
| 待确认处置 | 0 |
| 技能 | 58 |
| 脚本入口 | 5 |
| 引用校验 | 234 |
| 🟢 直接映射 | 40 |
| 🔵 官方插件 | 3 |
| 🟠 插件实现 | 19 |
| 🔴 舍弃 | 6 |

`脚本入口` 只统计随包可执行入口（check-plan、watch-pr、worktree-audit、log、statechart），不含 Java 测试辅助、Cursor Automations 等运行时能力项。

| 分类 | 能力 | 推荐分布 |
|:--|--:|:--|
| [A 工具](#cat-a) | 12 | 🟢 直接映射 8 · 🟠 插件实现 3 · 🔴 舍弃 1 |
| [B 子代理字段](#cat-b) | 10 | 🟢 直接映射 6 · 🟠 插件实现 4 |
| [C 模型与角色](#cat-c) | 7 | 🟢 直接映射 2 · 🟠 插件实现 5 |
| [D 路径与历史](#cat-d) | 5 | 🟢 直接映射 4 · 🔴 舍弃 1 |
| [E Cursor 平台](#cat-e) | 14 | 🟢 直接映射 8 · 🔵 官方插件 2 · 🟠 插件实现 3 · 🔴 舍弃 1 |
| [F 其他 Cursor 插件](#cat-f) | 6 | 🔵 官方插件 1 · 🟠 插件实现 3 · 🔴 舍弃 2 |
| [G 运行时与脚本](#cat-g) | 14 | 🟢 直接映射 12 · 🟠 插件实现 1 · 🔴 舍弃 1 |

## 按推荐分组

| 推荐 | 数量 | 编号 |
|:--|--:|:--|
| 🟢 直接映射 | 40 | [CAP-002](#cap-002) [CAP-003](#cap-003) [CAP-005](#cap-005) [CAP-006](#cap-006) [CAP-007](#cap-007) [CAP-008](#cap-008) [CAP-009](#cap-009) [CAP-010](#cap-010) [CAP-014](#cap-014) [CAP-018](#cap-018) [CAP-019](#cap-019) [CAP-020](#cap-020) [CAP-021](#cap-021) [CAP-022](#cap-022) [CAP-026](#cap-026) [CAP-027](#cap-027) [CAP-030](#cap-030) [CAP-031](#cap-031) [CAP-032](#cap-032) [CAP-034](#cap-034) [CAP-037](#cap-037) [CAP-038](#cap-038) [CAP-040](#cap-040) [CAP-042](#cap-042) [CAP-043](#cap-043) [CAP-044](#cap-044) [CAP-045](#cap-045) [CAP-047](#cap-047) [CAP-054](#cap-054) [CAP-055](#cap-055) [CAP-056](#cap-056) [CAP-057](#cap-057) [CAP-058](#cap-058) [CAP-059](#cap-059) [CAP-060](#cap-060) [CAP-061](#cap-061) [CAP-062](#cap-062) [CAP-063](#cap-063) [CAP-064](#cap-064) [CAP-067](#cap-067) |
| 🔵 官方插件 | 3 | [CAP-041](#cap-041) [CAP-046](#cap-046) [CAP-050](#cap-050) |
| 🟠 插件实现 | 19 | [CAP-001](#cap-001) [CAP-004](#cap-004) [CAP-011](#cap-011) [CAP-013](#cap-013) [CAP-015](#cap-015) [CAP-016](#cap-016) [CAP-017](#cap-017) [CAP-023](#cap-023) [CAP-024](#cap-024) [CAP-025](#cap-025) [CAP-028](#cap-028) [CAP-029](#cap-029) [CAP-035](#cap-035) [CAP-039](#cap-039) [CAP-048](#cap-048) [CAP-049](#cap-049) [CAP-051](#cap-051) [CAP-065](#cap-065) [CAP-068](#cap-068) |
| 🔴 舍弃 | 6 | [CAP-012](#cap-012) [CAP-033](#cap-033) [CAP-036](#cap-036) [CAP-052](#cap-052) [CAP-053](#cap-053) [CAP-066](#cap-066) |

`CAP-066` 视频渲染延期（deferred），不计入本轮实现范围。

## 字段说明

- 🟢 直接映射：DSH Web 标准模式已有对应工具或行为。
- 🔵 官方插件：启用 DSH 随附的官方插件可以补足。
- 🟠 插件实现：需要本插件开发。
- 🔴 舍弃：没有可用的等价能力，不实现。
- ⚪ 待取证：证据不足，需要下一轮确认。
- 💡 推荐：每项给出推荐方案、具体做法和理由，处置以审核结果为准。
- ⚔️ 冲突：同一能力有多套入口时，各入口的重叠与建议主路径。
- 🚧 最终遗留：按推荐方案补足后仍无法消除的限制。

每个小节按事实、缺口、插件要求、冲突、最终遗留、推荐的顺序排列。先知道插件会提供什么，再读冲突，避免遇到尚未介绍的工具名。

## 待确认

当前无待确认项。

<a id="审核清单"></a>

## 审核清单

`处置` 列记录审核结果。未确认项保持 `待审核`，不进入实现。`编号` 可以点击，跳到下面的详细小节。

分类入口：[A 工具](#cat-a) · [B 子代理字段](#cat-b) · [C 模型与角色](#cat-c) · [D 路径与历史](#cat-d) · [E Cursor 平台](#cat-e) · [F 其他 Cursor 插件](#cat-f) · [G 运行时与脚本](#cat-g)

| 编号 | 能力 | 推荐 | 关键缺口 | 处置 | 备注 |
|---|---|---|---|---|---|
| [CAP-001](#cap-001) | Task 子代理调用 | 🟠 插件实现 | 没有一次调用接收全部 Cursor 字段 | 插件实现 | |
| [CAP-002](#cap-002) | 结构化提问 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-003](#cap-003) | 待办清单 | 🟢 直接映射 | 没有跳过状态，也没有增量合并 | 直接映射 | |
| [CAP-004](#cap-004) | 技能调用与路由 | 🟠 插件实现 | 被 `disable-model-invocation` 隐藏的技能不能由模型通过 `skill` 工具加载，也没有专用加载工具 | 插件实现 | |
| [CAP-005](#cap-005) | 读取文件 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-006](#cap-006) | 写入文件 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-007](#cap-007) | 编辑文件 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-008](#cap-008) | 内容搜索 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-009](#cap-009) | 路径搜索 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-010](#cap-010) | 命令执行 | 🟢 直接映射 | `bash` 不保留交互式 TTY 与工作目录状态 | 直接映射 | |
| [CAP-011](#cap-011) | Cursor 内置技能创作 | 🟠 插件实现 | 没有内置的技能创作流程与描述优化循环 | 插件实现 | |
| [CAP-012](#cap-012) | 可视化图表命令 | 🔴 舍弃 | 没有开箱即用的图表命令；社区 `@nagi-ovo/dsh-visualize` 已记录在 `port/dsh.md`，本包不依赖 | 舍弃（社区包已记录） | |
| [CAP-013](#cap-013) | 子代理类型 | 🟠 插件实现 | 默认 profile 的 `subagent` schema 不含 `agent_preset` | 插件实现 | |
| [CAP-014](#cap-014) | 通用子代理 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-015](#cap-015) | poteto-agent 预设 | 🟠 插件实现 | DSH 自带预设不包含这个角色，新插件需要提供 `poteto-agent` 预设 | 插件实现 | |
| [CAP-016](#cap-016) | comment-sicko 只读评审预设 | 🟠 插件实现 | 只读靠提示，不靠权限 | 插件实现 | |
| [CAP-017](#cap-017) | 只读子代理 | 🟠 插件实现 | 标准模式没有只读子代理入口 | 插件实现 | |
| [CAP-018](#cap-018) | 执行环境 | 🟢 直接映射 | Cursor 云代理本身按上游排除项舍弃 | 直接映射 | |
| [CAP-019](#cap-019) | 云代理基线分支 | 🟢 直接映射 | 云代理舍弃后，这个字段只对工作树有意义 | 直接映射 | |
| [CAP-020](#cap-020) | 后台子代理 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-021](#cap-021) | 恢复子代理 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-022](#cap-022) | 文件附件 | 🟢 直接映射 | 没有附件对象，只有路径 | 直接映射 | |
| [CAP-023](#cap-023) | Claude 模型 slug | 🟠 插件实现 | 本部署的路由不是 Claude 命名，slug 必须映射到实际路由 | 插件实现 | |
| [CAP-024](#cap-024) | Grok 模型 slug | 🟠 插件实现 | 本部署不提供 Grok 命名路由时必须改用实际路由 | 插件实现 | |
| [CAP-025](#cap-025) | GPT 模型 slug | 🟠 插件实现 | 按实际路由映射 | 插件实现 | |
| [CAP-026](#cap-026) | 继承父模型 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-027](#cap-027) | 自动模型 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-028](#cap-028) | 角色模型规则文件 | 🟠 插件实现 | 需要一个跨会话可读的角色配置文件 | 插件实现 | |
| [CAP-029](#cap-029) | 角色模型配置流程 | 🟠 插件实现 | 需要插件提供完整的模型列表工具、配置入口与角色映射，对应本地扩展中的插件配置入口与角色模型配置 | 插件实现 | |
| [CAP-030](#cap-030) | Cursor 技能目录 | 🟢 直接映射 | 路径名不同，内容格式兼容 | 直接映射 | |
| [CAP-031](#cap-031) | Cursor 规则文件 | 🟢 直接映射 | 需要把规则内容放进 `AGENTS.md` | 直接映射 | |
| [CAP-032](#cap-032) | Cursor 插件目录 | 🟢 直接映射 | 打包格式不同，需要 DSH 插件包 | 直接映射 | |
| [CAP-033](#cap-033) | Cursor 项目设置 | 🔴 舍弃 | 项目级设置只服务 automations/benny，随 Automations 一起舍弃 | 舍弃 | |
| [CAP-034](#cap-034) | 会话记录 | 🟢 直接映射 | 没有直接暴露 JSONL 路径 | 直接映射 | |
| [CAP-035](#cap-035) | Cursor Automations | 🟠 插件实现 | 定时用 `schedule_create`，事件用官方 webhook，本地生命周期用社区 `dsh-automations`；配方见 `docs/automations.md` | 插件实现 | |
| [CAP-036](#cap-036) | Routine 调用 | 🔴 舍弃 | 随 Automations 一并舍弃 | 舍弃 | |
| [CAP-037](#cap-037) | Slack 检索 | 🟢 直接映射 | 只有用户自行配置 Slack MCP 才可用 | 直接映射 | |
| [CAP-038](#cap-038) | Bugbot 评审 | 🟢 直接映射 | Bugbot 专属步骤舍弃，普通评审线程照常处理 | 直接映射 | |
| [CAP-039](#cap-039) | Cursor 云代理 | 🟠 插件实现 | 不提供机器，只提供远端目标注册表与派发接口 | 插件实现 | |
| [CAP-040](#cap-040) | 内置 PR 工具 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-041](#cap-041) | 循环命令 | 🔵 官方插件 | 接口不同，语义接近 | 官方插件 | |
| [CAP-042](#cap-042) | 插件安装与管理 | 🟢 直接映射 | 命令名不同，能力具备 | 直接映射 | |
| [CAP-043](#cap-043) | 项目验证技能 | 🟢 直接映射 | 生成路径从 `.cursor/skills` 改为 `.agents/skills` | 直接映射 | |
| [CAP-044](#cap-044) | 计划模式 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-045](#cap-045) | MCP 连接 | 🟢 直接映射 | 需要用户提供服务器配置与凭证 | 直接映射 | |
| [CAP-046](#cap-046) | Webhook 接收 | 🔵 官方插件 | 官方 `@deepseek-ai/dsh-webhook` 加 provider 适配器把已验证投递变成会话；只有 GitHub 适配器 | 官方插件 | |
| [CAP-047](#cap-047) | Tailscale 暴露页面 | 🟢 直接映射 | 宿主 `--host <tailnet-ip> --public-url` 绑具体接口地址；`0.0.0.0` 在加载时被拒绝 | 直接映射 | |
| [CAP-048](#cap-048) | cursor-team-kit 插件 | 🟠 插件实现 | 三份技能是 cursor-team-kit 的 MIT 指令文件，仓库默认没有 | 插件实现 | |
| [CAP-049](#cap-049) | UI 控制技能 | 🟠 插件实现 | 需要外部 `agent-browser` 技能 | 插件实现 | |
| [CAP-050](#cap-050) | CLI 控制技能 | 🔵 官方插件 | 没有现成的 control-cli 技能，DSH 标准模式也没有 TUI 驱动技能 | 官方插件 | |
| [CAP-051](#cap-051) | 代码去噪技能 | 🟠 插件实现 | `deslop` 属于 `cursor-team-kit`，pstack 仓库和 DSH 标准模式都没有这份技能 | 插件实现 | |
| [CAP-052](#cap-052) | Graphite CLI | 🔴 舍弃 | 上游明确非必需 | 舍弃 | |
| [CAP-053](#cap-053) | Origin forge CLI | 🔴 舍弃 | 本机没有 `origin` | 舍弃 | |
| [CAP-054](#cap-054) | Bun 运行时 | 🟢 直接映射 | 插件必须声明 Bun 依赖 | 直接映射 | |
| [CAP-055](#cap-055) | mise 工具管理器 | 🟢 直接映射 | 首次运行需要网络与管理器可用 | 直接映射 | |
| [CAP-056](#cap-056) | TLC 模型检查器 | 🟢 直接映射 | 需要网络与 mise | 直接映射 | |
| [CAP-057](#cap-057) | Java 运行时 | 🟢 直接映射 | 需要网络与 mise 才能安装首选版本 | 直接映射 | |
| [CAP-058](#cap-058) | GitHub CLI | 🟢 直接映射 | 无 gh 凭证时 PR 步骤不可用 | 直接映射 | |
| [CAP-059](#cap-059) | 计划文件校验脚本 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-060](#cap-060) | watch-pr 脚本 | 🟢 直接映射 | 需要 Bun、网络与 gh 登录 | 直接映射 | |
| [CAP-061](#cap-061) | worktree-audit 脚本 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-062](#cap-062) | 决策日志脚本 | 🟢 直接映射 | 无 | 直接映射 | |
| [CAP-063](#cap-063) | statechart 脚本树 | 🟢 直接映射 | 依赖 Bun 或 Node 的 TypeScript 执行、mise、TLC、Java 与网络 | 直接映射 | |
| [CAP-064](#cap-064) | 依赖安装器 | 🟢 直接映射 | 离线环境不可用 | 直接映射 | |
| [CAP-065](#cap-065) | Pele 图表渲染 | 🟠 插件实现 | `pstack_chart` 把 `chart.mmd` 画成 SVG，不依赖 Mermaid 或浏览器 | 插件实现 | |
| [CAP-066](#cap-066) | 视频渲染 | 🔴 舍弃 | 延期（deferred），不在本轮范围；需要视频时由用户使用外部工具 | 舍弃 | |
| [CAP-067](#cap-067) | 性能测量 工具链 | 🟢 直接映射 | 本机缺少 `py-spy` | 直接映射 | |
| [CAP-068](#cap-068) | Custom Mode 自定义模式 | 🟠 插件实现 | 标准模式没有常驻技能的根 preset | 插件实现 | |

## 判定顺序

每项能力按以下顺序取第一个可行层级，不允许跳级。

1. DSH Web 标准模式已经提供的工具或行为。
2. DSH 随附但默认未启用的官方插件。
3. 本插件需要开发的能力。
4. 三项都不能满足时记录为舍弃或不支持。

## 上游适配结论

上游 `docs/harness/claude-code.md` 共 67 行，只处理四类内容。

1. 工具名替换。`Task` 换成 `Agent`，`AskQuestion` 换成 `AskUserQuestion`，`Grep` 与 `Glob` 在没有对应工具时改用 `rg`。
2. 子代理字段替换。写清 `subagent_type`、`readonly`、`environment`、`cloud_base_branch`、`run_in_background`、`resume`、`file_attachments` 的去向。
3. 模型与路径替换。Claude slug 换成 `opus`、`sonnet`、`haiku`，规则文件换到 `~/.claude/rules/pstack-models.md`，技能与插件目录换到 `.claude/`。
4. Cursor-only 能力排除。第 58 至 67 行列出 Cursor Automations、Bugbot、Cursor cloud agents、内置 PR tool，要求用一行 `Skipped in Claude Code: <step>. <reason>.` 记录后继续，不停止、不追问、不重试。内置 PR tool 改用 `gh` 等 forge 命令，不算跳过。

`/loop` 与 `create-skill` 是 Cursor 内置能力，claude-code.md 没有为它们写映射行。技能里依赖它们的地方在 Claude Code 上没有替代路径。脚本在适配文档中完全没有出现，上游也没有为脚本提供运行时替代，脚本的环境要求只能在技能正文和 README 里说明。

本仓库采用同样的边界。DSH 有对应能力的，按标准模式或官方插件映射。DSH 没有的，按舍弃处理并写入 `dsh.md`。不为 Cursor 云服务或平台能力编造等价物。

---

<a id="cat-a"></a>

## A 工具　🟢 直接映射 8 · 🟠 插件实现 3 · 🔴 舍弃 1

<a id="cap-001"></a>

### CAP-001 Task 子代理调用　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/arena/SKILL.md:17`、`skills/how/SKILL.md:11`、`skills/no-comments/SKILL.md:19`、`skills/poteto-mode/playbooks/opening-a-pr.md:5` |
| 🖱️ Cursor 行为 | pstack 的并行、评审和探索都通过 `Task` 派生子代理。技能里写明 `subagent_type`、`readonly`、`environment`、`run_in_background`、`resume`、`file_attachments` 等字段。 |
| 🧰 标准模式 | `subagent`、`subagent_fork`、`workflow` 三个工具。子代理默认后台运行，返回子会话 id，完成后以通知交付结果；`send_message` 可继续对话。 |
| 🧩 官方插件 | 智能体团队（`@deepseek-ai/dsh-experimental-agent-team-profile`）提供具名队友与共享任务板，不是匿名子代理的直接替代。 |
| 🕳️ 剩余缺口 | 没有一次调用接收全部 Cursor 字段。预设选择需要额外的工具入口。 |
| 🛠️ 插件要求与验收 | 插件提供 `pstack_subagent`，字段至少包含 `agent`、`role`、`reasoningEffort`、`cwd`、`maxDepth`。验收：一次调用启动 poteto-agent 与 comment-sicko 各一个，返回子会话 id，完成后收到两份结果。 |
| ⚔️ 冲突 | DSH 有三套多代理入口，标准 `subagent`、官方智能体团队、插件 `pstack_subagent`。智能体团队有具名队友和共享任务板，pstack 需要临时子代理、角色预设和按角色选模型。两者同时启用会出现两条派发路径和两套任务视图。pstack 主路径应选 `pstack_subagent`，智能体团队不作为 pstack 的派发层。 |
| 🚧 最终遗留 | 即使插件提供 `pstack_subagent`，子代理仍不是智能体团队的具名队友，不会出现在团队任务板。只读、附件和恢复语义依赖提示或 DSH 本地后端。 |
| 💡 推荐 | 🟠 插件实现。插件提供 `pstack_subagent`，字段至少包含 `agent`、`role`、`reasoningEffort`、`cwd`、`maxDepth`。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-002"></a>

### CAP-002 AskQuestion 结构化提问　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/automate-me/SKILL.md:17`、`skills/poteto-mode/playbooks/autonomous-run.md:9`、`skills/setup-pstack/SKILL.md:22`、`docs/harness/claude-code.md:10` |
| 🖱️ Cursor 行为 | `AskQuestion` 用于给用户多选项确认，例如 automates-me 的偏好采集与 setup-pstack 的预算选择。 |
| 🧰 标准模式 | `ask_user_question` 支持 `header`、`options`、`multi_select`、自定义回答。`multi_select` 对应 Cursor 的 `allow_multiple`。空选择表示跳过，不视为同意。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-003"></a>

### CAP-003 TodoWrite 待办清单　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/architect/SKILL.md:13`、`skills/arena/SKILL.md:9`、`skills/figure-it-out/SKILL.md:13`、`skills/poteto-help/SKILL.md:52` |
| 🖱️ Cursor 行为 | 每个多阶段技能开头要求打开 todolist，并在阶段结束时更新。被跳过的步骤留在列表里，写成 `skip: <reason>`。Cursor 的 `TodoWrite` 支持 `merge` 增量更新。 |
| 🧰 标准模式 | `todo_write` 接收完整列表，状态只有 `pending`、`in_progress`、`completed` 三种。没有 `merge`，每次调用替换整个列表。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 没有跳过状态，也没有增量合并。跳过只能在条目文本里写 `skip: <reason>`，状态只能取 `pending`、`in_progress`、`completed` 之一。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 跳过的步骤与已完成步骤共用 `completed` 状态，只能靠 `skip:` 文本前缀区分。每次更新都要重发完整列表。 |
| 💡 推荐 | 🟢 直接映射。跳过统一写成条目文本 `skip: <reason>` 并标为 `completed`，不保留 `pending`。`merge` 不实现，调用方每次提交完整列表。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-004"></a>

### CAP-004 Skill 技能调用与路由　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/architect/references/runner-prompt.md:5`、`skills/arena/SKILL.md:17`、`skills/automate-me/SKILL.md:11`、`skills/create-formal-verification-skill/SKILL.md:35` |
| 🖱️ Cursor 行为 | 技能之间用 `the **name** skill` 或 `/name` 互相路由。 |
| 🧰 标准模式 | `skill` 工具加载会话技能目录中的技能。`dsh-skill-filesystem` 支持 `disable-model-invocation: true` 的技能不进入模型目录，`user-invocable: true` 的技能仍可作为用户命令。`read` 可以读取任意 `SKILL.md`。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 被 `disable-model-invocation` 隐藏的技能不能由模型通过 `skill` 工具加载，也没有专用加载工具。 |
| 🛠️ 插件要求与验收 | 插件提供 `pstack_skill` 按名称加载隐藏技能，支持 `resource` 子路径。验收：加载 `poteto-mode` 的 `playbooks/babysit.md` 并返回正文。 |
| ⚔️ 冲突 | `skill` 工具与插件提供的 `pstack_skill` 是两套加载入口。同名技能同时存在时模型可能选错。约定 `skill` 只加载模型目录内的技能，隐藏技能用 `pstack_skill` 或直接读文件。 |
| 🚧 最终遗留 | 被 `disable-model-invocation` 隐藏的技能不会出现在模型目录，模型不能自动发现，只能靠技能正文点名或用户显式调用。 |
| 💡 推荐 | 🟠 插件实现。插件提供 `pstack_skill`，按名称加载模型目录不可见的技能，并支持 `resource` 子路径。普通技能仍走 `skill`。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-005"></a>

### CAP-005 Read 读取文件　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/automate-me/SKILL.md:63`、`skills/poteto-help/SKILL.md:13`、`skills/poteto-mode/playbooks/hillclimb.md:9`、`skills/reflect/references/divergent-reviewer.md:21` |
| 🖱️ Cursor 行为 | 读取技能文件、源码、配置和证据文件，也读取截图等图像证据。 |
| 🧰 标准模式 | `read` 返回带行号的 UTF-8 内容，支持 `offset`、`limit`，默认 2000 行，单次 50KB 上限。`read_image` 读取 PNG、JPEG、WebP、GIF。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-006"></a>

### CAP-006 Write 写入文件　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | 无出现 |
| 🖱️ Cursor 行为 | 技能产出 SKILL.md、报告、脚本和配置。正文没有直接点名 `Write`，但产出文件时隐含使用。 |
| 🧰 标准模式 | `write` 创建或整体替换文件。挂载 `fs-observation-policy` 时覆盖写要求先读同一版本。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-007"></a>

### CAP-007 Edit 编辑文件　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `automations/benny/skills/reproduce-and-fix-issues/references/feature-map.example.md:135`、`automations/benny/skills/reproduce-and-fix-issues/references/feature-map.example.md:144` |
| 🖱️ Cursor 行为 | `Edit` 在 automations 的修复流程中用于定点修改。 |
| 🧰 标准模式 | `edit` 按字面量替换，要求唯一匹配，`replace_all` 可放开。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-008"></a>

### CAP-008 Grep 内容搜索　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `docs/harness/claude-code.md:13` |
| 🖱️ Cursor 行为 | 技能正文用 grep 查找调用点与证据。 |
| 🧰 标准模式 | `grep` 使用 ripgrep 正则，按文件分组返回行号，单次 250 条后转入溢出文件。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-009"></a>

### CAP-009 Glob 路径搜索　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `docs/harness/claude-code.md:13` |
| 🖱️ Cursor 行为 | 技能正文用 glob 找文件。 |
| 🧰 标准模式 | `glob` 按修改时间排序，单次 100 条，包含隐藏与忽略文件，排除 VCS 元数据。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-010"></a>

### CAP-010 Bash 命令执行　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `docs/harness/claude-code.md:13`、`docs/harness/claude-code.md:21` |
| 🖱️ Cursor 行为 | 技能用 shell 跑 `git`、`gh`、`rg`、测试、构建和脚本。 |
| 🧰 标准模式 | `bash` 每次调用是新 shell，支持 `workdir`、超时与 `run_in_background`，后台作业用 `job_output` 读取。沙箱与审批策略生效。 |
| 🧩 官方插件 | 持久终端（`@deepseek-ai/dsh-experimental-terminal-bundle`）提供跨调用存活的进程，适合 REPL 与长驻开发服务器。 |
| 🕳️ 剩余缺口 | `bash` 不保留交互式 TTY 与工作目录状态。需要交互或常驻进程时依赖终端插件。 |
| ⚔️ 冲突 | `bash` 的后台作业和官方持久终端都能跑长驻进程。同时启用会有两套进程生命周期与清理方式，`job_output` 看不到终端进程。约定普通命令与脚本走 `bash`，需要交互 TTY 或 REPL 时才开终端插件。 |
| 🚧 最终遗留 | 不开持久终端时没有交互式 TTY，需要输入的 CLI 与 TUI 无法驱动。开启后终端进程由 agent 持有，会话结束需要人工清理。 |
| 💡 推荐 | 🟢 直接映射。普通命令与脚本走 `bash`。需要交互 TTY、REPL 或长驻进程时启用官方持久终端插件。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-011"></a>

### CAP-011 create-skill Cursor 内置技能创作　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/automate-me/SKILL.md:3`、`skills/poteto-help/SKILL.md:117`、`skills/poteto-mode/playbooks/authoring-a-skill.md:5`、`skills/reflect/references/synthesizer.md:17` |
| 🖱️ Cursor 行为 | automate-me 和 reflect 把技能创建交给 Cursor 内置的 `create-skill`，包括描述优化循环。poteto-help 明确说它是 Cursor 内置能力。 |
| 🧰 标准模式 | DSH 标准模式没有与 `create-skill` 同名的内置技能。技能本身是 `SKILL.md` 文件，可以用 `write` 创建，但创作规则与描述优化循环没有内置替代。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 没有内置的技能创作流程与描述优化循环。 |
| 🛠️ 插件要求与验收 | 用 `writing-for-agents` 技能作为 `create-skill` 的替代品。该技能作为插件依赖或随插件提供，不进入 DSH 标准模式。验收：按它的规则创建一个 `SKILL.md`，frontmatter 通过 `dsh-skill-filesystem` 校验。 |
| ⚔️ 冲突 | `writing-for-agents` 与 `create-skill` 是替代关系，不是等价关系。`writing-for-agents` 覆盖写作规则，但没有 Cursor 的描述优化循环。 |
| 🚧 最终遗留 | `writing-for-agents` 不含描述优化循环和自动注册检查，仍需人工校验 frontmatter。 |
| 💡 推荐 | 🟠 插件实现。用 `writing-for-agents` 技能作为 `create-skill` 的替代品。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-012"></a>

### CAP-012 /visualize 可视化图表命令　🔴 舍弃

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/ketchup/SKILL.md:37`、`skills/ketchup/SKILL.md:43` |
| 🖱️ Cursor 行为 | ketchup 把 `/visualize` 生成的图表算作可用视觉证据。 |
| 🧰 标准模式 | DSH 标准模式没有同名命令。可以用 Mermaid 文本或自写脚本生成图表。`statechart` 属于本插件技能，不属于标准模式。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 没有开箱即用的图表命令，也没有内置图表渲染器。 |
| ⚔️ 冲突 | Mermaid 文本与自写脚本都能出图，但没有统一命令。`statechart` 只输出 Mermaid 文本，而且需要 TLA+ 模型，简单图表反而更重。 |
| 🚧 最终遗留 | 没有开箱即用的 `/visualize` 命令，图表能力取决于外部渲染器或模型手写 Mermaid。 |
| 💡 推荐 | 🔴 舍弃。统一图表命令不实现，需要图表时由技能正文要求模型手写 Mermaid。 |
| ✅ 处置 | 舍弃 |

[返回审核清单](#审核清单)

---

<a id="cat-b"></a>

## B 子代理字段　🟢 直接映射 6 · 🟠 插件实现 4

<a id="cap-013"></a>

### CAP-013 subagent_type 子代理类型　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/how/SKILL.md:11`、`skills/no-comments/SKILL.md:19`、`skills/poteto-help/SKILL.md:60`、`skills/poteto-mode/playbooks/multi-phase-plan.md:7` |
| 🖱️ Cursor 行为 | `Task` 调用通过 `subagent_type` 选择 `generalPurpose`、`poteto-agent`、`comment-sicko` 或 `Explore`。 |
| 🧰 标准模式 | `subagent` 没有类型字段。若挂载时配置 `allowedAgentPresets`，模型可选 `agent_preset`。 |
| 🧩 官方插件 | 智能体团队用具名队友，不按类型路由。 |
| 🕳️ 剩余缺口 | 默认 profile 的 `subagent` schema 不含 `agent_preset`。 |
| 🛠️ 插件要求与验收 | 插件提供 `pstack_subagent`，`agent` 字段接受 `poteto-agent`、`comment-sicko`、`general` 三种值。验收：三种类型各派生一次，子会话返回各自的预设版本。 |
| ⚔️ 冲突 | 标准 `subagent` 没有类型字段，官方智能体团队按具名队友组织，插件的 `pstack_subagent` 才按预设路由。三者混用会出现同一份角色指令被不同入口解释。 |
| 🚧 最终遗留 | 预设路由只在 `pstack_subagent` 内生效，标准 `subagent` 看不到这些预设。 |
| 💡 推荐 | 🟠 插件实现。插件提供 `pstack_subagent`，`agent` 字段接受 `poteto-agent`、`comment-sicko`、`general` 三种值。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-014"></a>

### CAP-014 generalPurpose 通用子代理　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/how/SKILL.md:11`、`skills/interrogate/SKILL.md:17`、`skills/reflect/SKILL.md:25`、`skills/swarm/SKILL.md:27` |
| 🖱️ Cursor 行为 | 多数探索、评审和并行工作派生 `generalPurpose` 子代理。 |
| 🧰 标准模式 | 不传预设的 `subagent` 即为通用子代理，继承父会话工具与模型。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-015"></a>

### CAP-015 poteto-agent 预设　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-help/SKILL.md:60`、`skills/poteto-mode/playbooks/multi-phase-plan.md:7`、`agents/poteto-agent.md:2`、`docs/harness/claude-code.md:20` |
| 🖱️ Cursor 行为 | pstack 的 `agents/poteto-agent.md` 是代码实现代理，接收 poteto-mode 指令路径。 |
| 🧰 标准模式 | DSH 有 `@deepseek-ai/dsh-agent-preset` 预设机制。预设是 Cordis 插件组合，`subagent` 配置 `allowedAgentPresets` 后暴露 `agent_preset`，子代理启动时按 `agentPreset` 挂载组合，系统提示与工具随组合加载。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | DSH 自带预设不包含这个角色，新插件需要提供 `poteto-agent` 预设。 |
| 🛠️ 插件要求与验收 | 插件以 agent preset 形式挂载 `poteto-agent`，预设组合加载 `agents/poteto-agent.md` 的指令与所需工具。验收：`pstack_subagent` 以 `agent: poteto-agent` 派生，子代理开箱即按预设身份工作。 |
| ⚔️ 冲突 | `poteto-agent` 是插件预设，官方插件里没有同名角色。不要把 `poteto-agent` 配成团队队友，否则角色指令与团队任务板会同时作用。 |
| 🚧 最终遗留 | 预设的指令文件随插件发布，用户自定义角色时要改插件配置，不能只改工作区文件。 |
| 💡 推荐 | 🟠 插件实现。插件以 agent preset 形式挂载 `poteto-agent`，预设组合加载 `agents/poteto-agent.md` 的指令与所需工具。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-016"></a>

### CAP-016 comment-sicko 只读评审预设　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/no-comments/SKILL.md:19`、`agents/comment-sicko.md:2`、`docs/guide/05-build-and-clean.md:77`、`README.md:221` |
| 🖱️ Cursor 行为 | `agents/comment-sicko.md` 是只读评论评审代理，`no-comments` 技能派生它。 |
| 🧰 标准模式 | 用 `subagent` 派生普通子代理并提示不得编辑。没有只读强制。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 只读靠提示，不靠权限。 |
| 🛠️ 插件要求与验收 | 插件以 agent preset 形式挂载 `comment-sicko`，提示里禁止编辑。验收：评审一个 diff 并返回报告，结束后 `git status` 无新增改动。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 只读评审无法强制只读，评审代理可以写工作区，需要在结束后检查 `git status`。 |
| 💡 推荐 | 🟠 插件实现。插件以 agent preset 形式挂载 `comment-sicko`，提示里禁止编辑。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-017"></a>

### CAP-017 readonly 只读子代理　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/how/SKILL.md:11`、`skills/reflect/SKILL.md:25`、`skills/why/SKILL.md:13`、`docs/harness/claude-code.md:21` |
| 🖱️ Cursor 行为 | `readonly: true` 要求子代理只读。 |
| 🧰 标准模式 | `subagent` 没有只读参数。子代理继承父会话的沙箱策略，可以写工作区。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 标准模式没有只读子代理入口。只能在派发提示中禁止编辑，并在结束后用 `git status` 核对。 |
| 🛠️ 插件要求与验收 | 插件提供只读子代理预设，子代理会话以 `read-only` 沙箱模式启动，保留 `bash` 读取与查询能力。验收：子代理尝试写文件被拒绝，`git status` 无改动。 |
| ⚔️ 冲突 | DSH 沙箱有 `read-only` 模式，但标准 `subagent` 没有直接暴露这个设置。官方插件也没有只读角色，需要插件在派生时指定沙箱模式。 |
| 🚧 最终遗留 | 只读子代理需要独立会话策略。`read-only` 沙箱能拒绝写入，但仍允许读取可读范围内的内容。 |
| 💡 推荐 | 🟠 插件实现。插件提供只读子代理预设，子代理会话以 `read-only` 沙箱模式启动，保留 `bash` 读取与查询能力。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-018"></a>

### CAP-018 environment 执行环境　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-mode/playbooks/orchestrate.md:10`、`skills/swarm/SKILL.md:27`、`docs/harness/claude-code.md:23`、`docs/harness/claude-code.md:24` |
| 🖱️ Cursor 行为 | `environment: "cloud"` 表示 Cursor 云代理，`"local"` 表示本机。 |
| 🧰 标准模式 | `create_worktree` 创建独立工作树并切换会话目录；`subagent` 的 `cwd` 可指向工作树。 |
| 🧩 官方插件 | Git 工作树（`@deepseek-ai/dsh-experimental-tool-worktree`）提供同类能力。 |
| 🕳️ 剩余缺口 | Cursor 云代理本身按上游排除项舍弃。只用工作树替代隔离。 |
| ⚔️ 冲突 | 标准 `create_worktree` 与官方 Git 工作树插件都能建工作树。两套入口会产生不同目录与清理路径。约定子代理隔离用 `create_worktree`，界面操作走官方插件。 |
| 🚧 最终遗留 | 工作树只能隔离本机文件，不能替代 Cursor 云代理的远程机器与仪表盘。 |
| 💡 推荐 | 🟢 直接映射。本机隔离用 `create_worktree`。Cursor 云代理按上游排除项舍弃，不实现也不宣称等价。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-019"></a>

### CAP-019 cloud_base_branch 云代理基线分支　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/swarm/SKILL.md:29`、`docs/harness/claude-code.md:25` |
| 🖱️ Cursor 行为 | `cloud_base_branch` 指定云代理检出的基线分支。 |
| 🧰 标准模式 | `create_worktree` 的 `from` 接受本地提交、分支或标签。 |
| 🧩 官方插件 | Git 工作树插件。 |
| 🕳️ 剩余缺口 | 云代理舍弃后，这个字段只对工作树有意义。 |
| ⚔️ 冲突 | `create_worktree` 与官方 Git 工作树插件都能指定基线分支，两套入口的默认分支可能不同。 |
| 🚧 最终遗留 | 只对工作树有意义，云代理本身不实现。 |
| 💡 推荐 | 🟢 直接映射。`create_worktree` 的 `from` 承接基线分支。云代理字段不映射，只保留工作树语义。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-020"></a>

### CAP-020 run_in_background 后台子代理　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/arena/SKILL.md:22`、`skills/poteto-mode/SKILL.md:96`、`skills/swarm/SKILL.md:27`、`docs/harness/claude-code.md:26` |
| 🖱️ Cursor 行为 | `run_in_background: true` 让派生立即返回。 |
| 🧰 标准模式 | `subagent` 立即返回子会话 id，完成后通知父会话。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-021"></a>

### CAP-021 resume 恢复子代理　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `docs/harness/claude-code.md:27` |
| 🖱️ Cursor 行为 | `resume` 继续已存在的子代理。 |
| 🧰 标准模式 | `send_message` 给已结算的本地子代理发消息会开启新一轮。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | `send_message` 可以恢复，但 pstack 的默认约定是新任务用全新子代理，只有必须保留本地状态时才恢复。两套做法并存时按这条约定选择。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-022"></a>

### CAP-022 file_attachments 文件附件　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `docs/harness/claude-code.md:28` |
| 🖱️ Cursor 行为 | `file_attachments` 把文件交给子代理。 |
| 🧰 标准模式 | 在 `subagent` 提示中写文件路径，子代理用 `read` 读取。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 没有附件对象，只有路径。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 没有附件对象，文件必须写进提示词路径。 |
| 💡 推荐 | 🟢 直接映射。附件改为在子代理提示中写绝对路径，由子代理用 `read` 读取。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

---

<a id="cat-c"></a>

## C 模型与角色　🟢 直接映射 2 · 🟠 插件实现 5

<a id="cap-023"></a>

### CAP-023 claude-slug Claude 模型 slug　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/architect/SKILL.md:31`、`skills/arena/SKILL.md:17`、`skills/how/SKILL.md:11`、`skills/poteto-mode/SKILL.md:96` |
| 🖱️ Cursor 行为 | 技能默认使用 `claude-opus-5-5-xhigh` 等 Cursor 模型 slug，并带 `-fast` 后缀与推理档位。 |
| 🧰 标准模式 | `list_subagent_models` 只在 `modelDiscovery: true` 的 `dsh-tool-subagent` 实例上注册，Web 标准预设已开启；关闭时工具不存在。没有记录模型选择策略时只返回父会话当前路由；开启子代理模型选择后按 Session 记录的路由列表返回。`subagent` 接受 `provider`、`model`、`reasoning_effort`。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 本部署的路由不是 Claude 命名，slug 必须映射到实际路由。没有映射时不能照抄。 |
| 🛠️ 插件要求与验收 | 插件提供 `pstack_models` 工具枚举完整 provider、model 与 effort。角色配置把 Cursor `claude-*` slug 映射到实际路由；未配置映射时报错，不照抄 slug。验收：`pstack_models` 返回完整列表，角色配置解析出实际 `provider`、`model`、`reasoning_effort`。 |
| ⚔️ 冲突 | DSH 的模型选择设置会记录会话路由，插件角色配置（见 CAP-028）又会覆盖每个角色的路由。两个来源同时生效时以插件角色配置为准，但用户在界面改的模型可能被静默覆盖。 |
| 🚧 最终遗留 | Cursor slug 与实际路由之间需要维护映射表，DSH 升级或供应商变化后要重新映射。 |
| 💡 推荐 | 🟠 插件实现。调用时用插件 `pstack_models` 返回的实际路由填 `provider`、`model`、`reasoning_effort`。`list_subagent_models` 只在 Web 与 Desktop 标准预设提供，不能作为唯一来源。Cursor slug 到实际路由的映射写进角色配置，见 CAP-028。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-024"></a>

### CAP-024 grok-slug Grok 模型 slug　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/architect/SKILL.md:31`、`skills/arena/SKILL.md:17`、`skills/how/SKILL.md:11`、`skills/poteto-mode/playbooks/bug-fix.md:9` |
| 🖱️ Cursor 行为 | 默认代码模型是 `grok-4.7-xhigh-fast`，arena 与 swarm 大量使用。 |
| 🧰 标准模式 | 同上，按 `list_subagent_models` 的实际路由选择。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 本部署不提供 Grok 命名路由时必须改用实际路由。 |
| 🛠️ 插件要求与验收 | 插件提供 `pstack_models` 工具枚举完整路由。角色配置把 `grok-*` slug 映射到实际路由；没有对应路由时报错并记录替代关系。验收：角色配置解析出实际路由。 |
| ⚔️ 冲突 | 同 CAP-023，插件角色配置与 DSH 会话模型设置是两个来源。 |
| 🚧 最终遗留 | 本部署不提供 Grok 命名路由时必须改用实际路由，映射表同样需要维护。 |
| 💡 推荐 | 🟠 插件实现。Grok slug 按插件 `pstack_models` 的实际路由映射。本部署没有对应路由时选最接近的可用路由，并在角色配置记录替代关系。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-025"></a>

### CAP-025 gpt-slug GPT 模型 slug　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/reflect/references/synthesizer.md:28` |
| 🖱️ Cursor 行为 | `reflect` 的评审配置提到 `gpt-*` 模型。 |
| 🧰 标准模式 | 同上。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 按实际路由映射。 |
| 🛠️ 插件要求与验收 | 插件提供 `pstack_models` 工具枚举完整路由。角色配置把 `gpt-*` slug 映射到实际路由，不按名字猜测。验收：角色配置解析出实际路由。 |
| ⚔️ 冲突 | 同 CAP-023，插件角色配置与 DSH 会话模型设置是两个来源。 |
| 🚧 最终遗留 | GPT 命名路由不存在时只能按实际路由映射。 |
| 💡 推荐 | 🟠 插件实现。GPT slug 按插件 `pstack_models` 的实际路由映射，不按名字猜测。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-026"></a>

### CAP-026 inherit-parent 继承父模型　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/arena/SKILL.md:17`、`skills/how/SKILL.md:11`、`skills/poteto-help/SKILL.md:44`、`skills/poteto-mode/SKILL.md:96` |
| 🖱️ Cursor 行为 | 角色值写 `inherit-parent` 时子代理使用父会话模型。 |
| 🧰 标准模式 | `subagent` 省略 `provider` 与 `model` 即继承父路由。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-027"></a>

### CAP-027 auto-model 自动模型　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/arena/SKILL.md:17`、`skills/how/SKILL.md:11`、`skills/poteto-help/SKILL.md:44`、`skills/poteto-mode/SKILL.md:96` |
| 🖱️ Cursor 行为 | 角色值写 `auto` 时使用父会话模型。 |
| 🧰 标准模式 | 省略路由字段，或由 `agentPreset` 决定。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-028"></a>

### CAP-028 pstack-models.mdc 角色模型规则文件　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/architect/SKILL.md:31`、`skills/arena/SKILL.md:17`、`skills/how/SKILL.md:11`、`skills/poteto-help/SKILL.md:27` |
| 🖱️ Cursor 行为 | `~/.cursor/rules/pstack-models.mdc` 是 always-applied 规则，保存每个角色的模型与预算。 |
| 🧰 标准模式 | DSH 没有等价的全局 `.mdc` 规则目录。工作区指令走 `AGENTS.md`，会话预设走 agent preset。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 需要一个跨会话可读的角色配置文件。DSH 当前没有提供，需要插件自己声明位置与格式。 |
| 🛠️ 插件要求与验收 | 插件提供角色配置读取与校验，文件位置与格式在 `dsh.md` 声明。验收：修改一个角色路由后，下一次 `pstack_subagent` 调用使用新路由。 |
| ⚔️ 冲突 | 角色配置文件和 DSH 的模型选择设置是两套来源。插件读取自己的文件，界面设置不会自动同步。 |
| 🚧 最终遗留 | 需要插件提供配置入口与校验。文件丢失时回退到技能默认值，用户看不到差异。 |
| 💡 推荐 | 🟠 插件实现。插件提供角色配置读取与校验，文件位置与格式在 `dsh.md` 声明。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-029"></a>

### CAP-029 setup-pstack 角色模型配置流程　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-help/SKILL.md:27`、`skills/poteto-mode/SKILL.md:96`、`skills/setup-pstack/SKILL.md:2`、`docs/guide/01-setup.md:15` |
| 🖱️ Cursor 行为 | `setup-pstack` 检测可用模型，按预算把每个角色映射到模型，写入 always-applied 规则。 |
| 🧰 标准模式 | `list_subagent_models` 只在 `modelDiscovery: true` 的 `dsh-tool-subagent` 实例上注册，Web 标准预设已开启；关闭时工具不存在。没有记录模型选择策略时只列父路由。没有配置界面与预算映射。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 需要插件提供完整的模型列表工具、配置入口与角色映射，对应本地扩展中的插件配置入口与角色模型配置。 |
| 🛠️ 插件要求与验收 | 插件提供 `pstack_models` 工具，枚举 LLM 服务注册的全部 provider、model 与 effort，不依赖 `list_subagent_models` 或 `modelDiscovery`。插件提供角色配置页或配置命令，列出角色、当前路由、可选路由与预算，写回角色配置文件。验收：在 `modelDiscovery` 关闭的 profile 中 `pstack_models` 仍返回完整路由；Web UI 修改一个角色并保存，重启后仍生效。 |
| ⚔️ 冲突 | 无。`setup-pstack` 和设置页都写同一份角色配置文件，以最后写入的值为准。 |
| 🚧 最终遗留 | 同一角色的路由没有版本历史，后写覆盖先写。 |
| 💡 推荐 | 🟠 插件实现。插件提供 `pstack_models` 工具，枚举 LLM 服务注册的全部 provider、model 与 effort，不依赖 `list_subagent_models` 或 `modelDiscovery`。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

---

<a id="cat-d"></a>

## D 路径与历史　🟢 直接映射 4 · 🔴 舍弃 1

<a id="cap-030"></a>

### CAP-030 .cursor/skills Cursor 技能目录　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/automate-me/SKILL.md:17`、`skills/create-verification-skill/SKILL.md:9`、`skills/maintain-verification-skill/SKILL.md:25`、`skills/reflect/references/divergent-reviewer.md:21` |
| 🖱️ Cursor 行为 | 项目技能放 `.cursor/skills/`，个人技能放 `~/.cursor/skills/`。create-verification-skill 与 automate-me 会写这个目录。 |
| 🧰 标准模式 | `dsh-skill-filesystem` 扫描 `<project>/.dsh/skills`、`<project>/.agents/skills`、`<dshHome>/skills`、`<agentsHome>/skills`，支持目录包与扁平文件。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 路径名不同，内容格式兼容。生成或迁移技能时需要改路径。 |
| ⚔️ 冲突 | `.dsh/skills`、`.agents/skills`、插件内置技能与用户技能目录有优先级。同名技能会被高优先级根覆盖，pstack 生成树与项目自定义技能可能撞名。 |
| 🚧 最终遗留 | 没有命名空间隔离，技能名必须全局唯一。 |
| 💡 推荐 | 🟢 直接映射。生成器把 `.cursor/skills` 改写为 `.agents/skills`。安装前检查技能重名，撞名时保留项目技能。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-031"></a>

### CAP-031 .cursor/rules Cursor 规则文件　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/architect/SKILL.md:31`、`skills/arena/SKILL.md:17`、`skills/how/SKILL.md:11`、`skills/poteto-help/SKILL.md:27` |
| 🖱️ Cursor 行为 | `.cursor/rules/*.mdc` 是 always-applied 规则。 |
| 🧰 标准模式 | 工作区指令用 `AGENTS.md`。DSH 没有 `.mdc` 目录。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 需要把规则内容放进 `AGENTS.md`。角色模型规则是例外，见 CAP-028。 |
| ⚔️ 冲突 | `AGENTS.md` 与插件内的角色规则都会进入上下文，内容冲突时模型无法判断优先级。 |
| 🚧 最终遗留 | DSH 没有 `.mdc` 的 glob 作用域与 alwaysApply 语义，规则对所有会话生效。 |
| 💡 推荐 | 🟢 直接映射。规则内容改写进 `AGENTS.md`。角色模型规则走 CAP-028 的插件配置文件，不写进 `AGENTS.md`。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-032"></a>

### CAP-032 .cursor/plugins Cursor 插件目录　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/reflect/references/divergent-reviewer.md:21`、`agents/poteto-agent.md:9`、`docs/harness/claude-code.md:53`、`skills/reflect/references/judgment-reviewer.md:20` |
| 🖱️ Cursor 行为 | Cursor 插件安装目录与 `.cursor-plugin/plugin.json` 清单。 |
| 🧰 标准模式 | DSH 用 profile 的 `dsh.profile.bundles` 与 `plugin_manager` 管理插件。清单是 `package.json` 与 `cordis.patch.yml`。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 打包格式不同，需要 DSH 插件包。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。插件按 DSH 插件包发布，清单用 `package.json` 与 `cordis.patch.yml`，不保留 Cursor 插件目录格式。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-033"></a>

### CAP-033 .cursor/settings.json Cursor 项目设置　🔴 舍弃

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `automations/benny/FOR_AGENTS.md:32`、`automations/benny/FOR_AGENTS.md:67`、`automations/benny/FOR_AGENTS.md:83`、`automations/benny/README.md:11` |
| 🖱️ Cursor 行为 | automations/benny 的配置说明提到 `.cursor/settings.json`。 |
| 🧰 标准模式 | DSH 有 `settings` 服务与 profile 配置，项目级设置文件没有在文档中确认。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 项目级设置只服务 automations/benny，随 Automations 一起舍弃。DSH 侧没有确认的对应位置。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 该配置入口不实现。 |
| 💡 推荐 | 🔴 舍弃。项目级设置只服务 automations/benny，随 Automations 一起舍弃。 |
| ✅ 处置 | 舍弃 |

[返回审核清单](#审核清单)

<a id="cap-034"></a>

### CAP-034 agent-transcripts 会话记录　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/automate-me/SKILL.md:29`、`skills/poteto-mode/playbooks/eval.md:22`、`skills/recall/SKILL.md:15`、`skills/reflect/SKILL.md:15` |
| 🖱️ Cursor 行为 | Cursor 把会话写成 `~/.cursor/projects/<slug>/agent-transcripts/<uuid>.jsonl`。recall 与 automate-me 直接读这些文件。 |
| 🧰 标准模式 | DSH 持久化会话并提供 `session_search`、`session_event_search`、`session_event_read`、`session_trace`。 |
| 🧩 官方插件 | 会话搜索（`@deepseek-ai/dsh-experimental-session-search`）已启用。 |
| 🕳️ 剩余缺口 | 没有直接暴露 JSONL 路径。按工作区搜索的语义可用，跨工作区读取被禁止，符合 pstack 的边界要求。 |
| ⚔️ 冲突 | 会话搜索工具与官方会话搜索插件可能同时提供搜索入口，结果范围相同但排序可能不同。 |
| 🚧 最终遗留 | 没有直接 JSONL 路径，跨工作区读取被禁止，recall 只能读当前工作区。 |
| 💡 推荐 | 🟢 直接映射。会话检索改用 `session_search`、`session_event_search`、`session_event_read` 与 `session_trace`，只读当前工作区。不实现 JSONL 文件读取。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

---

<a id="cat-e"></a>

## E Cursor 平台　🟢 直接映射 8 · 🔵 官方插件 2 · 🟠 插件实现 3 · 🔴 舍弃 1

<a id="cap-035"></a>

### CAP-035 Cursor Automations　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/make-bot-ui/SKILL.md:37`、`automations/benny/FOR_AGENTS.md:31`、`docs/harness/claude-code.md:60`、`README.md:287` |
| 🖱️ Cursor 行为 | Benny 自动化、routine 创建、`api2.cursor.sh/automations` webhook 与 routine 唤醒。 |
| 🧰 标准模式 | 定时跟进有 `schedule_create`；已验证的入站事件有官方 `@deepseek-ai/dsh-webhook` 接缝。两者都不是 automation 对象。 |
| 🧩 官方插件 | `@deepseek-ai/dsh-webhook` 与 `@deepseek-ai/dsh-webhook-github`，见 CAP-046。 |
| 🕳️ 剩余缺口 | 定时、事件、会话生命周期三半分别由 `schedule_create`、官方 webhook、社区 `dsh-automations` 覆盖，配方见 `docs/automations.md`。automation 对象本身的确认卡、`SendToUser` 密钥请求与云端面板仍不可用，那属于 CAP-036。 |
| ⚔️ 冲突 | `schedule_create` 只按时间触发；webhook 接缝不去重、不回报完成，`202` 不等于会话已启动；无人值守时 `pstack-script-policy` 与 `pstack-remote` 的 `mode: ask` 会把流程卡住，改成 `allow` 是明确的信任决策。 |
| 🚧 最终遗留 | routine 对象不实现。事件触发链路可用但需要用户自备 provider 适配器或社区包。 |
| 💡 推荐 | 🟠 插件实现。文档给出三条配方，不新造 automation 对象。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-036"></a>

### CAP-036 Routine 调用　🔴 舍弃

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/make-bot-ui/SKILL.md:11`、`skills/poteto-mode/SKILL.md:98`、`automations/benny/skills/reproduce-and-fix-issues/SKILL.md:39`、`docs/guide/09-make-it-yours.md:96` |
| 🖱️ Cursor 行为 | `update_state` 的 routine 创建、webhook 触发与 `SendToUser` 密钥请求。多数正文里的 routine 是普通词，真正依赖集中在 make-bot-ui 与 automations。 |
| 🧰 标准模式 | 没有等价物。DSH 有定时任务（`schedule_create`）但不接收外部 webhook。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 随 Automations 一并舍弃。 |
| ⚔️ 冲突 | 同 CAP-035，`schedule_create` 只按时间触发，不能替代 routine 的事件唤醒。 |
| 🚧 最终遗留 | routine 创建、webhook 触发与密钥请求都不可用。 |
| 💡 推荐 | 🔴 舍弃。随 Automations 一并舍弃。 |
| ✅ 处置 | 舍弃 |

[返回审核清单](#审核清单)

<a id="cap-037"></a>

### CAP-037 Slack 检索　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/why/references/source-playbook.md:10`、`automations/benny/skills/reproduce-and-fix-issues/references/control-adapter.md:169`、`docs/guide/07-overnight.md:118`、`skills/why/references/sources/incident-postmortem.md:4` |
| 🖱️ Cursor 行为 | `why` 的实时团队聊天来源通过 Slack MCP 查询。文档明确要求先检查可用的 Slack MCP 与其 schema。 |
| 🧰 标准模式 | `dsh-mcp-client` 支持配置 stdio 或 streamable-http 的 MCP 服务器，工具名带 `mcp__<server>__<tool>` 前缀。 |
| 🧩 官方插件 | 无内置 Slack 连接器。 |
| 🕳️ 剩余缺口 | 只有用户自行配置 Slack MCP 才可用。未配置时按 `why` 的要求报告不可用，不编造。 |
| ⚔️ 冲突 | Slack 只能通过用户配置的 MCP 服务器接入，DSH 没有内置 Slack。多个 Slack MCP 同时配置会造成工具重名或权限冲突。 |
| 🚧 最终遗留 | 未配置 MCP 时 Slack 来源不可用，`why` 必须报告缺失。 |
| 💡 推荐 | 🟢 直接映射。Slack 只在用户配置 Slack MCP 后可用。未配置时 `why` 按来源缺失报告，不编造内容。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-038"></a>

### CAP-038 Bugbot 评审　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-help/SKILL.md:46`、`skills/poteto-mode/playbooks/babysit.md:20`、`skills/reflect/references/synthesizer.md:27`、`docs/harness/claude-code.md:60` |
| 🖱️ Cursor 行为 | Bugbot 在 GitHub PR 上留评论。 |
| 🧰 标准模式 | `gh` 命令读取与回复评审线程。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | Bugbot 专属步骤舍弃，普通评审线程照常处理。 |
| ⚔️ 冲突 | Bugbot 评论是普通 PR 线程，但 Bugbot 的通过计数只有 PR 监视器能算。把两者混在一起会把评论数当通过数。 |
| 🚧 最终遗留 | 没有 Bugbot 专属检查，只能靠 `gh` 读取线程并人工判断。 |
| 💡 推荐 | 🟢 直接映射。Bugbot 专属检查舍弃。PR 评审线程用 `gh` 读取与回复，通过与否由人工判断。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-039"></a>

### CAP-039 cloud agent Cursor 云代理　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-help/SKILL.md:80`、`skills/poteto-mode/playbooks/autopilot-full.md:8`、`docs/guide/07-overnight.md:3`、`skills/poteto-help/SKILL.md:146` |
| 🖱️ Cursor 行为 | `environment: "cloud"` 把子代理放到 Cursor 提供的云端 VM 上执行，附带仪表盘状态、镜像与计费。 |
| 🧰 标准模式 | 本地 `create_worktree` 能做隔离，但机器必须开着；`dsh --profile headless` 是现成的一次性远程执行入口。 |
| 🧩 官方插件 | `fs-ssh` / `subprocess-ssh` / `sandbox-ssh`（`ctx.ssh`）可让远端机器充当文件、进程与沙箱提供方，属于自定义 profile 的组装级选择。 |
| 🕳️ 剩余缺口 | 平台不提供机器、镜像、计费与仪表盘；这一步无法由插件凭空补足。 |
| 🛠️ 插件要求与验收 | 只提供接入接口，不提供机器：`pstack_remote`（`list` / `run` / `status` / `logs` / `cancel`）、`pstack-remote` bundle 行（`targets[].{name,transport,host,url,tokenRef,workspaceRoot,defaultProfile}`）、`ssh` 与 `http` 两种 transport、作业记录与事件流落盘、默认 `ask` 审批。机器侧契约只有一条：装 DSH 与 `dsh --profile headless --json` 可执行。验收：假 `dsh` 子进程跑通全链路，假 HTTP worker 断言事件顺序与退出码，契约写进 `docs/remote-worker.md`。 |
| ⚔️ 冲突 | 与本地 worktree 并存：能本地做就本地做，远端只在需要另一台机器、另一套环境或长时间运行时使用。与社区 `dsh-remote` 重叠但不冲突：那个把远端镜像成本地工作区，本插件把任务派到远端。 |
| 🚧 最终遗留 | 机器存活、网络、凭据与远端 DSH 版本都由用户负责；没有托管 VM 的仪表盘，也没有过夜后自动回收的保证。 |
| 💡 推荐 | 🟠 插件实现。开放式接口：我们定义目标注册与派发契约，用户提供机器。`environment: "cloud"` 翻译成 `environment: "remote"` 并指名目标；没有登记目标时退回本地 worktree 并说明。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-040"></a>

### CAP-040 built-in PR tool 内置 PR 工具　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-mode/playbooks/multi-phase-plan.md:57`、`docs/harness/claude-code.md:60`、`skills/poteto-mode/playbooks/opening-a-pr.md:26`、`skills/poteto-mode/playbooks/opening-a-pr.md:28` |
| 🖱️ Cursor 行为 | Cursor 内置 PR 面板。 |
| 🧰 标准模式 | `bash` 调 `gh`。 |
| 🧩 官方插件 | 变更请求与工作树（`@deepseek-ai/dsh-experimental-forge-bundle`）提供 PR 跟踪，已启用。 |
| 🕳️ 剩余缺口 | 无。按 `gh` 路径执行，不算跳过。 |
| ⚔️ 冲突 | `gh` 是执行路径，官方变更请求与工作树插件是展示层。两者都依赖 gh 登录，但 PR 状态可能刷新不同步。 |
| 🚧 最终遗留 | 官方插件的界面看不到 pstack 的 PR 判定，pstack 也不读插件缓存。 |
| 💡 推荐 | 🟢 直接映射。PR 操作统一走 `bash` 调 `gh`。官方 forge 插件只作界面展示，不作为 pstack 的 PR 判定来源。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-041"></a>

### CAP-041 /loop 循环命令　🔵 官方插件

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-help/references/prompting.md:41`、`skills/poteto-mode/playbooks/autonomous-run.md:6`、`skills/statechart/scripts/pipeline.ts:19`、`docs/guide/07-overnight.md:26` |
| 🖱️ Cursor 行为 | Cursor 内置 `/loop` 让同一目标反复运行，直到完成或停止。Babysit 要求 `drive` 与 `background` 在 `/loop` 下运行。上游 `claude-code.md` 没有为 `/loop` 写映射行。 |
| 🧰 标准模式 | `create_goal` 建立跨轮次目标，自动继续直到完成或阻塞。 |
| 🧩 官方插件 | Ralph 循环（`@deepseek-ai/dsh-experimental-ralph-bundle`）每轮启动新代理推进同一目标，直到达成、报告阻塞或达到轮次上限。 |
| 🕳️ 剩余缺口 | 接口不同，语义接近。需要确认在插件技能中如何触发。上游对 `/loop` 的缺失处理可以作为参照。 |
| ⚔️ 冲突 | 有三套循环。DSH 的 `create_goal` 跨轮次继续同一会话，官方 Ralph 每轮新代理，Cursor `/loop` 是外部命令。同时用 goal 与 Ralph 会重复驱动同一目标。约定需要新代理时用 Ralph，需要同一会话续跑时用 goal。 |
| 🚧 最终遗留 | `/loop` 的精确时间语义与动态唤醒无法完全复现，PR 监视器的重新布防行为需要重写。 |
| 💡 推荐 | 🔵 官方插件。Ralph 循环（`@deepseek-ai/dsh-experimental-ralph-bundle`）每轮启动新代理推进同一目标，直到达成、报告阻塞或达到轮次上限。 |
| ✅ 处置 | 官方插件 |

[返回审核清单](#审核清单)

<a id="cap-042"></a>

### CAP-042 /plugin 插件安装与管理　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-help/SKILL.md:38`、`agents/poteto-agent.md:9`、`docs/guide/01-setup.md:10`、`plugin.json:2` |
| 🖱️ Cursor 行为 | poteto-help 让用户用 `/add-plugin pstack` 安装，或用侧栏 Customize。 |
| 🧰 标准模式 | `plugin_manager` 与 `plugin_market` 工具，以及 Web UI 的插件页。 |
| 🧩 官方插件 | 自定义插件索引（`@deepseek-ai/dsh-experimental-plugin-market-bundle`）已启用。 |
| 🕳️ 剩余缺口 | 命令名不同，能力具备。 |
| ⚔️ 冲突 | `plugin_manager` 管安装与启停，`plugin_market` 管索引浏览。两个工具职责不同但都能触发安装，容易混用。 |
| 🚧 最终遗留 | Cursor 的 `/add-plugin` 命令名不存在，用户需要改用插件页或工具。 |
| 💡 推荐 | 🟢 直接映射。安装与启停走 `plugin_manager`，索引浏览走 `plugin_market`。用户入口是插件页，不提供 `/add-plugin` 命令。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-043"></a>

### CAP-043 /verify 项目验证技能　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/create-verification-skill/SKILL.md:9`、`skills/maintain-verification-skill/SKILL.md:25`、`skills/poteto-help/references/recipes.md:19`、`automations/benny/skills/reproduce-and-fix-issues/SKILL.md:99` |
| 🖱️ Cursor 行为 | create-verification-skill 生成 `.cursor/skills/verify-<app>/`，用户用 `/verify-<app>` 调用。 |
| 🧰 标准模式 | 项目技能放 `.dsh/skills` 或 `.agents/skills`，`user-invocable` 技能以 `/name` 命令形式出现。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 生成路径从 `.cursor/skills` 改为 `.agents/skills`。技能名可以保持 `verify-<app>`。 |
| ⚔️ 冲突 | 项目验证技能与 `.dsh/skills`、`.agents/skills` 的优先级有关，同名 `verify-*` 会覆盖。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。生成器把验证技能写到 `.agents/skills/verify-<app>`，保留技能名，用户用 `/verify-<app>` 调用。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-044"></a>

### CAP-044 plan mode 计划模式　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `README.md:271` |
| 🖱️ Cursor 行为 | README 提到 plan mode。Cursor 计划模式先出方案再执行。 |
| 🧰 标准模式 | `exit_plan_mode` 工具存在，计划模式可用。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-045"></a>

### CAP-045 MCP 连接　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/automate-me/SKILL.md:55`、`skills/poteto-mode/SKILL.md:84`、`skills/recall/SKILL.md:20`、`skills/reflect/references/divergent-reviewer.md:5` |
| 🖱️ Cursor 行为 | why 与 recall 通过 MCP 查询 Slack、工单、错误追踪等外部来源。 |
| 🧰 标准模式 | `dsh-mcp-client` 按 profile 配置 stdio 或 streamable-http 服务器，工具注册为 `mcp__<server>__<tool>`。默认不启用任何服务器。 |
| 🧩 官方插件 | 无独立插件条目，能力在运行时包中。 |
| 🕳️ 剩余缺口 | 需要用户提供服务器配置与凭证。未配置时按不可用处理。 |
| ⚔️ 冲突 | MCP 工具可能与原生工具重名，例如 GitHub MCP 与 `gh`。模型会看到两套入口。 |
| 🚧 最终遗留 | 每个服务器都要用户提供配置与凭证，未配置时相关来源不可用。 |
| 💡 推荐 | 🟢 直接映射。MCP 服务器由用户在 profile 配置，工具按 `mcp__<server>__<tool>` 调用。未配置的来源报告不可用。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-046"></a>

### CAP-046 Webhook 接收　🔵 官方插件

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/make-bot-ui/SKILL.md:5`、`skills/poteto-help/SKILL.md:100`、`skills/poteto-mode/references/bugbot-triage.md:122`、`docs/guide/04-design.md:86` |
| 🖱️ Cursor 行为 | make-bot-ui 让本机服务器 POST 到 Cursor routine 的 webhook。 |
| 🧰 标准模式 | `ctx.webhookRuntime` 是官方接缝：provider 适配器验证投递，可信插件登记进程内规则，规则返回的请求变成普通 Workspace 会话。 |
| 🧩 官方插件 | `@deepseek-ai/dsh-webhook` 与 `@deepseek-ai/dsh-webhook-github`。`dsh plugin --profile web add` 两个包，再用 `dsh web --patch .../examples/github-review/cordis.yml` 挂载。 |
| 🕳️ 剩余缺口 | 只有 GitHub 适配器；其它 provider 需要写一个小规则插件。接缝是进程内 fire-and-forget，不去重、不回报完成，`202` 只代表签名与 JSON 被接受。插件不提供公网入站服务，绑定地址与密钥由用户决定。 |
| ⚔️ 冲突 | 无人值守时审批策略仍是本地配置；`0.0.0.0` 在加载时被拒绝，对外只能用具体接口地址或反代。 |
| 🚧 最终遗留 | make-bot-ui 的 routine 对象链路仍缺后半段（见 CAP-036），但入站事件到会话这一段不再是缺口。 |
| 💡 推荐 | 🔵 官方插件。安装两包并在 overlay 里启动，配方见 `docs/automations.md`。 |
| ✅ 处置 | 官方插件 |

[返回审核清单](#审核清单)

<a id="cap-047"></a>

### CAP-047 Tailscale 暴露页面　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/make-bot-ui/SKILL.md:6`、`docs/guide/09-make-it-yours.md:96`、`README.md:142`、`skills/make-bot-ui/SKILL.md:57` |
| 🖱️ Cursor 行为 | make-bot-ui 要求把本机页面绑到 `0.0.0.0`，用 Tailscale 提供 tailnet URL。 |
| 🧰 标准模式 | `dsh web` 接受一个具体的 `--host <ipv4-or-ipv6>` 与 `--public-url`；未指定地址在加载时被拒绝。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | Tailscale 本身仍需用户安装并登录。DSH 侧只需绑 tailnet 地址：`dsh --profile web --host <tailscale-ip> --public-url http://<tailscale-ip>:<port>`，用 `tailscale ip -4` 取值。 |
| ⚔️ 冲突 | `0.0.0.0` 永远不工作，上游要求绑全接口这一步必须改写。光标会话 token 仍然生效，链接要带完整 URL 交给设备。 |
| 🚧 最终遗留 | 无。需要用户自己的网络与设备。 |
| 💡 推荐 | 🟢 直接映射。宿主已有绑具体接口的能力，`port/dsh.md` 记录用法。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-068"></a>

### CAP-068 Custom Mode 自定义模式　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `README.md:106`、`docs/guide/01-setup.md:64`、`docs/guide/02-poteto-mode.md:93`、`skills/poteto-help/SKILL.md:57` |
| 🖱️ Cursor 行为 | Cursor 支持把技能设为 Custom Mode：用 Option+Enter 或 Use as Mode 进入后，`/poteto-mode` 常驻上下文，每一轮都在，直到用户退出。 |
| 🧰 标准模式 | 标准模式把技能当作单轮或按需显式加载的内容，没有常驻技能 section；`poteto-agent` preset 只给委派子代理用。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 标准模式没有持久根 preset，无法在一整段会话里保留完整 `poteto-mode` 技能正文。 |
| 🛠️ 插件要求与验收 | 插件提供两个根 preset：`poteto-mode` 保留标准通用工具，`poteto-mode-creator` 保留创造模式工具并加入 `tool-cordis` 与 agent-preset 技能目录。两者都保留 `tool-subagent-control`，但直接派发只保留 `pstack_subagent`，不放官方 `tool-subagent` 与 `subagent_fork`。两者都由 `pstack-poteto-mode` 行以 `systemPrompt` section 注入完整 `SKILL.md` 正文（去掉 frontmatter）与 agent harness 适配文档的绝对路径，并告诉模型每会话读一次 `docs/harness/dsh.md`；section 用 `interpolate: false` 保留正文里的 `{{...}}`。检测到 `agentTeams` 服务时，`pstack-poteto-mode` 让两个根 preset 启动失败并给出错误。`poteto-agent` 仍是只给委派子代理的 preset，三者分开。验收：新会话选择任一 `poteto-mode` 根 preset，系统提示包含 `# Poteto mode` 与 `Non-negotiables`；第二轮仍在模式内且不需要再次加载 `pstack-skill`；询问当前持久模式时回答对应 preset 名称；工具列表只有 `pstack_subagent` 作为直接派发工具，没有 `subagent`、`subagent_fork` 或 `list_subagent_models`。 |
| ⚔️ 冲突 | `poteto-agent` preset 也注入 `poteto-mode` 指令路径，但只用于子代理；两个根 preset 与它同名概念不同，不能互相替代。Agent Teams 的 `spawn_teammate`、`send_message`、`list_agents`、`interrupt_agent` 和共享任务板会与 pstack 的子代理控制和 todo/playbook 形成两套派发路径；根 preset 必须拒绝该组合。 |
| 🚧 最终遗留 | 只有选择两个根 preset 之一的新会话才有持久技能；已有会话或其它 preset 需要每个任务调用 `/poteto-mode`。headless 一次性 runner 不组合 agent preset，验证必须在 Web 会话进行。 |
| 💡 推荐 | 🟠 插件实现。新增 `poteto-mode` 与 `poteto-mode-creator` 两个根 preset 与 `pstack-poteto-mode` section 插件，分别保留标准与创造模式的通用工具，直接派发只走 `pstack_subagent`，把完整技能常驻系统提示，与只给委派用的 `poteto-agent` 分开；检测到 Agent Teams 时拒绝启动。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

---

<a id="cat-f"></a>

## F 其他 Cursor 插件　🔵 官方插件 1 · 🟠 插件实现 3 · 🔴 舍弃 2

<a id="cap-048"></a>

### CAP-048 cursor-team-kit 插件　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-help/SKILL.md:116`、`skills/poteto-mode/playbooks/autopilot-full.md:10`、`docs/guide/05-build-and-clean.md:59`、`README.md:263` |
| 🖱️ Cursor 行为 | `cursor-team-kit` 1.2.0 在兄弟目录，带 19 个技能，许可证是 MIT。pstack 明确引用其中三个，`deslop`、`control-ui`、`control-cli`。poteto-help 说它们不在 pstack 里。 |
| 🧰 标准模式 | DSH 标准模式没有这个插件，也没有等价的三份技能。`dsh-skill-filesystem` 支持 `bundledSkillDir` 和 `customSkillDirs`，可以加载插件随包或项目目录里的技能。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 三份技能是 cursor-team-kit 的 MIT 指令文件，仓库默认没有。`control-ui` 和 `control-cli` 依赖宿主机的浏览器与 PTY 工具，`deslop` 只依赖 `git`。 |
| 🛠️ 插件要求与验收 | 插件以 vendored 形式随包提供 `cursor-team-kit` 的 `deslop`、`control-ui`、`control-cli` 三个技能目录，放在包内 `skills/` 下，保留上游 LICENSE 与来源版本。插件 composition 用 `dsh-skill-filesystem` 的 `bundledSkillDir` 指向该目录，不写插件工具代码。依赖处理以上游 `SKILL.md` 为准；上游没有写依赖缺失处理时，插件不额外处理，只在 `dsh.md` 与 README 记录前提。验收：三份技能可被发现，正文与上游一致。 |
| ⚔️ 冲突 | 如果用户另外安装 `cursor-team-kit` 或同名技能，会出现两份实现。`bundledSkillDir` 的 rank 600 低于项目根与用户根，高优先级版本覆盖随包版本。约定随包版本作默认，用户覆盖时以高优先级版本为准。 |
| 🚧 最终遗留 | `control-ui` 和 `control-cli` 只是指令，实际能力取决于宿主机是否安装浏览器与 PTY 工具。上游没有规定缺失时的处理，插件不额外补偿，只在 `dsh.md` 与 README 记录前提。 |
| 💡 推荐 | 🟠 插件实现。插件以 vendored 形式随包提供三份 MIT 技能目录，保留 LICENSE 与来源版本，通过 `dsh-skill-filesystem` 的 `bundledSkillDir` 暴露，不写插件工具代码。依赖处理按上游，不在插件层额外处理。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-049"></a>

### CAP-049 control-ui UI 控制技能　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-help/SKILL.md:116`、`skills/poteto-mode/playbooks/autopilot-full.md:14`、`README.md:264`、`skills/poteto-mode/playbooks/multi-phase-plan.md:15` |
| 🖱️ Cursor 行为 | `control-ui` 驱动浏览器、Electron 与 Web UI，采集截图和交互证据。 |
| 🧰 标准模式 | DSH 标准模式没有 UI 控制技能。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 需要外部 `agent-browser` 技能。Electron 与桌面应用要额外适配。 |
| 🛠️ 插件要求与验收 | 插件依赖 `agent-browser` 技能作为浏览器控制层。验收：打开页面、点击、截图并返回证据。 |
| ⚔️ 冲突 | `agent-browser` 是外部浏览器控制技能，`control-ui` 是 cursor-team-kit 的同类技能。两者都控制浏览器，同时使用会争抢同一个实例。约定只保留一个作为控制层。 |
| 🚧 最终遗留 | Electron 与桌面应用没有现成控制技能，需要自建。 |
| 💡 推荐 | 🟠 插件实现。插件依赖外部 `agent-browser` 技能作为唯一 UI 控制层。Electron 与桌面应用的控制不在本阶段实现。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-050"></a>

### CAP-050 control-cli CLI 控制技能　🔵 官方插件

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-help/SKILL.md:116`、`skills/poteto-mode/playbooks/autopilot-full.md:14`、`README.md:264`、`skills/poteto-mode/playbooks/multi-phase-plan.md:15` |
| 🖱️ Cursor 行为 | `control-cli` 驱动 CLI 与 TUI，使用 PTY 或 tmux 采集终端证据。 |
| 🧰 标准模式 | `bash` 可运行命令。交互式 TUI 需要持久终端插件。 |
| 🧩 官方插件 | 持久终端（`@deepseek-ai/dsh-experimental-terminal-bundle`）。 |
| 🕳️ 剩余缺口 | 没有现成的 control-cli 技能，DSH 标准模式也没有 TUI 驱动技能。 |
| ⚔️ 冲突 | `control-cli` 依赖 PTY 或 tmux，持久终端插件也提供终端。两套终端会话不能互相读取。 |
| 🚧 最终遗留 | 没有现成的 `control-cli` 技能，TUI 驱动要按项目自建。 |
| 💡 推荐 | 🔵 官方插件。启用持久终端（`@deepseek-ai/dsh-experimental-terminal-bundle`），`control-cli` 的 TUI 驱动走该插件的 PTY，不另建终端会话。 |
| ✅ 处置 | 官方插件 |

[返回审核清单](#审核清单)

<a id="cap-051"></a>

### CAP-051 deslop 代码去噪技能　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-help/SKILL.md:116`、`skills/poteto-mode/playbooks/autopilot-full.md:10`、`docs/guide/05-build-and-clean.md:59`、`README.md:263` |
| 🖱️ Cursor 行为 | 提交前运行 `cursor-team-kit` 的 `deslop`，删除叙述性注释、无依据的守卫、死兼容路径和无关改动。该技能使用 MIT 许可证。 |
| 🧰 标准模式 | DSH 标准模式没有代码清理技能。`deslop` 是 cursor-team-kit 的 MIT 单独技能，可作为 vendored 技能加载。pstack 自带的 `unslop` 只处理 prose。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | `deslop` 属于 `cursor-team-kit`，pstack 仓库和 DSH 标准模式都没有这份技能。 |
| 🛠️ 插件要求与验收 | 插件以 vendored 形式随包提供 `deslop` 技能目录，按上游 `SKILL.md` 原样复制到包内 `skills/deslop/`，保留 LICENSE 与来源版本，不写插件工具代码。验收：对一个真实 diff 运行一次，报告删除的注释与守卫。 |
| ⚔️ 冲突 | `deslop` 清代码，`unslop` 清 prose，名字接近但对象不同。不要把 `unslop` 当 `deslop` 用。 |
| 🚧 最终遗留 | `deslop` 只是指令技能，不能强制每个提交都运行，需要在 playbook 中显式点名。 |
| 💡 推荐 | 🟠 插件实现。插件以 vendored 形式随包提供 `deslop` 技能目录，保留上游 LICENSE 与来源版本，不写插件工具代码。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-052"></a>

### CAP-052 gt Graphite CLI　🔴 舍弃

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-mode/playbooks/autopilot-full.md:8`、`skills/poteto-mode/playbooks/babysit.md:7`、`skills/poteto-mode/playbooks/multi-phase-plan.md:56`、`skills/poteto-mode/playbooks/opening-a-pr.md:24` |
| 🖱️ Cursor 行为 | pstack 多次声明 `Never require Graphite (gt)`。它是可选的堆叠 PR 工具。 |
| 🧰 标准模式 | `git` 与 `gh` 可以完成堆叠 PR 操作，但没有 Graphite 的自动重排。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 上游明确非必需。未安装时按 `gh` 与 `git` 的路径执行。 |
| ⚔️ 冲突 | `gh` 与 Graphite 都能做堆叠 PR，但 Graphite 会重写分支。 |
| 🚧 最终遗留 | 上游明确非必需，缺少 Graphite 时堆叠操作更手工。 |
| 💡 推荐 | 🔴 舍弃。Graphite 依赖不实现，堆叠 PR 操作走 `git` 与 `gh`。 |
| ✅ 处置 | 舍弃 |

[返回审核清单](#审核清单)

<a id="cap-053"></a>

### CAP-053 Origin forge CLI　🔴 舍弃

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-mode/playbooks/autopilot-full.md:8`、`skills/poteto-mode/playbooks/babysit.md:7`、`skills/poteto-mode/playbooks/multi-phase-plan.md:56`、`skills/poteto-mode/playbooks/opening-a-pr.md:24` |
| 🖱️ Cursor 行为 | 若 `command -v origin` 成功则用 `origin pr`，否则回退 `gh`，并记录回退。 |
| 🧰 标准模式 | `gh` 是默认 forge。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 本机没有 `origin`。按上游规则回退 `gh`。 |
| ⚔️ 冲突 | Origin 与 `gh` 是两套 forge，上游要求二选一。 |
| 🚧 最终遗留 | 本机没有 Origin，固定走 `gh`。 |
| 💡 推荐 | 🔴 舍弃。Origin 路径不实现，forge 操作固定回退 `gh`。 |
| ✅ 处置 | 舍弃 |

[返回审核清单](#审核清单)

---

<a id="cat-g"></a>

## G 运行时与脚本　🟢 直接映射 12 · 🟠 插件实现 1 · 🔴 舍弃 1

<a id="cap-054"></a>

### CAP-054 Bun 运行时　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-mode/scripts/bootstrap.ts:21`、`skills/reflect/references/synthesizer.md:33`、`skills/statechart/scripts/statechart:22`、`skills/poteto-mode/scripts/bootstrap.ts:43` |
| 🖱️ Cursor 行为 | `watch-pr` 入口 shebang 是 `#!/usr/bin/env bun`，并调用 `bootstrap.ts` 安装依赖。 |
| 🧰 标准模式 | DSH 自带 Node 26。Bun 由 mise 安装，本机可用。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 插件必须声明 Bun 依赖。缺少 Bun 时 `watch-pr` 不可用。 |
| ⚔️ 冲突 | DSH 主运行时是 Node 26，`watch-pr` 要求 Bun。两套运行时并存。 |
| 🚧 最终遗留 | Bun 缺失时 `watch-pr` 不可用，不能改用 Node 运行，因为入口用了 Bun API。 |
| 💡 推荐 | 🟢 直接映射。`watch-pr` 原样保留 Bun shebang，插件声明 Bun 依赖。Bun 缺失时明确报错，不改写为 Node。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-055"></a>

### CAP-055 mise 工具管理器　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/statechart/scripts/run.ts:196`、`skills/statechart/scripts/run.ts:197`、`skills/statechart/scripts/run.ts:199`、`skills/statechart/scripts/run.ts:202` |
| 🖱️ Cursor 行为 | `statechart` 首次运行用 mise 安装 TLC 与 Java。 |
| 🧰 标准模式 | 本机有 mise。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 首次运行需要网络与管理器可用。 |
| ⚔️ 冲突 | mise 与 DSH 自己的 Node 运行时管理可能各自装工具。 |
| 🚧 最终遗留 | 首次安装需要网络。 |
| 💡 推荐 | 🟢 直接映射。`statechart` 首次运行用 mise 安装 TLC 与 Java。安装失败时报告工具链缺失，不跳过。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-056"></a>

### CAP-056 TLC 模型检查器　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/create-formal-verification-skill/SKILL.md:19`、`skills/poteto-help/SKILL.md:92`、`skills/statechart/scripts/backends/report.ts:135`、`docs/guide/06-verify-and-ship.md:110` |
| 🖱️ Cursor 行为 | `statechart` 的形式化验证路径调用 TLC。 |
| 🧰 标准模式 | 本机没有 `tlc`。`statechart` 首次运行通过 mise 安装 TLC。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 需要网络与 mise。安装失败时形式化验证不可用，必须明确报告，不把跳过算作成功。 |
| ⚔️ 冲突 | TLC 由 mise 安装，版本不受 DSH 管理。 |
| 🚧 最终遗留 | 离线或 mise 失败时形式化验证不可用。 |
| 💡 推荐 | 🟢 直接映射。TLC 由 mise 安装后调用。安装或下载失败时形式化验证标记为不可用，不把跳过算作通过。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-057"></a>

### CAP-057 Java 运行时　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/statechart/scripts/run.ts:69`、`skills/statechart/scripts/run.ts:195`、`skills/statechart/scripts/run.ts:199`、`skills/statechart/scripts/run.ts:205` |
| 🖱️ Cursor 行为 | `statechart` 的 `ConfigOracle.java` 与 TLC 需要 Java。statechart 首选 `java@temurin-25`。 |
| 🧰 标准模式 | 本机有 Temurin 17，statechart 会通过 mise 安装 `java@temurin-25`。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 需要网络与 mise 才能安装首选版本。已有 Java 11 以上可以手动指定 `JAVA`。 |
| ⚔️ 冲突 | statechart 首选 temurin-25，本机已有 Java 17，两个版本并存。 |
| 🚧 最终遗留 | 需要网络安装首选版本，或手动指定 `JAVA`。 |
| 💡 推荐 | 🟢 直接映射。优先用 mise 安装 `java@temurin-25`。安装失败时允许用户指定现有 Java 11+ 的 `JAVA` 路径。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-058"></a>

### CAP-058 gh GitHub CLI　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-mode/playbooks/autopilot-full.md:8`、`skills/recall/SKILL.md:21`、`skills/why/references/source-playbook.md:7`、`docs/harness/claude-code.md:67` |
| 🖱️ Cursor 行为 | PR 创建、检查、评审线程、合并、堆叠操作都走 `gh`。 |
| 🧰 标准模式 | 本机有 gh 2.100.0，已登录状态待用 `gh auth status` 验证。 |
| 🧩 官方插件 | 变更请求与工作树插件依赖 gh 登录。 |
| 🕳️ 剩余缺口 | 无 gh 凭证时 PR 步骤不可用。 |
| ⚔️ 冲突 | `gh` 与官方变更请求与工作树插件共用登录状态。 |
| 🚧 最终遗留 | 无 gh 凭证时 PR 步骤不可用。 |
| 💡 推荐 | 🟢 直接映射。PR 相关步骤先检查 `gh auth status`。未登录时停止并报告需要凭证，不降级为假成功。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-059"></a>

### CAP-059 check-plan.mjs 计划文件校验脚本　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-mode/playbooks/multi-phase-plan.md:10`、`skills/poteto-mode/scripts/check-plan.mjs:33`、`skills/poteto-mode/scripts/check-plan.test.ts:7`、`skills/poteto-mode/scripts/check-plan.test.ts:54` |
| 🖱️ Cursor 行为 | poteto-mode 的 `check-plan` 入口，校验计划文件。 |
| 🧰 标准模式 | Node 脚本，带可执行位，无外部依赖。原样复制即可运行。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-060"></a>

### CAP-060 watch-pr 脚本　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-mode/playbooks/babysit.md:12`、`skills/poteto-mode/playbooks/shipping.md:9`、`skills/poteto-mode/scripts/package.json:6`、`skills/poteto-mode/scripts/package.json:7` |
| 🖱️ Cursor 行为 | babysit 与 shipping 用 `watch-pr` 轮询 PR 状态，输出 JSON 或人类可读文本。 |
| 🧰 标准模式 | Bun 入口，依赖 `commander@14.0.0` 与 `gh`；`bootstrap.ts` 会在运行时安装依赖。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 需要 Bun、网络与 gh 登录。首次运行会写 `node_modules`。 |
| ⚔️ 冲突 | `watch-pr` 轮询 `gh`，官方变更请求与工作树插件也显示 PR 状态，两边可能不同步。 |
| 🚧 最终遗留 | `watch-pr` 只支持 GitHub，不支持 Origin。 |
| 💡 推荐 | 🟢 直接映射。`watch-pr` 原样运行，首次执行由 `bootstrap.ts` 安装依赖。只支持 GitHub，Origin 路径回退 `gh`。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-061"></a>

### CAP-061 worktree-audit 脚本　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-mode/playbooks/worktree-cleanup.md:3`、`skills/poteto-mode/scripts/worktree-audit.sh:7` |
| 🖱️ Cursor 行为 | worktree-cleanup 用 `worktree-audit.sh` 分类工作树，输出清理建议。 |
| 🧰 标准模式 | Bash 脚本，依赖 `git`。原样复制并保留可执行位。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | `worktree-audit` 扫描所有 git 工作树，Git 工作树插件创建的目录也会被扫描。 |
| 🚧 最终遗留 | 扫描结果包含非本插件创建的工作树，需要人工确认。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-062"></a>

### CAP-062 log.sh 决策日志脚本　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/show-me-your-work/scripts/log.sh:3`、`skills/show-me-your-work/scripts/log.sh:7`、`skills/show-me-your-work/SKILL.md:38` |
| 🖱️ Cursor 行为 | show-me-your-work 用 `log.sh` 追加 TSV 行，自动写表头、转义单元格。 |
| 🧰 标准模式 | Bash 脚本，依赖 `date` 与基础 shell 工具。原样复制并保留可执行位。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 无。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 无。 |
| 💡 推荐 | 🟢 直接映射。标准模式覆盖，无剩余缺口。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-063"></a>

### CAP-063 statechart 脚本树　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/create-formal-verification-skill/SKILL.md:35`、`skills/poteto-help/SKILL.md:92`、`skills/statechart/scripts/package.json:2`、`docs/guide/06-verify-and-ship.md:118` |
| 🖱️ Cursor 行为 | TLA+ 模型检查与 Mermaid 状态图生成，入口是 `scripts/statechart`。 |
| 🧰 标准模式 | `sh` 启动器选择 TypeScript 运行时，调用 `statechart.ts`。首次运行用 mise 安装 TLC 与 Java。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 依赖 Bun 或 Node 的 TypeScript 执行、mise、TLC、Java 与网络。TLC 缺失时正式检查不可用。 |
| ⚔️ 冲突 | `statechart` 输出 Mermaid 文本，不提供图片渲染；需要图片时由用户在插件之外生成。 |
| 🚧 最终遗留 | TLC 与 Java 需要 mise 安装，首次运行依赖网络。 |
| 💡 推荐 | 🟢 直接映射。`statechart` 原样运行。TLC、Java 或网络缺失时报告不可用，只输出 Mermaid 文本，不声称完成形式化检查。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-064"></a>

### CAP-064 bootstrap.ts 依赖安装器　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/poteto-mode/scripts/watch-pr/watch-pr:2` |
| 🖱️ Cursor 行为 | `watch-pr` 启动前调用 `ensureDependenciesInstalled()`，安装 `commander` 等依赖。 |
| 🧰 标准模式 | Node/Bun 脚本，会写 `node_modules` 并访问网络。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 离线环境不可用。需要声明网络与写盘。 |
| ⚔️ 冲突 | `bootstrap.ts` 用 Bun 安装依赖，和仓库的 pnpm 是两套包管理。 |
| 🚧 最终遗留 | 离线环境不可用，且会在技能目录写 `node_modules`。 |
| 💡 推荐 | 🟢 直接映射。`bootstrap.ts` 保持原样，首次运行联网安装到技能目录的 `node_modules`。离线时报告依赖缺失。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

<a id="cap-065"></a>

### CAP-065 Pele 图表渲染　🟠 插件实现

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/statechart/references/render.md:3`、`skills/statechart/references/render.md:7`、`skills/statechart/references/render.md:9`、`skills/statechart/SKILL.md:76` |
| 🖱️ Cursor 行为 | statechart 用 npm 包 `pele@1.9.0` 把 `.mmd` 渲染成 SVG，API 在 `https://pele.run/api`。 |
| 🧰 标准模式 | DSH 标准模式没有图表渲染器。`statechart` 把颜色写进 `chart.mmd` 的 `classDef`/`class` 行，缺的只是一个画笔。 |
| 🧩 官方插件 | 无。社区 `dsh-plugin-mermaid-gb-svg` 按固定约定转 SVG，不认 statechart 的标注配色。 |
| 🕳️ 剩余缺口 | 本包新增 `pstack_chart`：解析 statechart 发出的 Mermaid 子集，画成独立 SVG，内置 `breaks`/`mayBreak`/`bugPath`/`repeats` 调色板（后两类上游只写 `class` 不写 `classDef`），不依赖 Mermaid、浏览器或外部二进制。 |
| 🛠️ 插件要求与验收 | 工具 `pstack_chart`（`input` 指向 `chart.mmd`，默认写 `<input>.svg`）；`tests/chart.test.ts` 覆盖解析、配色、转义、行号报错与整份语料渲染；`pstack\skills\statechart\scripts\test\corpus` 33 份图全部可渲染。验收：`vp test run tests/chart.test.ts` 通过，且不新增运行时依赖。 |
| ⚔️ 冲突 | 布局是确定的近似值，不是 Mermaid 的排版。`chart.mmd` 仍是权威产物；无法解析的行按行号报错，不猜测。 |
| 🚧 最终遗留 | 交叉边与自环只画一条近似曲线；复杂图的可读性不如 Pele 的在线渲染。 |
| 💡 推荐 | 🟠 插件实现。 |
| ✅ 处置 | 插件实现 |

[返回审核清单](#审核清单)

<a id="cap-066"></a>

### CAP-066 视频渲染　🔴 舍弃（延期）

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/ketchup-video/SKILL.md:27`、`skills/poteto-mode/playbooks/multi-phase-plan.md:123` |
| 🖱️ Cursor 行为 | ketchup-video 要求把幻灯片渲染成带字幕的无声 mp4，逐帧检查字幕可读性与停留时长。 |
| 🧰 标准模式 | DSH 没有视频生成工具。只能通过 `bash` 调用外部渲染器。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 本插件不提供内置视频渲染器；社区 `dsh-ffmpeg` 只能做转码、字幕与抽帧。 |
| 🛠️ 插件要求与验收 | 无。本轮不实现，标记为 deferred。 |
| ⚔️ 冲突 | `ketchup` 与 `ketchup-video` 共用截图素材。插件只提供文字摘要，视频需用户在插件之外生成。 |
| 🚧 最终遗留 | 没有内置视频输出，`ketchup-video` 只能说明无法渲染。 |
| 💡 推荐 | 🔴 舍弃（延期）。本轮不做；若以后要做，先补幻灯片生成，再接 `dsh-ffmpeg`。 |
| ✅ 处置 | 舍弃 |

[返回审核清单](#审核清单)

<a id="cap-067"></a>

### CAP-067 性能测量 工具链　🟢 直接映射

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | `skills/benchmark-checklist/SKILL.md:3`、`skills/poteto-mode/playbooks/hillclimb.md:10`、`skills/setup-pstack/SKILL.md:51`、`skills/why/references/epistemics.md:17` |
| 🖱️ Cursor 行为 | benchmark-checklist 要求用 `uptime`、`nproc`、`top`、`pidstat`、`node --cpu-prof`、`py-spy`、`perf`、`strace` 定位限制因素。 |
| 🧰 标准模式 | 全部通过 `bash` 调用。 |
| 🧩 官方插件 | 无。 |
| 🕳️ 剩余缺口 | 本机缺少 `py-spy`。其余命令可用。缺工具时按 benchmark-checklist 的要求写明限制，不猜数字。 |
| ⚔️ 冲突 | 无。 |
| 🚧 最终遗留 | 缺少 `py-spy`，Python 性能剖析只能换工具或跳过。 |
| 💡 推荐 | 🟢 直接映射。性能测量全部走 `bash`。缺少 `py-spy` 时先说明并询问是否安装；不安装时改用 `perf`、`strace` 或 `node --cpu-prof`，都没有就在报告中写明限制，不猜数字。 |
| ✅ 处置 | 直接映射 |

[返回审核清单](#审核清单)

## 脚本登记

上游脚本原样复制，不重写为 Node。下表逐个登记用途、解释器、外部命令和限制。

| 编号 | 入口 | 用途 | 解释器 | 外部命令 | 网络与写入 | 本机可用性 | 限制 |
|---|---|---|---|---|---|---|---|
| SCR-001 | `skills/poteto-mode/scripts/check-plan.mjs` | multi-phase-plan 的计划文件校验，见 `skills/poteto-mode/playbooks/multi-phase-plan.md:10` | `#!/usr/bin/env node` | 无 | 只读计划文件，不写盘 | node 26 可用 | 无 |
| SCR-002 | `skills/poteto-mode/scripts/watch-pr/watch-pr` | babysit 与 shipping 的 PR 轮询，见 `skills/poteto-mode/playbooks/babysit.md:12` | `#!/usr/bin/env bun` | `gh`、`git` | 首次运行 `bun install --frozen-lockfile` 写 `node_modules`，需要网络 | bun 可用，gh 2.100.0 可用 | 需要 gh 登录与网络 |
| SCR-003 | `skills/poteto-mode/scripts/worktree-audit.sh` | worktree-cleanup 的工作树分类，见 `skills/poteto-mode/playbooks/worktree-cleanup.md:3` | `#!/usr/bin/env bash` | `git`、`gh`、`awk`、`du`、`stat`、`date`、`head`、`sort` | 只读审计；可能执行 `git fetch` | bash 与 git 可用 | gh 未登录时 PR 状态缺失 |
| SCR-004 | `skills/show-me-your-work/scripts/log.sh` | show-me-your-work 的 TSV 决策日志，见 `skills/show-me-your-work/SKILL.md:38` | `#!/usr/bin/env bash` | `date`、`mkdir`、`printf`、`tr` | 追加写日志文件 | 可用 | 无 |
| SCR-005 | `skills/statechart/scripts/statechart` | TLA+ 模型检查与 Mermaid 状态图，见 `skills/statechart/SKILL.md:14` | `#!/bin/sh`，依次尝试 node、bun、deno | `mise`、`java`、`tlc` | 首次 `mise install` 需要网络，写临时目录与输出目录 | node、bun、mise 可用，tlc 缺失 | 需要网络安装 TLC 与 `java@temurin-25` |
| SCR-006 | `skills/statechart/scripts/test/java.ts` | statechart 的 Java 测试辅助，调用 `ConfigOracle.java` 与 `tlc2.TLC` | `#!/usr/bin/env node` | `java`、`tlc2.TLC` | 只读测试 | java 17 可用，TLC 由 mise 安装 | 无 TLC 时不可用 |
| SCR-007 | `automations/benny` | 问题分诊与复现自动化，依赖 Slack、Cursor Automations 与 webhook | Cursor Automations | Cursor 平台 | routine 与 webhook | 不可用 | 上游 `claude-code.md` 排除 Automations，按平台排除项处理 |

## 技能覆盖索引

按扫描命中生成，用于定位。一个技能可能在正文里以同义说法要求某项能力，索引不替代上面的逐项判断。表内列出全部 58 个技能，没有任何词表命中的技能也保留，说明它对宿主没有专门接口要求，只使用通用 Bash 与文件工具，或只用文字约定。

| 技能 | 命中的能力编号 | 说明 |
|---|---|---|
| architect | CAP-003 CAP-004 CAP-023 CAP-024 CAP-028 CAP-031 | 见上方能力小节 |
| arena | CAP-001 CAP-003 CAP-004 CAP-020 CAP-023 CAP-024 CAP-026 CAP-027 CAP-028 CAP-031 | 见上方能力小节 |
| automate-me | CAP-002 CAP-004 CAP-005 CAP-011 CAP-030 CAP-034 CAP-045 | 见上方能力小节 |
| benchmark-checklist | CAP-067 | 见上方能力小节 |
| blast-radius | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| bro | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| correct | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| create-formal-verification-skill | CAP-004 CAP-056 CAP-063 | 见上方能力小节 |
| create-verification-skill | CAP-004 CAP-030 CAP-043 | 见上方能力小节 |
| figure-it-out | CAP-003 CAP-004 | 见上方能力小节 |
| how | CAP-001 CAP-004 CAP-013 CAP-014 CAP-017 CAP-023 CAP-024 CAP-026 CAP-027 CAP-028 CAP-031 | 见上方能力小节 |
| in-your-own-words | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| interrogate | CAP-004 CAP-014 | 见上方能力小节 |
| ketchup | CAP-004 CAP-012 | 见上方能力小节 |
| ketchup-video | CAP-004 CAP-066 | 见上方能力小节 |
| maintain-formal-verification-skill | CAP-004 | 见上方能力小节 |
| maintain-verification-skill | CAP-004 CAP-030 CAP-043 | 见上方能力小节 |
| make-bot-ui | CAP-035 CAP-036 CAP-046 CAP-047 | 见上方能力小节 |
| no-comments | CAP-001 CAP-004 CAP-013 CAP-016 | 见上方能力小节 |
| poteto-help | CAP-003 CAP-004 CAP-005 CAP-011 CAP-013 CAP-015 CAP-026 CAP-027 CAP-028 CAP-029 CAP-031 CAP-038 CAP-039 CAP-041 CAP-042 CAP-043 CAP-046 CAP-048 CAP-049 CAP-050 CAP-051 CAP-056 CAP-063 CAP-068 | 见上方能力小节 |
| poteto-mode | CAP-001 CAP-002 CAP-003 CAP-004 CAP-005 CAP-011 CAP-013 CAP-015 CAP-018 CAP-020 CAP-023 CAP-024 CAP-026 CAP-027 CAP-029 CAP-034 CAP-036 CAP-038 CAP-039 CAP-040 CAP-041 CAP-045 CAP-046 CAP-048 CAP-049 CAP-050 CAP-051 CAP-052 CAP-053 CAP-054 CAP-058 CAP-059 CAP-060 CAP-061 CAP-064 CAP-066 CAP-067 | 见上方能力小节 |
| principle-attack-the-premise | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-boundary-discipline | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-build-the-lever | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-encode-lessons-in-structure | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-exhaust-the-design-space | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-experience-first | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-explain-the-number | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-fix-root-causes | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-foundational-thinking | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-guard-the-context-window | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-laziness-protocol | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-make-operations-idempotent | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-migrate-callers-then-delete-legacy-apis | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-minimize-reader-load | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-model-the-domain | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-never-block-on-the-human | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-outcome-oriented-execution | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-prove-it-works | CAP-004 | 见上方能力小节 |
| principle-redesign-from-first-principles | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-separate-before-serializing-shared-state | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-sequence-verifiable-units | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-subtract-before-you-add | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-test-behavior-not-implementation | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| principle-type-system-discipline | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| recall | CAP-004 CAP-034 CAP-045 CAP-058 | 见上方能力小节 |
| reflect | CAP-001 CAP-004 CAP-005 CAP-011 CAP-013 CAP-014 CAP-017 CAP-023 CAP-024 CAP-025 CAP-026 CAP-027 CAP-028 CAP-030 CAP-031 CAP-032 CAP-034 CAP-038 CAP-045 CAP-054 | 见上方能力小节 |
| setup-pstack | CAP-001 CAP-002 CAP-004 CAP-023 CAP-024 CAP-026 CAP-027 CAP-028 CAP-029 CAP-031 CAP-067 | 见上方能力小节 |
| sharpen | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| show-me-your-work | CAP-004 CAP-034 CAP-062 | 见上方能力小节 |
| statechart | CAP-041 CAP-054 CAP-055 CAP-056 CAP-057 CAP-063 CAP-065 | 见上方能力小节 |
| swarm | CAP-001 CAP-003 CAP-004 CAP-013 CAP-014 CAP-018 CAP-019 CAP-020 CAP-024 CAP-026 CAP-027 CAP-028 CAP-031 | 见上方能力小节 |
| tdd | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| teach | CAP-004 | 见上方能力小节 |
| technical-writing | CAP-004 | 见上方能力小节 |
| typescript-best-practices | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| unslop | 无命中 | 无专门接口要求，使用通用 Bash 与文件工具 |
| why | CAP-001 CAP-004 CAP-005 CAP-014 CAP-017 CAP-023 CAP-024 CAP-026 CAP-027 CAP-028 CAP-031 CAP-037 CAP-045 CAP-058 CAP-067 | 见上方能力小节 |
