# pstack 移植与维护

本文件是移植和扩展的基准。它保存适配规则、审核结论、扩展目标和重建注意事项。

## 固定边界

- 根 `pstack/` 只放生成的插件树。生成器可以整体替换该目录，不允许把手工文件放在其中。
- 根 `port/` 集中保存移植工具、审核与适配资料。以 `dsh.md` 为源生成的英文适配文档进入生成树；面向中文用户与审核者的版本不进入生成树，由 `README.zh.md` 直接链接。
- `port/dsh.md` 是当前适配文案的唯一手写来源，必须按 `port/audit.md` 的处置、当前 `cordis.patch.yml` 和实现维护。可选插件表以包名为主键，不另外维护编号。
- 插件源码、测试、扩展登记和回归记录都在生成树之外。生成器不会修改这些内容。
- 根 `package.json` 的 `exports` 由根 `vite.config.ts` 生成。主 pack 的 `entry` 为 `./src/*.ts`；仅第一个 pack 的 `customExports` 补齐非源码入口。其他 pack 使用 `exports: false`。
- `upstream/cursor-plugins` 提供 pstack 源文件。DSH 的基线来自目标运行时及其随附文档和 API。
- DSH 适配以 Web profile 的标准模式为基线。headless 只用于 playground 自动化。
- 上游 `claude-code.md` 明确排除的 Cursor 云服务和平台能力同样舍弃。通用本地能力可以独立适配，但不宣称其等价于云服务。

## 能力审核

先记录事实，再等待审核。处置结论由用户确认，能力依据来自上游源文件和目标 DSH 运行时。

按技能逐项扫描其 `SKILL.md`、引用的 playbook、reference、agent 和脚本。每项能力按以下顺序检查。

1. DSH Web 标准模式已经提供的工具或行为。满足时直接映射。
2. DSH 随附但默认未启用的官方插件。写明它能补足的部分和剩余限制。
3. 本插件需要开发的能力。说明要提供的行为、限制和验收方式，等待审核后实现。
4. 前三项都不能满足时，记录为舍弃或不支持。

同一种能力可以复用审核结论，但必须列出它在各技能中的使用位置。`read`、`write` 等通用工具也要检查，不能只扫描上游生成器已知的关键词。工具类能力要对照工具 schema 的字段、状态与返回值，不能只确认工具存在。`TodoWrite` 的 `skip` 与 `merge` 就属于这种差异。标准模式只列 DSH 自带工具。准备作为替代的用户技能或外部技能写进推荐、插件要求或冲突，不写进标准模式。`dsh.md` 只记录适配映射和依赖，不是运行时清单。声明外部技能不会让技能可用，技能必须由插件随包提供，或由用户实际安装到技能目录。外部技能以 vendored 形式随包时，只需确认上游许可证允许再分发（MIT 及类似许可证），并在根 README 与 `skills/skills-lock.json` 记录来源和版本，再通过 `dsh-skill-filesystem` 的 `bundledSkillDir` 暴露。vendored 技能的依赖处理以上游说明为准；上游没有写依赖缺失处理时，插件不额外补偿，只在 `dsh.md` 与 README 记录前提。

扫描词表必须覆盖 `dsh.md` 的每个平台能力映射，包括只出现在 README、指南或技能正文里的能力；手工添加的适配行没有对应扫描词，就是审核缺口。

每项能力使用一个短小节，保持以下顺序。

```markdown
### <编号> <能力名称> <推荐方案>

| 维度 | 内容 |
|:--|:--|
| 📍 使用位置 | <技能、文件和行号> |
| 🖱️ Cursor 行为 | <从上游文本或代码观察到的事实> |
| 🧰 标准模式 | <对应工具、行为差异和证据> |
| 🧩 官方插件 | <插件名称、补足范围、限制和证据> |
| 🕳️ 剩余缺口 | <当前层级不能满足的行为或运行前提> |
| 🛠️ 插件要求与验收 | <仅在需要插件开发时填写> |
| ⚔️ 冲突 | <同一能力多套入口时的重叠与建议主路径> |
| 🚧 最终遗留 | <按推荐方案补足后仍无法消除的限制> |
| 💡 推荐 | <直接映射、官方插件、插件实现或舍弃，附具体做法和一句理由> |
| ✅ 处置 | <待审核；审核后写直接映射、官方插件、插件实现或舍弃> |
```

推荐方案用五个标记。🟢 直接映射、🔵 官方插件、🟠 插件实现、🔴 舍弃、⚪ 待取证。审核清单里的推荐可以整批采纳，处置仍由用户确认。推荐必须写清具体做法。有剩余缺口时直接说明怎么处理，不能只指向最终遗留，也不能把多种做法留成待选。

冲突写在插件要求之后。先让读者知道插件会提供什么工具，再说明它与标准模式或官方插件的重叠，避免冲突里出现尚未介绍的名字。

在文档开头记录本轮 DSH 版本、pstack 提交和审核日期。每轮都按所选基线取证，不沿用未经复核的满足性判断。

审核记录写入 `port/audit.md`。文档开头的审核清单是填写入口，编号链接到详细小节。每项能力同时给出推荐方案，推荐可以整批采纳，`处置` 仍由用户确认，只接受 `直接映射`、`官方插件`、`插件实现`、`舍弃` 四种结论。没有处置结论的能力不进入实现。

## 审核继承

`port/audit.md` 是可重建的审核视图，`port/audit.lock.json` 是当前基线的决策记录。lock 只保存当前基线存在的能力，不保存历史项。

- `baseline.id` 由 DSH 版本和 pstack 提交组成，`baseline.previous` 指向上一个基线，`baseline.transition` 取 `initial`、`normal` 或 `breaking`。
- `baseline.compatibilityKey` 标识一套兼容适配，与具体审核提交分开。普通更新沿用该键；破坏性更新更换该键，与新的 lock 同时提交。
- `transition` 写入后不变。普通更新生成新 lock 时用 `normal`，破坏性更新用 `breaking` 并整份替换旧 lock。
- `origin: accepted` 表示当时直接接受推荐，破坏性更新后按新基线重新计算推荐。
- `origin: override` 表示人工调整过推荐或处置，破坏性更新后标为待审核，不继承旧选择。
- 普通更新按能力 key 和 `sourceDigest` 比较，源未变直接沿用，源变化标为待复核，新增标为待审核。
- 上游能力在普通更新中消失时，当前审核轮标为已移除；确认后从活动 lock 删除，历史只留在 Git 提交里。
- 破坏性更新删除旧 lock，按新基线新建；旧的已移除项和 override 不迁移。

`vpx port/scan.mjs --check-lock` 比较当前扫描结果和 lock。只有变化或新增的项需要重新审核。

`vpx port/scan.mjs` 扫描上游源树，把每项能力在 Markdown、脚本和配置中的出现位置写入 `.audit/scan/capability-scan.tsv`。`vpx port/scan.mjs --check port/audit.md` 校验审核记录里的引用行号仍然成立。上游变更后先重跑扫描，再重做审核。

## 从 0 到 1

1. 固定上游版本，完成全部技能和脚本的能力审核，结果写入 `port/audit.md`。
2. 等用户填写审核结论。只有明确要求插件补足的部分才进入开发。
3. 在新会话按已审核要求实现插件，使用 playground 验证。
4. 参照上游 `claude-code.md` 编写 `port/dsh.md`，同时产出中文审核版。
5. 用 `port/generate.mjs` 生成根 `pstack/`，用 `--check` 检查生成漂移。
6. 验证生成树中的链接、适配提示和已确认行为。

脚本原样复制，保留依赖文件和可执行权限，不重写为 Node。为每个脚本登记用途、解释器、外部命令和限制。非常用能力不默认提供插件内补偿。环境不满足时明确报告不可用，不将跳过算作适配成功。

### 脚本登记

按当前随包生成树登记每个可执行入口脚本：

| 入口 | 用途 | 解释器 | 外部命令与运行时 | 重要限制 |
|:--|:--|:--|:--|:--|
| `check-plan` | 校验 multi-phase-plan 的计划文件 | `#!/usr/bin/env node` | 无外部命令，Node 运行时 | 无 |
| `watch-pr` | babysit 与 shipping 轮询 PR 状态 | `#!/usr/bin/env bun` | Bun、网络、`gh`（含登录）、`git`；首次运行 `bun install --frozen-lockfile` 写 `node_modules` | 只支持 GitHub，不支持 Origin；缺 Bun 或未登录 `gh` 时不可用 |
| `worktree-audit` | worktree-cleanup 的工作树分类审计 | `#!/usr/bin/env bash` | `git`、`gh`（PR 状态，可用 `origin` CLI 替代）、`jq`，以及 `awk`、`sed`、`grep`、`sort`、`head`、`du`、`stat`、`date` 等基础命令 | 只读审计，可能执行 `git fetch`；无 `gh` 或 `origin` 登录时缺少 PR 状态 |
| `log` | show-me-your-work 追加 TSV 决策日志 | `#!/usr/bin/env bash` | `date`、`mkdir`、`printf`、`tr` | 无 |
| `statechart` | TLA+ 模型检查与 Mermaid 状态图 | `#!/bin/sh`，按版本依次选择 Node 22.18 至 22.x 或 23.6 以上、Bun 1.1.5 以上、Deno 2.0 以上 | `mise`、`java`、`tlc`；首次 `mise install` 需网络 | 首次运行需网络安装 TLC 与 `java@temurin-25`；缺 TLC 时只输出 Mermaid 文本 |

## 从 1 到 100

新增或修改扩展时，继续遵守能力来源优先级和审核规则。在下方登记扩展类别及保留目标。具体按钮、字段、文案和布局由代码、测试及当前使用说明表达，不在这里复制。

## 破坏性变更

DSH 或 pstack 任一上游发生破坏性变更时，按新基线重新实现受影响内容，不维护跨基线兼容分支或过渡实现。运行时适配文档只描述所选基线的行为。

实现提交使用 Conventional Commits 的 `type!:` 形式。破坏性适配同时更新 `package.json` 的 DSH 范围和 lock 的 `compatibilityKey`，并在双语 README 注册新的兼容键、增加对应行；保留旧兼容行。

`vp run release` 在版本更新后、发布提交前由 `bump.config.ts` 的 `execute` 钩子在同一进程内调用 `port/release-compatibility.ts` 导出的 `syncCompatibility`。该函数读取当前版本、DSH 范围、兼容键与实际 pstack 版本：键匹配时更新该行，每个 `x.y` 只保留最新 `z`；键不存在时追加行；同一键对应不同 DSH 范围时停止。发布提交包含 `package.json` 和双语 README。`vp run compatibility:check` 以只读方式检查同步结果。

DSH 升级后从标准模式开始重新检查。标准能力已经满足时，删除本插件的补偿实现。

开始重建前读取下方的本地扩展和回归记录。扩展采用新基线的 API 实现，并保留其用户目标。每项扩展都需要在新基线上验证。

## 本地扩展

| 能力类别 | 用户目标 | 状态 |
|---|---|---|
| 插件配置入口 | 用户可在插件详情页集中进入下述配置能力。 | 已实现 |
| 推荐插件管理 | 用户可查看推荐插件及状态，并管理与本插件配合的官方插件。 | 已实现 |
| 角色模型配置 | 用户可在插件界面查看和编辑角色路由，无需手动改写配置文件。 | 已实现 |
| 根模式预设 | 用户可在新会话选择 `poteto-mode` 或 `poteto-mode-creator`，让完整技能常驻系统提示。 | 已实现 |

## 重建回归记录

记录每次移植都需要预防的问题及其验证方法。普通缺陷由修复提交和回归测试留存。

| 编号 | 问题与触发条件 | 根因 | 预防或验证 | 状态 |
|---|---|---|---|---|
| RG-001 | DSH 升级后根 preset 工具集漂移 | 根 preset 手工复制标准与创造模式的工具行 | `tests/preset-parity.test.ts` 对 `tests/fixtures/dsh-<version>/` 的基线做完整插件行对比；升级基线时刷新 fixture | 已覆盖 |
| RG-002 | Windows 上生成树与审核锁和 Linux 不一致 | CRLF 让 frontmatter 正则失配；`relative()` 产出反斜杠，使生成键、扫描 digest 与 owner 都对不上；Windows 没有执行位，扩展名缺失的入口脚本被当成普通文件 | `port/generate.mjs` 与 `port/scan.mjs` 都先归一换行、用 `/` 拼相对路径；`isEntry` 除执行位外还认 shebang；CI 的 Windows job 跑 `generate:check` | 已覆盖 |
