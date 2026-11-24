# 功能地图

这个仓库把上游 `cursor/plugins` 的 pstack 插件移植到 DSH。改动经常横跨四层，任何一层没跟上都会
出现「版本号对、生成树对、装上去却不对」的情况。先在这张表里定位改了哪一层，再去对应入口改。

## 四层与入口

| 层 | 内容 | 唯一入口 | 生成物 |
| --- | --- | --- | --- |
| 1 上游内容 | `cursor/plugins` 的 `pstack/` 快照 | `upstream/cursor-plugins`（submodule） | 无 |
| 2 生成与适配 | Cursor→DSH 的文本与结构改写 | `port/generate.mjs`、`port/dsh.md`、`port/overrides/**`、`port/patches/*.md` | 根目录 `pstack/` |
| 3 宿主实现 | 注册技能、模型与角色目录、`pstack_subagent` 等工具、界面 | `src/**`、`cordis.patch.yml` | `dist/` |
| 4 随包脚本 | 打包时会顶掉生成脚本的运行时脚本 | `runtime/skills/**`、`scripts/replace-runtime-scripts.mjs` | `runtime/dist/` → `dist/pstack/skills/*/scripts` |

打包链路：`port/generate.mjs` 写出 `pstack/`，`vite.config.ts` 把 `pstack/`、`skills/authored`、
`skills/.agents/skills` 复制进 `dist/`；`vp pack` 后再由 `scripts/replace-runtime-scripts.mjs` 用
`runtime/dist` 覆盖 `poteto-mode`、`show-me-your-work`、`statechart` 三个技能的脚本目录。

## 改一处时要同步的另一处

| 改了 | 必须同步 | 检查命令 |
| --- | --- | --- |
| submodule 指针 | `pstack/`、`port/audit.md`、`port/audit.lock.json` | `node port/generate.mjs --check`、`node port/scan.mjs --check-lock` |
| `port/dsh.md` | 生成树、`port/audit.md` 的引用行号 | `node port/scan.mjs --check port/audit.md` |
| `port/patches/*.md` 的 `Find` | 上游当前原文（整段匹配，不要只截一句） | `node port/generate.mjs --check` |
| 生成树里的技能脚本 | `runtime/skills/<skill>/scripts` | `node scripts/check-runtime-overrides.mjs`、`tests/runtime-shipping.test.ts` |
| `src/**` 的角色或预算 | `src/client/**`、`tests/**`、`port/dsh.md`、README 兼容性表 | `pnpm run vps:check` |
| 任何发布级改动 | `package.json`、`CHANGELOG.md`、两份 README、`FORK.md`、`docs/fork/STATUS.md`、`docs/fork/AUDIT.md` | `node scripts/check-version-bump.mjs` |

## 门禁

`pnpm run vps:check` 是给 2C2G 小机器用的完整门禁（不含 lint，因为 `vp check` 在该配置下会崩）；
`pnpm run ci` 额外包含 `vp check` 的格式与 lint，只在 GitHub Actions 上跑。

- `vp run generate:check`：生成树与上游加改写是否一致。
- `node port/scan.mjs --check-lock`：能力审计锁是否仍然对应这版上游。
- `node port/scan.mjs --check port/audit.md`：审计引用行是否仍然成立。
- `node port/scan.mjs --check-shipped`：`dist` 里不能残留 Cursor 专有词汇。
- `vp run runtime:check`：生成树里的生产脚本必须都有 runtime 来源。
- `vp run compatibility:check`：README 兼容性表与包版本、上游版本是否一致。
- `node scripts/check-comments.mjs`：自动 PR 不得新增解释性注释；只放行 `eslint`、`@ts-`、
  `<reference` 这类机器指令。理由写在提交信息、`CHANGELOG.md` 或 `docs/fork/`。
- `node scripts/check-dsh-pins.mjs`：catalog、CI 安装版本、审计基线、`engines.dsh`、`port/audit.md`
  必须指向同一个 DSH 版本；任何一处单独动都会红。
- `scripts/gate-surface.mjs`（CI 的 `Gate surface` job）：改门禁面本身（`scripts/`、`.github/`、
  `package.json` 等）要人工打 `gate-approved`。四层门禁的分工见 [GATES.md](GATES.md)。

## 已知边界

- 根目录 `pstack/` 是生成物，不要手改；手写内容只能进 `port/**` 或 `runtime/**`。
- Cursor 独有的内容（`automations/benny/**`、`assets/logo.png`、`.cursor-plugin/`、
  `docs/harness/claude-code.md`）按生成器范围排除，不算漏同步。
- 第四层顶掉第二层的脚本目录，所以上游脚本修复必须在 `runtime/` 里再落一次，否则用户装到的
  仍是没有修复的版本。