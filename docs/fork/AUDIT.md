# pstack 上游对照与质量审查

> 审查时间：2026-11-06  
> 上游基线：`cursor/plugins` 的 `pstack` 0.15.36（提交 `ae5650f`，由 `pstack/README.md` 记录）  
> 当前 fork：`l246804/dsh-pstack` v0.3.0-beta.1 + 本仓修复  
> 目标宿主：DeepSeek Harness `0.2.2-rc.1`

## 1. 资产盘点

| 资产 | 上游 pstack | 当前 fork | 结论 |
|---|---:|---:|---|
| `SKILL.md` | 58（34 普通 + 24 principle） | 58 | 一致 |
| Playbook | 23 | 23 | 一致 |
| Agent 定义 | 2（`poteto-agent`、`comment-sicko`） | 2 | 一致 |
| Guide 文档 | 11 | 11 | 一致 |
| 技能 reference | 29 | 62（含上游 copy 与本地/生成引用） | 多于上游，属于打包差异 |
| 原生工具 | Cursor 的 Task/AskQuestion 等 | 8 个：`pstack_skill`、`pstack_models`、`pstack_roles`、`pstack_doctor`、`pstack_subagent`、`pstack_script`、`pstack_remote`、`pstack_chart` | 已替换为 DSH 原生接口 |
| Agent preset | Cursor custom modes | 3 个：`pstack`（常驻）、`poteto-agent`、`comment-sicko` | 覆盖常驻模式与委派 |
| 脚本入口 | 5 个 | 5 个：`check-plan`、`watch-pr`、`worktree-audit`、`log`、`statechart` | 一致，均 Node 重写 |
| 测试文件 | 上游无 DSH 测试 | `tests/` 29 个文件 233 个用例，另有 `runtime/` 72 个脚本用例（Windows 跳过 4 个） | 已建立 QA 基线 |

## 2. 与上游的功能差异

### 已保留

- 58 个技能、23 个 playbook、24 条 principle 的正文全部随包发布。
- `poteto-mode` 的 23 个 playbook 路由、principle 索引、PR/验证/自动化工作流。
- `poteto-agent` / `comment-sicko` 两个子代理角色。
- 5 个脚本的 Node 版本，保留原 CLI 参数、退出码和输出格式。

### 已替换为 DSH 原生能力

| 上游 Cursor 概念 | 当前 DSH 实现 |
|---|---|
| `Task` / `subagent_type` | `pstack_subagent` + `agent` / `role` |
| Cursor 模型 slug（`grok-*`、`claude-*` 等） | `pstack_models` 实时目录 + `pstack-models.mdc` 角色路由 |
| `AskQuestion` | `ask_user_question` |
| `TodoWrite` | `todo_write` |
| `~/.cursor/rules/pstack-models.mdc` | `$DSH_HOME/pstack-models.mdc` |
| `.cursor/skills/` | `.dsh/skills/` 或 `.agents/skills/` |
| Cursor Custom Mode | `pstack` agent preset 常驻模式 |
| Cursor 脚本路径 | `pstack_script` 的 5 个固定 `id` |

### 明确不移植（平台边界）

这些是 Cursor 平台能力，当前 fork 不假装实现：

- Cursor Automations、webhook、`SendToUser`、routine wake
- Bugbot 的启动、配置、等待
- Cursor cloud agents、Projects
- macOS 之外的 CUA 完整支持
- 内置录屏、视频渲染、图像生成

`pstack_script` 已接入 Host 审批；它仍绕过文件系统沙箱，这是 DSH 运行时限制，已在 README 和 DSH 适配文档中标注。

## 3. 测试与质量保障

### 新增的守卫

- `port/scan.mjs --check-lock`：能力扫描结果与 `port/audit.lock.json` 的一致性（取代 fork 自己的 parity/drift 测试）
- `port/scan.mjs --check port/audit.md`：审核记录里引用的行号仍然成立
- `tests/cordis-config.test.ts`：bundle 行、preset、`maxDepth: 2`、package exports
- `tests/native-text.test.ts`：Cursor 名称运行时转译，扫描生成的 `pstack/` 下全部 Markdown（不只是 58 个技能正文）
- `tests/poteto-mode.test.ts`、`tests/preset-copy.test.ts`、`tests/preset-parity.test.ts`：根 preset 的工具集与 `cordis.patch.yml` 一致（用 `tests/patch-name.ts` 抹平作用域包名带来的引号差异）
- `tests/skill-sources.test.ts`：`package.json` 声明的技能、`skills/.agents/skills` 目录、两份锁文件三方一致
- `tests/subagent.test.ts`：可选参数默认 null
- `tests/script.test.ts`：`pstack_script` 的窗口/超时/后台行为
- `tests/script-policy.test.ts`：`ask`/`allow`/`deny` 三种 pre-execute 策略与非法配置
- `tests/doctor.test.ts`：命令/脚本/角色文件/可选插件状态与工作区 `.mdc` 预检
- `tests/remote.test.ts`：远端目标注册表、`pstack_remote` 五种动作、作业记录、超时与取消
- `tests/chart.test.ts`：`statechart` 的 `chart.mmd` 解析、布局、四类标记配色与零依赖 SVG 输出
- `tests/skill.test.ts`：`pstack_skill` 返回的正文与资源都经过 `toDshText`

### CI 质量门

- Linux：typecheck → build → test（带 V8 覆盖率门槛）→ generated-tree check → package tarball
- Windows：typecheck → build → 全量 test（不再只跑脚本 smoke）
- Install smoke (Linux)：安装真实 `@deepseek-ai/dsh@0.2.2-rc.1`，把 tarball 装入隔离 `DSH_HOME`，校验全部 bundle 行和 `preset-pstack`
- 最新 CI：`42177703239` 全部通过

## 4. 仍存在的质量缺口

| 缺口 | 影响 | 建议 |
|---|---|---|
| 没有真实模型会话的端到端测试 | 无法证明 `/poteto-mode` 的完整推理链路 | 增加一个带 `DEEPSEEK_API_KEY` 的可选 e2e job，或在 Desktop 手工验收 |
| `pstack/` 生成树仍保留上游 Cursor 原文 | 审计时需要知道文本与运行时的差异 | 已由 `native-text.ts` 运行时转译；生成树保持上游可追溯 |
| 没有性能/包体预算 | 生成树与 58 技能会持续增大 | 可加 `npm pack` 大小和启动时间基线 |
| 上游 135 项能力表未逐项映射到测试 | 能力回归靠人工审查 | 可把 `pstack/README.md` 的能力编号做成清单，逐步覆盖高风险项 |
| `run_in_background: true` 不做字面替换 | 三处句子替换后会破坏语法 | 由 `<dsh_adapter>` 与 `dsh.md` 说明“省略该字段”；见 BACKLOG BL-01 |
| `typescript-best-practices` 的 `paths` 字段失效 | DSH 不按文件路径挂载技能 | `frontmatter.ts` 只读四个键；见 BACKLOG BL-04 |

## 5. 结论

当前 fork 已达到“上游资产完整、核心调用层 DSH 原生、CI 可构建可安装可测”的状态。  
与上游的差异集中在两类：

1. **有意的平台替换**：Task/模型/路径/审批等改为 DSH 接口；
2. **有意的平台排除**：Cursor Automations、Bugbot、cloud、CUA 等不假装支持。

质量保障已从“只有构建”提升为“类型检查 + 单测 + Windows 构建 + 隔离安装 smoke”。下一阶段若继续提升，应优先补覆盖率门槛与真实模型会话 e2e，而不是继续增加新功能。
