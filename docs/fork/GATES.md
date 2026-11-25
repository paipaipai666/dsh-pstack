# 门禁分层

本仓的门禁不是一条命令，而是四层，各自拦住不同的东西。改任何一层都要先确认下层还在。

| 层 | 在哪 | 拦住什么 | 谁能改 |
| --- | --- | --- | --- |
| 1 合并闸门 | GitHub ruleset `fork-main`（id `27968635`） | 红 PR 合不进 `fork/main`：必需 `Check (Linux)` 与 `Gate surface` 通过 | 仓库管理员 |
| 2 门禁面 | `scripts/gate-surface.mjs` + `Gate surface` job | PR 改动 `scripts/`、`.github/`、`package.json`、`pnpm-workspace.yaml`、`vite.config.ts`、`port/generate.mjs`、`port/scan.mjs`、`model/`、`docs/fork/dsh-api-surface.json`、`docs/fork/BREAKING-CHECKLIST.md` 时必须人工加 `gate-approved` 标签 | 同上 |
| 3 版本单一事实源 | `scripts/check-dsh-pins.mjs`（`pnpm run dsh:pins`） | catalog、CI 安装版本、`port/audit.lock.json` 基线、`engines.dsh`、`port/audit.md` 指向不同 DSH 版本 | 仓库维护者 |
| 4 任务内门禁 | `issue-autosync` 的 `vps:check` 与 workflow 的 `run` 节点 | 自动化任务落地前必须有证据的运行；不过就 `needs-human` 或直接失败 | 任务配置 |
| 5 差分预言机 | `scripts/pin-dsh-version.mjs` + `scripts/dsh-api-surface.mjs` + `Next DSH (observe)` job | DSH 下一个版本是否破坏我们的类型面：跑一遍 `typecheck`/`test`，并对比 `docs/fork/dsh-api-surface.json` 里我们导入的每个符号是否仍被导出 | 仓库维护者 |

## 为什么第 1 层不是「PR 必须通过检查」那么简单

`required_status_checks` 不只对 PR 生效：实测直接 `git push fork/main` 也会被服务端拒绝（`2 of 2 required status checks are expected`）。

`bypass_actors` 里只有维护者一人，没有管理员组、没有 bot。因此 ruleset 里保留了一个 bypass：维护者本人（`actor_id 144529574`，`bypass_mode: always`）可以直接推，其余路径一律要过检查。这把"维护者在自动化本身坏掉时还能自救"这条逃生门留下，同时把自动化产物关在 PR 里——worker 从不合并 PR，所以对自动化来说闸门是硬的。

## 第 2 层的威胁模型

需要拦的不是"有人手滑改了脚本"，而是：一个自动化 PR 把 `scripts/check-comments.mjs` 改成永远成功、或把 `package.json` 的 `vps:check` 里删掉 lint，然后门禁自己就绿了。`gate-approved` 标签只能由有写权限的人加，代码改不了它，因此这条攻击需要一个真人点头。

第 4 层的 `vps:check` 在 VPS 上跑的是工作树里的脚本，仍属于"被审对象"；真正兜底的是第 2 层的人工标签与第 1 层的必需检查。

### 自动发布不被自己卡住

`auto/*` 分支同时受两条约束：`Version bump (auto PRs)` 要求 `package.json` 的 `version` 递增，而 `Gate surface` 要求任何 `package.json` 改动都带 `gate-approved` 标签。worker 没有加标签的权限，两条约束合起来就是死锁——PR #17 正是这样红的。

`scripts/gate-surface.mjs` 因此把"`package.json` 只动了 `version`"排除在受保护变更之外：它以 merge base 的 `package.json` 为基线，删掉 `version` 后比较其余字段，全等才放行。版本号不被任何检查读取，升版本不是"改自己的判定条件"；一旦同时改了 `scripts`、依赖、`engines` 或其它字段，仍然需要人工标签。

## 第 5 层：差分预言机

前四层都是"在当前 pin 的版本上正确"，回答不了"上游下一个版本会不会把我们弄坏"。第 5 层把这件事变成可执行的两步：

1. **矩阵**：`Next DSH (observe)` job 先 `node scripts/pin-dsh-version.mjs next` 把 catalog 里 22 个 `@deepseek-ai/dsh*` 条目改成 npm `next` 标签指向的版本，再 `pnpm install --no-frozen-lockfile`、`typecheck`、`test`。类型面破坏（比如 `SubagentActivationSpec` 从嵌套 `request` 改成扁平字段）会在这里直接变成编译错误，而不是等用户在运行时撞上。
2. **表面快照**：`node scripts/dsh-api-surface.mjs --write` 把"我们从每个 DSH 包里导入了哪些符号、该包当前导出了哪些符号"写进 `docs/fork/dsh-api-surface.json`；`--check` 在 CI 里对比，任何我们导入过的符号不再被导出就失败并点名（`@deepseek-ai/dsh-x no longer exports Y`）。这一层抓的是删名/改名，抓不到"还在但形状变了"——那由第 1 步的 `typecheck` 抓。

这个 job 现在是 `continue-on-error: true`，即 **observe 档**：它会跑、会红、会在 PR 上留下记录，但不阻断合并。理由是新门禁直接进 enforce 档会像早期 CI 轮询那样把流水线卡死；等它连续几个版本证明自己不误报，再改成必需检查。

第 5 层还负责"该看哪几项"：`docs/fork/BREAKING-CHECKLIST.md` 把 16 条破坏面按路径立好，`scripts/check-breaking.mjs` 从 diff 里挑出命中的三到十项，CI 与 review 提示都拿这份报告当输入。清单只报不判，判定仍然在 review 节点。

## 复现 ruleset

```bash
gh api repos/paipaipai666/dsh-pstack/rulesets --method POST --input - <<'JSON'
{
  "name": "fork-main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/fork/main"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "Check (Linux)" },
          { "context": "Gate surface" }
        ]
      } }
  ],
  "bypass_actors": [
    { "actor_id": 144529574, "actor_type": "User", "bypass_mode": "always" }
  ]
}
JSON
```

## 已知边界

- `Version bump (auto PRs)` 只对 `auto/*` 分支跑，所以不能设为必需检查：人类 PR 永远不会产生这个 check，设成必需会让所有人类 PR 卡在 "Expected"。它仍然会在自动化 PR 上失败，而自动化 PR 由 worker 创建、不由 worker 合并。
- `Gate surface` 只对 `pull_request` 事件跑，这是它唯一需要覆盖的场景。
- ruleset 不保护 tag：`release.yml` 依靠 `v*` tag 触发，而 tag 由 release 流程创建。
## 第 4 层的三档

`issue-autosync` 里新增的引擎门禁（重大变更必须有人工审批、窄评审不得改树）默认 `enforce`，可以用 `AUTOSYNC_GATES=observe` 先只记录、再收紧；`off` 是明确跳过。取值写错会在加载配置时报错，不会静默降级。

新门禁一律先 observe 一周：门禁的第一周如果只会让人加豁免，那它教会的是怎么绕过。指标与读法见 `docs/fork/REVIEW-METRICS.md`。
