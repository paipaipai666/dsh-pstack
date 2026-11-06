# dsh-pstack fork backlog

> 基于 `l246804/dsh-pstack` v0.3.0-beta.1（pstack 0.15.36）  
> 目标 DSH：0.2.2-rc.1（本机安装版）  
> 状态：A 全部完成；B 的 FIX-01、FIX-02、FIX-03、FIX-04 已完成，ADD-01 已提前落地；其余等待筛选  
> 维护原则：保留 MIT 许可证与原作者署名；优先把通用修复回馈上游，长期分叉只保留 DSH 版本适配和团队特有功能。

## 建议的第一批（MVP）

如果只选一轮，建议先做这 8 项：

`FND-01`, `FND-02`, `FND-03`, `FIX-01`, `FIX-02`, `FIX-03`, `FIX-04`, `FIX-08`

目标：先把 fork 变成可重复构建、可测试、可发布的基线，再解决最影响日常使用的安全/体验问题。

---

## A. Fork 基建（FND）

| ID | 类型 | 优先级 | 内容 | 为什么 | 验收标准 | 预估 | 依赖/风险 |
|---|---|---|---|---|---|---|---|
| FND-01 | 基建 | P0 | 创建 GitHub fork / 组织仓库，配置 `origin`（我们的 fork）和 `upstream`（l246804），包名改为 `@your-scope/dsh-pstack` | 当前只是本地工作副本；需要真实远程、issue/PR 和发布入口 | `git remote -v` 正确；GitHub 页面可见 fork；包名不冲突 | S | 需要 GitHub 登录/组织权限 |
| FND-02 | 基建 | P0 | 锁定 DSH 0.2.2-rc.1 兼容基线，建立 `compat/dsh-0.2.2` 分支和版本矩阵 | 上游按 DSH alpha.3 构建，rc.1 未显式验收；后续 DSH 还会破坏性变更 | `pnpm install` + `vp check` + `vp test` 在 rc.1 通过；README 写明支持范围 | M | 需要 Node >=24.21.1；当前本机 Node 24.15，需要升级/用 corepack |
| FND-03 | 基建 | P0 | 添加 GitHub Actions：typecheck、test、build、`generate-pstack-harness-tree.mjs --check`，并加 Windows runner | 上游只有 release workflow；没有 PR CI，DSH API 漂移无法在 PR 阶段发现 | PR 上 4 个 job 全绿；Windows runner 至少跑安装+`pstack_script` smoke | M | Windows runner 可能需要处理 pwsh/bash 差异 |
| FND-04 | 基建 | P1 | 添加 upstream 同步 workflow：定期检查 `cursor/plugins` 的 pstack 与 DSH 版本变化，开 issue/PR | pstack 0.15.36 会继续更新；手工同步容易漏 | 每周自动检查；有变化时生成 issue/PR；无变化时不产生噪音 | M | 需要 GitHub token 权限；上游 submodule 拉取成本 |
| FND-05 | 基建 | P1 | 增加 `FORK.md`、`NOTICE`、`CHANGELOG`、发布流程（npm dist-tag / GitHub release） | 合规、可追溯、避免和原包混淆 | 保留 MIT 和原作者版权；说明修改点；发布流程文档可执行 | S | 无 |
| FND-06 | 基建 | P2 | 添加 `pnpm bootstrap` / `doctor` 脚本：检查 Node、pnpm、git submodule、DSH 版本 | 新成员/CI 环境搭建容易卡在版本和 submodule | 一条命令报告缺什么；CI 复用同一脚本 | S | 无 |

## B. 修复与加固（FIX）

| ID | 类型 | 优先级 | 内容 | 为什么 | 验收标准 | 预估 | 依赖/风险 |
|---|---|---|---|---|---|---|---|
| FIX-01 | 安全 | P0 | `pstack_script` 增加审批/显式 opt-in/审计模式，不再默认绕过 bash 审批与文件系统沙箱 | 当前任何能调用工具的内容都能在无审批下运行随包脚本；这是最大的安全边界 | 默认需要用户确认或配置显式允许；审计记录 id/args/cwd/结果；现有测试更新 | M | 需要 DSH 的 approval/fs API；Desktop Electron 路径要验证 |
| FIX-02 | 体验 | P0 | 增加根 `pstack` agent preset（或 `pstack-mode`），让 `/poteto-mode` 可在会话内常驻 | 当前每个任务都要重新输入 `/poteto-mode`；Cursor 的核心体验缺失 | 新会话选择 `pstack` preset 后，每轮自动带 poteto-mode persona；不破坏 `poteto-agent` / `comment-sicko` | M | 需要 DSH agent preset 支持；参考 lqhl/dsh-pstack 的 `pstack` preset |
| FIX-03 | 正确性 | P1 | `maxDepth` 默认从 2 调到 3，或加 `pstack_doctor` 检测 `/orchestrate` 需求并提示 | 自己的审查文档建议至少 3；默认 2 对三级编排偏小 | `/orchestrate` 开箱能启动 coordinator→subcoordinator→worker；测试覆盖 | S | 需确认 DSH `maxDepth` 语义和并发上限 |
| FIX-04 | 文档 | P1 | 清理生成树中残留的 Cursor 文案：`poteto-help` 的 Option+Enter/Custom Mode、`guide/01-setup.md` 的 Custom Mode 等 | 用户会照 Cursor 文档操作，但 DSH 没有该功能；与 `dsh.md` 矛盾 | 安装后 `/poteto-help`、`/setup-pstack` 不再出现 Cursor-only 指令；用 `pstack/harness/` 覆盖或生成期改写 | S | 需同步更新中英文 |
| FIX-05 | 可靠性 | P1 | 生成期原生 DSH 文本转译：把 `Task`、`subagent_type`、`.cursor`、`pstack-models.mdc`、Cursor 模型 slug 等替换为 DSH 等价物 | 目前 58 个 skill 中有 23 个只加“读 dsh.md”指针，模型每轮都要翻译，容易误调用 | 生成树不再出现 Cursor-only 调用名；`generate --check` 可重复；保留 upstream 原文副本 | L | 改写风险高，需要逐技能回归；建议先覆盖 `poteto-mode`/`how`/`why`/`arena`/`swarm`/`interrogate`/`reflect` |
| FIX-06 | Windows | P1 | Windows 兼容性加固：pwsh 命令、路径、CRLF、`pstack_script` 的 Electron/Node 运行时、测试矩阵 | 本机是 Windows；上游只在 Web/Linux 路径验证 | Windows 上 `/poteto-mode`、`pstack_script`、`pstack_subagent` smoke 通过 | M | CUA/desktop 仍无法完整支持，只能做 shell/脚本层 |
| FIX-07 | 正确性 | P2 | 给 `pstack_subagent` 的 `role`/`roleIndex`/`reasoningEffort`/`cwd` schema 增加更友好的空值/错误提示 | 当前所有参数都要求显式传 null，模型容易漏传导致调用失败 | 常见遗漏返回可操作的错误；测试覆盖 | S | 无 |
| FIX-08 | 可靠性 | P2 | 增加真实 DSH 集成测试：`pstack_subagent`、`pstack_script`、`pstack_skill`、角色文件读写 | 现有 18 个测试文件多为单元/渲染测试，缺真实 API 集成 | CI 中启动隔离 DSH profile，跑真实子代理/脚本 smoke | L | 需要隔离 DSH home/profile；可能依赖凭证 |
| FIX-09 | 文档 | P2 | 统一 `README.md` / `README.zh.md` / `pstack/README.md` 的版本和兼容矩阵，修复 npm latest 落后 main | 用户按 README 安装 `dsh-pstack` 可能拿到 0.2.1，不是 0.3.0-beta.1 | README 明确 GitHub tag 安装；npm beta dist-tag 发布 | S | 需要 npm 发布权限 |

## C. 新增能力（ADD）

| ID | 类型 | 优先级 | 内容 | 为什么 | 验收标准 | 预估 | 依赖/风险 |
|---|---|---|---|---|---|---|---|
| ADD-01 | 新增 | P1 | `pstack_doctor`：检查 `git`、`gh`、`node`、`ffmpeg`、`mise`/Java、可选插件（session-search/forge/browser/CUA/terminal）、MCP server | 很多 playbook 失败不是代码问题，而是外部依赖/可选插件没开 | 一条命令输出“可用/缺失/会降级”；每个缺口给出启用命令 | M | 需要 DSH 插件管理器/命令探测 |
| ADD-02 | 新增 | P1 | `pstack_pr`：模型侧 GitHub PR 工具，封装 `gh pr create/view/checks/comment/review/merge` | 当前没有模型侧 change-request 工具，只有 `watch-pr` 轮询 | 结构化 JSON；支持 create/read/comment/review/merge；测试覆盖 | M | 需要 `gh` 登录；不能替代 Cursor 内置 PR 面板 |
| ADD-03 | 新增 | P2 | `pstack_mcp_categories`：扫描已注册 `mcp__*` 工具，映射到 `why` 的 7 类证据源 | `why` 的自动类别发现缺失，用户要手动配置 MCP | 工具返回每类可用/缺失；`/why` 能按结果派 investigator | M | MCP client 必须先配置 |
| ADD-04 | 新增 | P2 | `pstack_record`：封装 ffmpeg/OBS/系统录屏，输出视频/帧级证据 | DSH 没有内置录屏；视觉类 playbook 需要视频 | 给定命令/窗口能录制 mp4 并返回路径；失败有明确降级 | M | Windows/macOS/Linux 录制差异大 |
| ADD-05 | 新增 | P2 | `pstack_update`：检查 fork、pstack 上游、DSH 版本，输出升级建议 | 现在依赖人工看 README/commit | 报告当前版本/最新版本/破坏性边界/建议动作 | S | 需要 GitHub API 或 git fetch |
| ADD-06 | 新增 | P2 | 自动检测并建议可选插件（已有推荐页，可做自动探测/缺失提醒） | 用户经常漏开 session-search/forge/browser，导致 playbook 降级 | 启动时/首次使用提示缺失项；不自动启用 | S | 已有 `optional-plugins` 基础设施，可复用 |
| ADD-07 | 新增 | P2 | Headless/CLI profile 支持：`ask_user_question` 的纯文本 fallback、`agentPresets` 可用性检测 | 当前只以 Web profile 为唯一基准 | `dsh headless` 能跑 `/poteto-mode` 的最小流程 | L | DSH headless 能力有限；可能只支持子集 |
| ADD-08 | 新增 | P3 | 角色配置页增强：批量导入/导出、角色预设、复制到另一台机器 | 17 个角色逐个配置麻烦 | 导出 JSON/MDC；导入校验；预设模板 | M | UI 工作量大 |
| ADD-09 | 新增 | P3 | `pstack_status` 健康面板：当前角色路由、可用模型、启用插件、脚本依赖、最近失败 | 排障入口分散 | 一个页面/工具汇总状态 | M | 需要收集多个服务状态 |

## D. 平台边界（PLAT，暂缓/不修）

| ID | 内容 | 处置 |
|---|---|---|
| PLAT-01 | Cursor Automations、webhook、`SendToUser`、routine wake | 平台限制；文档标注跳过，不做假实现 |
| PLAT-02 | Bugbot 启动/配置/等待 | 只支持已有 comment 当普通 review thread |
| PLAT-03 | Cursor cloud agents、Projects | 用本地 worktree/后台 job 替代；不承诺完整 |
| PLAT-04 | CUA Windows 完整支持 | 等 DSH 核心；当前只 macOS PTC |
| PLAT-05 | forge 事件订阅 / `/loop` | 用 `create_goal` + `schedule_create` + 后台轮询；不做假事件总线 |
| PLAT-06 | 内置视频渲染 / 图像生成 / TLA+ | 外部工具或 `ADD-04` 包装；不内置 |

---

## 备注

- 所有“修复”项都应在 `fork/main` 上以独立 commit/PR 完成，便于回馈上游。
- 所有“新增”项优先做成插件内工具/技能，不改 DSH 核心；只有 `FIX-02`（根 preset）可能需要 DSH preset API。
- 平台边界项不进入第一批；如果用户选择，也只做文档/降级说明。
