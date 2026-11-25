# 决策：用入口可见加分层路由决定技能何时加载

Status: accepted
Date: 2026-11-25
Scope: cordis.patch.yml, src/playbook-router.ts, src/skill-index.ts, src/preset-copy.ts, scripts/generate-auto-skills.*, vite.config.ts, playground/exp/**, docs/fork/**
Implemented-by: commit:044cd8eca5706e8a812a946e58dc5e9f4b05735a
Review: 2026-11-25

## 背景

上游 pstack 的 59 个技能全部声明 `disable-model-invocation: true`，只在用户输入 `/名字` 时由入口注入；它们不进模型目录，`skill` 工具也会拒绝加载。因此"什么时候用哪个技能"这件事完全由用户的记忆承担，技能数量增长到 40 个以上后，靠人记住边界不现实。

实测数据（`docs/fork/SKILL-DISCOVERY.md`）：不加载技能的会话首步 prompt 为 12,461 tokens；59 个技能全量可见命中 5/7，但每次请求多付 2,870 tokens；注入紧凑索引命中 3/10，多付 2,124 tokens；只让 10 个入口技能可见命中 6/10，多付 413 tokens。同一批元数据交给一次专用路由调用时 recall@1 达到 9/11，说明检索能力不是瓶颈，主循环在长上下文里"看见了但不行动"才是。

## 决策

1. **入口技能可见。** `pstack-auto` preset 用 `customSkillDirs`（rank 300，低于 bundled 600）挂一份去掉该 flag 的副本，覆盖 architect、figure-it-out、how、interrogate、sharpen、statechart、teach、technical-writing、unslop、why 十个入口技能；副本由 `scripts/generate-auto-skills.mjs` 在打包后生成。
2. **每轮先路由 playbook。** `pstack-playbook-router` 在 `agent/pre-step` 用 `ctx.llm.stream` 加当前 `modelSelection` 发一次只返回 JSON 的调用，结果以 `playbook-route` 通知注入；模型回不出 JSON 时补问一次；任何异常只进 trace，不阻断回合。
3. **阶段内再路由具体技能。** playbook 给出各阶段的检查清单与 `n/a` 规则，阶段边界用窄候选再路由；目录之外的技能仍经 `pstack_skill` 加载。
4. **不发布索引旁路。** `src/skill-index.ts` 作为实验件保留，不挂进任何 preset。

## 替代方案

- **59 个技能全量可见。** 命中从 0/10 升到 5/7，但固定成本 +2,870 tokens，且随技能数增长线性上升；40 个以上之后每次请求都要付这笔钱。
- **注入紧凑索引。** 成本 +2,124 tokens 居中，命中却只有 3/10：模型看到了名字也不去加载，说明瓶颈在"是否行动"而非"是否知道"。
- **一条 mega-prompt 一次列全。** 把"该做什么"和"怎么做"压进一段话后，检查项无法逐条勾选，playbook 的 `n/a: <reason>` 规则失去载体，完整性退化为一次性回忆。
- **词面/关键词路由。** 用户的请求是中文、技能描述是英文，词面匹配不可靠；语义路由（第二版实验）留作索引方案失效时的后备。

## 后果

- 每次请求多付约 953–1,900 tokens 与 1.5–3 s 路由延迟；超时 6 s 即静默放弃，回合继续但在无路由状态下进行。
- 路由错误会显形为"加载了错的 playbook"或"没有加载"，trace 落盘可复盘；`feature` 与 `multi-phase-plan` 的边界尚未定（BL-06）。
- headless bundle 不组 preset roster，`pstack-auto` 的效果只能在 web/desktop 会话里验证；该限制已写进 `docs/fork/SKILL-DISCOVERY.md` 的 Verification limit。
- 入口技能清单与上游 pstack 版本绑定：缺技能或 flag 缺失会让构建失败，而不是静默产出半份目录。