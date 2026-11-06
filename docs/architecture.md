# 架构

本文件只描述系统现在的样子；为什么演变成这样，见 `docs/decisions/`。

## 模块

| 模块 | 目录与入口 | 职责 |
|---|---|---|
| 根打包与发布 | 根 `vite.config.ts`（两个 `pack` 配置与 `run.tasks`）、根 `package.json`（包名 `@paipaipai666/dsh-pstack`） | 用 vite-plus 打包 `src/*.ts` 与 `src/client/`；把 `pstack/dist/pstack`、`skills/authored`、`skills/.agents/skills`（复制为 `vendored`）写入 `dist/`；`pack.exports` / `customExports` 生成发布入口；两个 pack 的 `deps.neverBundle` 用 `/^@deepseek-ai\//` 通配整个 DSH 命名空间，宿主与客户端产物都不内联宿主模块；`@deepseek-ai/cordis` 声明为 peer + devDependencies，其余 `@deepseek-ai/dsh-*` 只在 devDependencies，`dependencies` 只留随包脚本运行需要的 `commander`；npm 发布 `dist/`、`assets/`、`cordis.patch.yml`、`locale/` 与双语 README |
| Host 插件入口 | 根 `src/*.ts`（`index.ts`、`models.ts`、`role-catalog.ts`、`roles.ts`、`remote.ts`、`script.ts`、`script-policy.ts`、`skill.ts`、`subagent.ts`）、`cordis.patch.yml` | `cordis.patch.yml` 注册 8 条行：`pstack`（bundle 技能 provider + `pstack_skill`）、`pstack-models`（只读模型目录）、`pstack-roles`（Typert Remote 服务 `pstackRoles`）、`pstack-role-catalog`（只读角色能力查询 `pstack_roles`）、`pstack-doctor`（命令、脚本、角色文件和可选插件状态预检 `pstack_doctor`）、`pstack-script-policy`（`pstack_script` 的 `tools/pre-execute` 审批策略）、`pstack-subagent`（`maxDepth: 3`）、`pstack-script`；另声明 `pstack`（持久根模式）、`poteto-agent`、`comment-sicko` 三个 `@deepseek-ai/dsh-agent-preset`。六个模型可见工具是 `pstack_skill`、`pstack_models`、`pstack_roles`、`pstack_doctor`、`pstack_subagent`、`pstack_script` |
| Host 内部模块 | 根 `src/internal/*.ts` | 宿主契约与技能/角色基础设施：`host-contract.ts` 用 `import type` 绑定 `@deepseek-ai/*`；`skill-provider.ts` 建 bundle 技能索引；`paths.ts` 定资源根；`frontmatter.ts` 解析上游 frontmatter；`audit-context.ts` 注入 `.audit` 约定；角色链 `role-grammar.ts`（读写共用的行语法与按值替换）、`role-config.ts`、`role-manifest.ts`、`role-editor.ts`、`role-wire.ts`；`effort.ts` 校验 effort；`script-registry.ts` 列随包脚本；`optional-plugins.ts` 是 `OPT-02`–`OPT-09` 目录的唯一来源 |
| Client 半 | 根 `src/client/`、`src/remote.ts`、`package.json` 的 `dsh.client` | `remote.ts` 手写 Typert `TypertRemoteInfo`（无生成链）；`client/index.ts` 用 `ctx.remote.$mount` 挂载贡献并注册 `plugins.detail.actions` 与 `plugins.bundle.activation`；`PstackBundleConfigDialog.tsx` 提供「配置」按钮与仿 Settings 的模态框；`RoleSettingsPage.tsx` 渲染 17 个角色表单；`OptionalPluginsPage.tsx` 渲染推荐插件区与一次性引导；`optional-plugins-state.ts` 提供状态映射与一键启用序列；`state.ts` 提供角色草稿的纯状态与比较函数；`i18n.ts` 定支持语言与词典类型，`locales.ts` / `optional-plugins-locales.ts` 分别是 `pstackRoles` / `pstackPlugins` 命名空间词典（`pstackRoles` 也承载 17 个角色的本地化名称与用途说明）；构建产出 `dist/client.mjs`（`__ModuleLoader__.load` CJS 包装） |
| 插件验证 | 根 `tests/**/*.test.ts`、`tests/**/*.test.tsx`（`vite.config.ts` 的 `test.include`）、根 `typecheck` / `test` tasks、`package.json` 的 `prerelease` | 驱动插件公共行为：隐藏技能加载、技能 frontmatter 与重名拒绝、模型目录、角色文件解析与写回、Typert Remote 贡献、Client 页面接线、bundle 配置按钮与分区渲染、preset 选择、推荐插件目录与 README/dsh.md 对账、推荐区渲染与一键启用顺序、locale 命名空间、词典与发布元数据完整性；`vp run typecheck` 显式检查所有手写 TS，`vp run test` 跑根 Vitest 且要求先有构建产物（脚本执行用例缺产物时明确报错），发布门禁 `prerelease` 依次运行 `build`、`check`、`typecheck` 与各工作区 `test` |
| 真实插件测试场 | `playground/`（`profile/`、`start.mjs`、`browser.mjs`、`cases-run.mjs`、`run-cases.mjs`、`cases/*.case.mjs`、`config.example.json`）、根 `vite.config.ts` 的 `playground`/`cases` task | 开发期唯一的真实运行环境：`@internal/playground` 是 vite-plus 子包，`profile/` 是从随附 `web` 模板复制后加入 `dsh-pstack` 的可移植 profile，运行期 home 为 `playground/.dsh`（gitignore），端口固定 `17353`；`start.mjs` 每次启动前同步 profile、宿主凭据与模型配置并安装本仓插件；`vp run playground` 启动；验证在终端直接对 `playground/.dsh` 跑 `dsh` 命令；另有能力自动化 runner（`cases-run.mjs` 经 Vite `runnerImport` 加载 `run-cases.mjs`，用例 `cases/*.case.mjs` 由 `import.meta.glob` 注册；读 `playground/config.json` 的 provider apiKey 与“模型→思考等级”，`vp run cases` 用 `dsh headless --json` 跑能力用例并出报告，只断言能力级可观察事实，不写死插件文案/UI） |
| pstack 工作区（`@internal/pstack`） | `pstack/package.json`、`pstack/vite.config.ts` | 编译运行时脚本、生成移植树、组装 `pstack/dist/`；运行时 pack 仅清理 `dist/runtime`，不会清除已组装的 `dist/pstack`；`run.tasks` 定义 `generate`、`copy:pstack`、`replace:scripts`、`build`、`check:harness-doc`、`check`、`test` |
| 生成器 | `pstack/scripts/*.mjs` | `generate-pstack-harness-tree.mjs`（上游原文加本地适配树渲染生成树，`--check` 比对漂移）、`copy-pstack.mjs`（整棵覆盖拷贝）、`replace-scripts.mjs`（用编译产物替换上游附带脚本，双向核对替换目录并检查注册的脚本文件存在）、`check-harness-doc.mjs`（对账）、`port-fixes.mjs`（移植问题台账维护） |
| 生成树 | `pstack/pstack/` | 由 `upstream/cursor-plugins/pstack` 加 `pstack/harness/` 渲染；每次构建整棵重建，生成结果提交进 git |
| 本地适配树 | `pstack/harness/docs/harness/dsh.md` | DSH 宿主适配文档，按生成树相对路径镜像；主适配器替换上游 `claude-code.md`，其他上游 harness 附件保持上游相对路径与文件名；不改写上游页面、技能、playbook、reference |
| 适配文档对账 | `pstack/scripts/check-harness-doc.mjs`、`docs/harness-doc.yaml` | 按清单核对 `dsh.md` 与 README、上游 `claude-code.md`、`src/`：覆盖行、模板漂移、`OPT-*` 集合、`AUT-*`/`EXCL-*`、章节、引用与过时名字；只读对账，从不改写文档；是 `doc` 与 `review port` 的门禁，入口 `vp run @internal/pstack#check:harness-doc` |
| 运行时 | `pstack/runtime/skills/<技能>/scripts/**` | 可执行脚本的 TS 源码，编译成 mjs 后经 `replace:scripts` 替换随包树里上游附带的脚本；`pstack_script` 的 `id` 枚举对应 `src/internal/script-registry.ts` 的 `SCRIPT_ENTRIES` |
| 技能工作区（`@internal/skills`） | `skills/package.json`、`skills/authored/`、`skills/.agents/skills/`（`skills experimental_sync` 落盘目录）、`skills/skills-lock.json` | 随包发布的非上游技能；`authored/` 手写、`.agents/skills/` 是 vendored 技能（构建时以 `vendored/` 落进 `dist/skills`），带哈希与提交号 |
| 仓库维护技能 | 根 `.agents/skills/<名>/`（`SKILL.md`、`README.md`、`references/`） | 维护本仓的技能的入口、使用说明与按分支加载的指令；不进入 `dist/` 或随包技能工作区 |
| 本地扩展登记 | `docs/extensions.md` | 登记 DSH 版独立功能的 `EXT-*` 需求、DSH 依赖与验收；基线重建保留这些范围 |
| 上游反馈记录 | `docs/upstream-discussions.md` | 记录已提交到上游 DSH 的 Discussion 标题、URL、主题与更新时间 |
| 上游子模块 | `upstream/cursor-plugins`、`upstream/deepseek-harness` | 生成树来源与 DSH 宿主参考实现（git 子模块） |
| 发布产物 | `dist/`（gitignore） | npm 实际发布内容：`index.mjs` 与各插件入口 `.mjs`、类型声明、`pstack/`、`skills/` |

## 依赖方向

```
upstream/cursor-plugins/pstack + pstack/harness
        │ generate
        ▼
   pstack/pstack ──copy:pstack──▶ pstack/dist/pstack
                                      ▲
pstack/runtime ──vp pack──▶ pstack/dist/runtime ──replace:scripts──┘

pstack/dist/pstack ──根 vp pack（copy）──▶ dist/pstack
skills/authored + skills/.agents/skills ──根 vp pack──▶ dist/skills
  （后者在 dist 里落名为 vendored/）
根 src/*.ts ──根 vp pack──▶ dist/{index,models,remote,roles,script,skill,subagent}.mjs
src/client/ ──根 vp pack（第二个 pack 配置）──▶ dist/client.mjs
```

上游只向下游流动：生成树与 `dist/` 不反向修改上游；`pstack/pstack/` 是渲染结果，手写内容一律进 `pstack/harness/`（仅适配文档）与 `pstack/runtime/`（脚本）。

## 扩展点

- **新加脚本命令**：已有 `package.json` 脚本保持原样；新加的非必要命令优先在根 `vite.config.ts` 的 `run.tasks` 定义（`vp run <name>`）；npm 生命周期或被外部工具强制要求才写 `package.json`，且新增前须先向用户申请确认（见 [决策](decisions/2026-10-30-script-commands-in-vite-config.md)）。
- **DSH 文本差异**：只写 `pstack/harness/<生成树相对路径>`；主适配器是 `docs/harness/dsh.md`（替换上游 `claude-code.md`），其他上游 harness 附件按上游相对路径与文件名建同名文件；不要直接改 `pstack/pstack/`。`dsh.md` 在上游模板章节外只保留 `## Local replacements` 与 `## Optional plugins` 两个固定追加小节，与 README 的一致性由 `check:harness-doc` 按 `docs/harness-doc.yaml` 核对。
- **新增技能**：随包手写技能放 `skills/authored/<名>/SKILL.md`，仅供维护本仓的技能放根 `.agents/skills/<名>/SKILL.md`；第三方随包技能把 `source` 与技能名加进 `skills/package.json` 的 `skills` 数组，跑 `skills experimental_sync`，哈希与提交号自动记入 `skills/skills-lock.json`。构建直接从 `.agents/skills` 拷贝并 `rename` 成 `vendored`（不用符号链接，避免 `vp pack` 清理误删源文件）。
- **新增或修改脚本**：改 `pstack/runtime/skills/<技能>/scripts/`，并把技能名加入 `pstack/scripts/replace-scripts.mjs` 的 `REPLACED` 列表；新增脚本必须同步 `src/internal/script-registry.ts` 的 `SCRIPT_ENTRIES`；模型通过 `pstack_script` 的 `id` 调用，不直接拼路径。
- **新增或修改插件工具**：改 `src/*.ts`，在 `cordis.patch.yml` 增加对应 `@paipaipai666/dsh-pstack/<入口>` 行；`package.json` 的 `exports` 由 `vite.config.ts` 的 `pack.exports` 生成，新增入口要同时改这两处，非入口资源用 `customExports` 声明，不要手写进 `package.json`；普通插件入口只从 `@deepseek-ai/*` 导入类型，运行时保持自包含。
- **新增或修改 Client 配置页**：Client 半放 `src/client/`，由 `package.json` 的 `dsh.client`（`platform: 'web'`）声明，`./client` 出口指向 `dist/client.mjs`；`vite.config.ts` 的第二个 `pack` 项按 `dsh-client-modules` 协议把入口包成 `window.__ModuleLoader__.load(...)` 的 CJS 包装，React 与平台模块保持 external。每个配置能力使用独立 locale 命名空间与按语言组织的完整词典（`pstackRoles` / `pstackPlugins`）；新增语言由 `src/client/i18n.ts` 的类型与测试强制补齐。Host 侧需要 Remote 时，在 `src/remote.ts` 手写 `TypertRemoteInfo` 并用 `ctx.typert.register()` 注册 strict 描述符。

## 已知缺口

- vendored 技能来源记在 `skills/skills-lock.json`，不存在单独的 `skills/sources.yml`。

本节记录当前事实；缺口修复或消失后同步更新。
