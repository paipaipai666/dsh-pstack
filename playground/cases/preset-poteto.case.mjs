import { bad, ok, resultText } from "./_shared.mjs";

export default {
  id: "CASE-PSTACK-PRESET-POTETO-01",
  title: "poteto-agent preset 可派发",
  build() {
    return {
      profile: "presets",
      prompt: [
        "请用 pstack 的实现型子代理回答一个简单问题：playground/README.md 是否存在？不需要选择 pstack 角色，role 用 null。",
        "必须交给子代理完成，不要自己读取；只报告结果。",
      ].join("\n"),
      verify({ calls }) {
        const subagentCalls = calls.filter((call) => call.tool === "pstack_subagent");
        if (subagentCalls.length === 0) return bad("没有调用 pstack_subagent");
        if (subagentCalls.length > 1)
          return bad(`pstack_subagent 调用了 ${subagentCalls.length} 次，期望一次成功`);
        if (subagentCalls[0].input?.agent !== "poteto-agent")
          return bad(`agent=${JSON.stringify(subagentCalls[0].input?.agent)}，期望 poteto-agent`);
        if (!resultText(subagentCalls[0]).includes("started"))
          return bad(`子代理未报告启动：${resultText(subagentCalls[0]).slice(0, 200)}`);
        return ok("pstack_subagent 一次使用 poteto-agent preset 启动成功");
      },
    };
  },
};
