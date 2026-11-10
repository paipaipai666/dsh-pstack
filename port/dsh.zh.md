# pstack 在 DeepSeek Harness 中的适配

pstack 技能沿用 Cursor 名称。在 DeepSeek Harness 中，每个会话先读一次本文件，再按下面表格映射技能里的 Cursor 名称。`<pstack>` 指已安装 `dsh-pstack` 包中包含 `skills/` 与 `docs/` 的目录。如果某个 Cursor 字段没有对应行，就丢弃它并说明。不要把工具 schema 不接受的值传进去。

## 工具

| Cursor | DeepSeek Harness |
| --- | --- |
| `Task` | `pstack_subagent`。一次调用为单条路由或选中的列表条目启动一个新鲜子代理；自动面板角色为每个条目启动一个。返回所有子会话 id 和解析后的路由。结果以完成通知返回，不要轮询。 |
| `AskQuestion` | `ask_user_question`。接受 `questions` 数组、选项、`multi_select` 和自由输入。只有活的根代理有真人回答者。被委派的子代理把问题写进报告。 |
| 打开待办清单 | `todo_write`，每次传完整列表并替换上一次。状态只有 `pending`、`in_progress`、`completed`。跳过的步骤写成 `skip: <reason> - <step>`，状态标为 `completed`。 |
| 运行另一个 pstack 技能（`/name` 或 “the **name** skill”） | `pstack_skill`，传精确的 kebab-case `name`。它可以加载被 `disable-model-invocation` 从 `skill` 目录隐藏的 pstack 技能。传相对 `resource` 读取 `SKILL.md` 旁的 reference 或 playbook。用户命令保持原名，例如 `/setup-pstack`；DSH 不加 `pstack:` 前缀。 |
| `Grep`、`Glob` | 用 `grep`、`glob` 做发现，已知文件用 `read`，shell 命令用 `bash`。`grep` 使用 ripgrep 语法。搜索工具超限时报告结果保存位置。 |

## 子代理字段

| Cursor | DeepSeek Harness |
| --- | --- |
| `subagent_type: generalPurpose` | `agent: "general"`，加入父代理 preset，继承父工具。每次调用还要传 `description`、`prompt`、`role`、`roleIndex`、`reasoningEffort`、`cwd`；只有 `maxDepth` 可选。未用的值传 `null`。`roleIndex` 需要非空 role。非空 `cwd` 必须在会话目录或独立 Git 工作树内。省略或传 `null` 时使用插件行与 Host 的配置上限；显式 `maxDepth` 必须至少为 1，且不能超过该上限。 |
| `poteto-agent`、`comment-sicko` | `agent: "poteto-agent"`、`agent: "comment-sicko"`。插件把它们声明为 `@deepseek-ai/dsh-agent-preset`。`poteto-agent` 注入 pstack 人格和 `poteto-mode` 指令的绝对路径；`comment-sicko` 挂载评论评审 preset。它们不是 `subagent_type` 值。 |
| `readonly: true` | `agent: "readonly"`。readonly preset 挂载只读沙箱策略，拒绝文件写入和可写 shell 命令，保留读取和查询。 |
| `readonly: false` | `agent: "general"`，继承父工具，包括已挂载的 MCP 工具。 |
| `environment: "cloud"` | 没有云 VM。用 `create_worktree` 创建本地 checkout，把路径传给 `cwd`，并写明分支或提交。只有 checkout 和分支被隔离。需要云面板或专属机器的步骤跳过。 |
| `environment: "local"` | `cwd: null`，继承会话目录。 |
| `cloud_base_branch: <b>` | `create_worktree({ from: "<b>" })`，或让子代理先检出 `<b>`。`from` 只解析本地引用，不 fetch。 |
| `run_in_background: true` | 省略。每个 `pstack_subagent` 都是托管激活，通过完成通知返回。没有后台字段。 |
| `resume` | 对已有子会话 id 使用 `send_message`。空闲的可继续子代理会冷恢复；运行中的子代理在下一个步骤边界收到消息。 |
| `file_attachments` | 把真实路径列在 `prompt` 里。没有附件参数。 |

## 模型

| Cursor | DeepSeek Harness |
| --- | --- |
| `claude-<family>-<version>-<effort>[-fast]`，如 `claude-opus-5-5-xhigh` | 不要把 Cursor slug 传给 `pstack_subagent`。传 `role: "<role key>"`，由 `$DSH_HOME/pstack-models.mdc` 给出精确的 `<provider>/<model> [effort]` 路由。去掉 `-fast`。DSH 没有速度参数。先用 `pstack_models` 查看本部署实际提供的路由。调用可用 `reasoningEffort` 覆盖角色起始强度，值必须是目标模型声明的 token。 |
| `grok-*`、`gpt-*` 或其他非 Claude slug | 传 `role: null` 让子代理继承父路由，并说明。角色值写 `inherit-parent` 或 `auto` 也一样。 |
| `auto` 或 `inherit-parent` | 传 `role: null`，或把角色值写成 `inherit-parent` / `auto`。`pstack_subagent` 不发送路由覆盖。 |
| `pstack-models.mdc` 规则，`~/.cursor/rules/pstack-models.mdc` | `$DSH_HOME/pstack-models.mdc`。`pstack_subagent` 每次委派重新读取，所以改动只影响下一个子代理，不影响运行中的子代理。文件缺失时所有角色继承父路由；文件不可读是错误；坏行按行号报告。角色名来自 pstack 角色清单。 |
| 角色值 `<model> <effort>`，如 `opus high` | `<provider>/<model> [effort]`，如 `provider/model [high]`。按第一个 `/` 分割。方括号里的 effort 必须是模型声明的 token。逗号分隔表示列表。`arena runners`、`architect runners`、`interrogate reviewers` 是自动面板，每个条目启动一个子代理。`arena cross-judge pool` 和 `swarm workers` 用 `roleIndex` 选一个条目（null 选第一个）。`swarm workers` 是每个 worker 的默认路由。`arena cross-judge pool` 跳过 `inherit-parent` 和 `auto`，优先选择与父模型不同家族的路由。角色可能为列表时先调 `pstack_roles`。 |

## setup-pstack

`setup-pstack` 写 `$DSH_HOME/pstack-models.mdc`，`pstack_subagent` 每次委派都会读它。先运行 `pstack_models`，它报告本部署真实 provider、model 和 reasoning-effort token，不根据 Cursor slug 猜测路由。Web 插件设置页的 pstack 标签编辑同一文件；后写覆盖先写，下一次委派直接生效，无需重启。

- 探测。枚举 `pstack_models` 返回的路由，写成 `<provider>/<model> [effort]`。effort 必须是该路由声明的 token。探测不到时让用户粘贴路由，不要写未确认的路由。`inherit-parent` 与 `auto` 始终有效。
- 默认值。按模型表把默认 Cursor slug 换成 `pstack_models` 返回的真实路由。按预算调整 effort：`unlimited`、`large`、`medium`、`small` 对应 `max`、`xhigh`、`high`、`medium`。模型没有该 token 时选不高于目标的最高可用 effort 并说明；所有 effort 都高于目标时让用户选择；没有 effort 时保留不带方括号的路由并说明。
- 写入。写 `$DSH_HOME/pstack-models.mdc`，不要 frontmatter；先写注释行、`# budget:` 行，再写每个角色一行。覆盖整个文件，保证重跑幂等。删除某行就是让该角色继承父路由。未知或已退休的角色行按行号报告、从新文件删除并告诉用户。不要把角色行写进 `AGENTS.md` 或 `CLAUDE.md`。

## 路径

| Cursor | DeepSeek Harness |
| --- | --- |
| `.cursor/skills/`、`~/.cursor/skills/` | 项目的 `.dsh/skills/` 或 `.agents/skills/`，用户的 `$DSH_HOME/skills/` 或 `~/.agents/skills/`。随包的 pstack 技能在 `<pstack>/skills/`，通过 `pstack_skill` 加载，相对资源就地读取。 |
| `~/.cursor/plugins/`、`.cursor-plugin/plugin.json` | 已安装 `dsh-pstack` 包的绝对资源路径。在 `SKILL.md` 旁边解析 `references/`、`playbooks/`、`scripts/`。随包脚本保留各自声明的解释器（`node`、`bun`、`bash`、`sh`），从 shell 运行；它们不会被盲目地交给 `bash` 执行，插件也不包装它们。通过 DSH profile 或 bundle 安装，不要扫描插件缓存取最高版本。 |
| `.cursor/rules/*.mdc`、always-applied 规则 | 项目说明写进 `AGENTS.md`。DSH 在每个新会话加载 `$DSH_HOME/AGENTS.md`、`<agentsHome>/AGENTS.md` 和项目指令链，不加载 `.mdc`。pstack 角色文件是例外，只有 `pstack_subagent` 读取。 |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | 包内包含该文件时用 `<pstack>/<path>`，读本地副本，不要 fetch。用户要链接时再给公开 URL。 |
| `~/.cursor/projects/<slug>/agent-transcripts/` 下的会话记录 | 可选 `@deepseek-ai/dsh-experimental-session-search` 插件（实验性，默认关闭）。`session_search` 查找 `cwd` 与当前会话完全相同的旧会话；`session_event_search`、`session_trace`、`session_event_trace`、`session_event_read` 用于检查。对当前会话用自己的 id 调 `session_event_search`。不要读 Cursor transcript 目录。 |

## Cursor 专属功能

DeepSeek Harness 没有 Cursor Automations、Bugbot、Cursor 云代理或内置 PR 工具。步骤需要这些能力时，在回复里写一行 `Skipped in DeepSeek Harness: <step>. <reason>.`，然后继续下一步；不要停止、询问或重试。后续步骤需要前面跳过的产物（如 URL、key 或机器）时，留占位符并在这行点名。跳过的步骤不算通过；不可用验证单独报告。

| Cursor | DeepSeek Harness |
| --- | --- |
| Cursor Automations：routine、`update_state` routine 调用、`api2.cursor.sh/automations` webhook、routine 唤醒、`SendToUser` 密钥请求 | 按上面跳过。`schedule_create` 处理本地定时跟进，但不是 routine，也不接收 Cursor webhook。不要在聊天里索要 `SendToUser` 密钥。只为 `make-bot-ui` 的 routine、sender key 或唤醒循环存在的步骤也跳过。 |
| Bugbot | Bugbot 的 GitHub PR 评论就是普通评审线程，用步骤给出的 forge 命令处理。PR 没有 Bugbot check 或评论时，跳过启动、等待或配置 Bugbot 的步骤。 |
| Cursor 云代理 | `environment: "cloud"` 按子代理字段映射到本地工作树。需要云代理本身（如面板状态或专属机器）的步骤跳过。 |
| 内置 PR 工具 | 用步骤给出的 forge 命令，如 `gh pr create`；这不是跳过，不写跳过行。要在 DSH 中查 PR 状态、检查、评审和合并，可启用实验性 `@deepseek-ai/dsh-experimental-forge-bundle`（默认关闭），否则用 `gh`。两者都没有时报告 forge 步骤被阻塞。 |
| Cursor Projects | Skipped in DeepSeek Harness: 运行一个在笔记本关闭后仍持续的 Cursor Project 云子代理。DSH 没有 Cursor Project 服务或云协调器，本地 agent team 和 workflow 不是等价替代。 |

## 本地替代

| Cursor | DeepSeek Harness |
| --- | --- |
| `create-skill` | 用 vendored `writing-for-agents` 技能创建或评审技能，再直接写并校验 `SKILL.md`。 |
| `/deslop` | 用 vendored `deslop` 技能清除 diff 中的 AI 代码噪声；`unslop` 只处理 prose。 |
| `/loop` | 自动继续用 `create_goal`，定时心跳用 `schedule_create`，可观察事件用后台 `bash` watcher。它们不订阅 forge 事件。 |
| `/automate` | 用 `writing-for-agents` 把已验证的工作模式写成个人技能。需要历史证据时用 Optional plugins 里的 session-search 后备。 |
| Custom Mode | 新建会话时选择随包 `poteto-mode` 根 preset 使用标准工具面，或选择 `poteto-mode-creator` 使用创造模式工具面。两者都把完整技能常驻系统提示直到会话结束。如果会话使用其它 preset，就在每个任务调用 `/poteto-mode`。 |
| `/visualize` | 图表用 Mermaid。DSH 没有内置图表渲染器，返回 Mermaid 文本，不要声称已生成图片。 |
| `statechart` | 图表用 Mermaid。DSH 没有内置 SVG 渲染器，忽略 `references/render.md` 的渲染步骤，返回 `chart.mmd` 文本，不要声称已生成图片。 |
| `ketchup-video` | 视频用文字摘要。DSH 没有内置视频渲染器，不要声称已生成视频。 |
| `control-ui`、`control-cli`、`cursor-team-kit` | 包内 vendored `control-ui` 与 `control-cli` 指令技能。浏览器与 PTY 依赖写在其 `SKILL.md`；需要时启用 `@deepseek-ai/dsh-browser-use` 或实验性持久终端 bundle。不可用的 GUI 或视频证据标记为跳过。 |

## 可选插件

以下 DSH 插件默认关闭。通过插件页或 `dsh plugin --profile <profile> add <package>` 启用，必要时重启 profile。插件未启用不代表依赖它的步骤通过。

| 插件包 | 启用后的能力 | 未启用时 |
| --- | --- | --- |
| `@deepseek-ai/dsh-experimental-forge-bundle` | PR 面板、检查、评审、ready、合并、会话绑定和模型侧 `create_worktree`。 | 用 `bash` 调 `gh` 或 `git worktree add`。 |
| `@deepseek-ai/dsh-browser-use` 加一个浏览器 provider | 浏览器导航、输入、截图和 ARIA 快照。 | 用项目自带浏览器脚本；否则标记浏览器证据跳过。 |
| `@deepseek-ai/dsh-cua-bundle` | macOS 桌面应用控制和截图。 | 用项目自带桌面驱动；否则标记桌面证据跳过。 |
| `@deepseek-ai/dsh-experimental-terminal-bundle` | CLI 与 TUI 验证所需的持久 PTY 工具。 | 用 `bash` 前台命令或后台 job。 |
| `@deepseek-ai/dsh-experimental-session-search` | 会话历史搜索和事件检查。 | 用用户提供的 resume note 或证据。 |
| `@deepseek-ai/dsh-mcp-client` | 已配置的 MCP 工具。 | 检查本地文件，使用标准搜索或 fetch 工具。 |
| `@deepseek-ai/dsh-experimental-agent-team-profile` | Lead/teammate 角色和共享任务板。 | 不要在提供 pstack 根预设的 profile 中启用 Agent Teams。两者都拥有派发和任务协调能力；检测到 Agent Teams 服务时，pstack 根预设会直接启动失败。 |
| `@deepseek-ai/dsh-experimental-ralph-bundle` | 带结构化交接的前台 `ralph` 循环。 | 用 `create_goal` 配 `schedule_create` 或后台 `bash` watcher。 |
