/**
 * Tasks for the playbook-routing experiment.
 *
 * Each prompt is the kind of request that belongs to one playbook, written the
 * way an operator would write it: no skill name, no playbook name, no tool
 * name. `expect` lists the playbooks that are a defensible entry; the control
 * lists none, because a one-line question needs no workflow.
 *
 * Every request is bounded by what it asks for ("first tell me the plan") so one
 * run cannot turn into a full implementation; the routing decision is what is
 * under test, not the build.
 */
export const PLAYBOOK_TASKS = [
  {
    id: "feature-entry",
    expect: ["feature"],
    prompt:
      "我准备把插件的客户端配置页从单个列表改成按角色分组的编辑器，会同时动到 client 和 host 两边，还要保持旧的配置文件能读。先说清楚你打算怎么改，我确认后再动手。",
  },
  {
    id: "bug-entry",
    expect: ["bug-fix"],
    prompt:
      "线上反馈：用 --profile 跑 headless 时，偶尔会读到上一个 profile 的 patch，本地几乎复现不了。先说清楚你打算怎么查和怎么修，我确认后再动手。",
  },
  {
    id: "refactor-entry",
    expect: ["refactoring"],
    prompt:
      "src/subagent.ts 已经八百多行，路由解析、prompt 拼装、子代理启动全混在一起。我想把它们拆开但不改任何行为。先说清楚你打算怎么拆，我确认后再动手。",
  },
  {
    id: "investigate-entry",
    expect: ["investigation", "runtime-forensics"],
    prompt: "帮我查清楚 playground 的 headless 用例为什么会偶发超时，给我结论和证据，不要改代码。",
  },
  {
    id: "plan-entry",
    expect: ["multi-phase-plan"],
    prompt:
      "我准备把 pstack 的角色配置从 mdc 文件迁到 JSON schema 驱动，大概会拆成五六个 PR。先给我一份能逐步执行的计划，别写代码。",
  },
  {
    id: "small-control",
    expect: [],
    prompt: "回答一个问题就好：这个仓库的 package.json 里 engines.node 要求什么版本？",
  },
];
