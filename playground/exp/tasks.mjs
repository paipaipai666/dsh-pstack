/**
 * Tasks for the skill-discovery experiment.
 *
 * Each task is a self-contained Chinese request that a pstack skill covers, with
 * the skill a well-routed agent should load. Prompts never name a skill or a
 * tool: the question under test is whether the agent finds one by itself.
 */

export const TASKS = [
  {
    id: "unslop",
    expect: "unslop",
    prompt:
      "这三句话读起来太像 AI 写的了，帮我把它们改成像人写的：『在当今数字化浪潮下，我们致力于打造端到端的解决方案，全方位赋能企业的转型升级。通过深度融合前沿技术，我们持续为用户创造价值。』直接给改写结果就行，不用改文件。",
  },
  {
    id: "statechart",
    expect: "statechart",
    prompt:
      "帮我用一个状态机把订单的生命周期梳理清楚并画成图：下单后待支付，支付成功变已支付，商家发货变已发货，用户确认变已完成；已支付和已发货都能申请退款，退款完成就关闭；待支付超过 30 分钟自动取消。用文字加图说明即可，不用写文件。",
  },
  {
    id: "interrogate",
    expect: "interrogate",
    prompt:
      "我要用 Redis 做一个分布式锁：SETNX 加锁，过期时间 30 秒，失败重试 3 次，每次间隔 200ms。帮我把这个方案往死里挑毛病，找出我没看到的盲点。直接说结论，不用写文件。",
  },
  {
    id: "how",
    expect: "how",
    prompt:
      "这段代码是怎么工作的？我马上要改它，先弄清楚它的执行顺序：\n\n```ts\nexport function useThing(id: string) {\n  const [s, setS] = useState<Thing | null>(null);\n  useEffect(() => {\n    let alive = true;\n    fetch(`/api/${id}`).then((r) => r.json()).then((d) => {\n      if (alive) setS(d);\n    });\n    return () => {\n      alive = false;\n    };\n  }, [id]);\n  return s;\n}\n```\n\n解释就行，不用改文件。",
  },
  {
    id: "teach",
    expect: "teach",
    prompt:
      "用一个新人能听懂的方式讲讲：React 里 useEffect 的依赖数组如果漏了一个值，为什么回调会一直读到旧的数据？讲清楚就行。",
  },
  {
    id: "figure-it-out",
    expect: "figure-it-out",
    prompt:
      "我要把这个前端项目里剩下的 8 个 class 组件全部改成函数组件，其中 3 个用了 componentDidMount 和 componentDidUpdate。这活儿我想做成可审计的：每一步都能被人中途叫停检查。帮我设计这个执行方案，不用动代码。",
  },
  {
    id: "arena",
    expect: "arena",
    prompt:
      "『把用户输入里的 URL 自动识别并转成可点击链接』这个需求，我想先看到三种不同思路的实现，然后从里面挑一个最好的继续。先别动仓库，直接给我方案。",
  },
  {
    id: "sharpen",
    expect: "sharpen",
    prompt:
      "我想让 agent 帮忙把这个仓库的日志格式统一一下，把所有 console.log 换成统一的 logger。帮我把这个任务重新写一遍，让它更深一点，而不是更大。",
  },
  {
    id: "technical-writing",
    expect: "technical-writing",
    prompt:
      "把这段说明改写成规范的技术文档：『你想用这个功能的话，先装依赖，然后跑 build，最后打开浏览器输入 localhost:3000 就能看到了。如果报错就重启一下。』",
  },
  {
    id: "why",
    expect: "why",
    prompt:
      "为什么这段代码用 useRef 存定时器 id，而不是用 useState？\n\n```tsx\nconst timer = useRef<number>();\nuseEffect(() => {\n  timer.current = window.setInterval(tick, 1000);\n  return () => window.clearInterval(timer.current);\n}, []);\n```",
  },
  {
    id: "decision-write",
    expect: "decision-write",
    prompt:
      "帮我把这个决定写成一条决策记录：我们选择用 SQLite 而不是 Postgres，因为部署环境装不了数据库服务。",
  },
  {
    // Control: no pstack skill covers this, so any load is a false trigger.
    id: "plain-code",
    expect: null,
    prompt:
      "帮我把这个 Python 函数改成原地排序，去掉返回值，只保留副作用：\n\ndef sort_items(items):\n    return sorted(items)",
  },
  {
    // Control: conversation, not a task.
    id: "chitchat",
    expect: null,
    prompt: "随便聊两句：你平时读技术书吗？",
  },
];
