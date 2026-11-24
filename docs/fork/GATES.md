# 门禁分层

本仓的门禁不是一条命令，而是四层，各自拦住不同的东西。改任何一层都要先确认下层还在。

| 层 | 在哪 | 拦住什么 | 谁能改 |
| --- | --- | --- | --- |
| 1 合并闸门 | GitHub ruleset `fork-main`（id `27968635`） | 红 PR 合不进 `fork/main`：必需 `Check (Linux)` 与 `Gate surface` 通过 | 仓库管理员 |
| 2 门禁面 | `scripts/gate-surface.mjs` + `Gate surface` job | PR 改动 `scripts/`、`.github/`、`package.json`、`pnpm-workspace.yaml`、`vite.config.ts`、`port/generate.mjs`、`port/scan.mjs`、`model/` 时必须人工加 `gate-approved` 标签 | 同上 |
| 3 版本单一事实源 | `scripts/check-dsh-pins.mjs`（`pnpm run dsh:pins`） | catalog、CI 安装版本、`port/audit.lock.json` 基线、`engines.dsh`、`port/audit.md` 指向不同 DSH 版本 | 仓库维护者 |
| 4 任务内门禁 | `issue-autosync` 的 `vps:check` 与 workflow 的 `run` 节点 | 自动化任务落地前必须有证据的运行；不过就 `needs-human` 或直接失败 | 任务配置 |

## 为什么第 1 层不是「PR 必须通过检查」那么简单

`required_status_checks` 只对 PR 生效，直接推 `fork/main` 不受它约束。这是有意保留的：本地维护者仍然可以直接推，而自动化任务的产物一律走 PR，因此对自动化来说闸门是硬的。如果要连直接推也禁掉，给 `fork-main` ruleset 加一条 `pull_request` 规则即可，代价是维护者自己也得开 PR。

`required_status_checks` 对直接推 `fork/main` 也生效（GitHub 会报 `2 of 2 required status checks are expected` 并拒绝推送），因此 ruleset 里保留了一个 bypass：维护者本人（`actor_id 144529574`，`bypass_mode: always`）可以直接推，其余路径一律要过检查。这把"维护者在自动化本身坏掉时还能自救"这条逃生门留下，同时把自动化产物关在 PR 里——worker 从不合并 PR，所以对自动化来说闸门是硬的。

`bypass_actors` 里只有维护者一人，没有管理员组、没有 bot。

## 第 2 层的威胁模型

需要拦的不是"有人手滑改了脚本"，而是：一个自动化 PR 把 `scripts/check-comments.mjs` 改成永远成功、或把 `package.json` 的 `vps:check` 里删掉 lint，然后门禁自己就绿了。`gate-approved` 标签只能由有写权限的人加，代码改不了它，因此这条攻击需要一个真人点头。

第 4 层的 `vps:check` 在 VPS 上跑的是工作树里的脚本，仍属于"被审对象"；真正兜底的是第 2 层的人工标签与第 1 层的必需检查。

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