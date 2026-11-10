import { bad, ok, resultText } from "./_shared.mjs";

export default {
  id: "CASE-PSTACK-PRESET-COMMENT-01",
  title: "comment-sicko preset 可派发",
  build() {
    return {
      profile: "presets",
      prompt: [
        "请用 pstack 的评论评审子代理检查 `playground/cases/_shared.mjs` 里的注释，只报告评论问题。",
        "不要修改任何文件；必须交给子代理完成，不要自己阅读。",
      ].join("\n"),
      verify({ calls }) {
        const subagentCalls = calls.filter((call) => call.tool === "pstack_subagent");
        if (subagentCalls.length === 0) return bad("没有调用 pstack_subagent");
        if (subagentCalls.length > 1)
          return bad(`pstack_subagent 调用了 ${subagentCalls.length} 次，期望一次成功`);
        if (subagentCalls[0].input?.agent !== "comment-sicko")
          return bad(`agent=${JSON.stringify(subagentCalls[0].input?.agent)}，期望 comment-sicko`);
        if (!resultText(subagentCalls[0]).includes("started"))
          return bad(`子代理未报告启动：${resultText(subagentCalls[0]).slice(0, 200)}`);
        return ok("pstack_subagent 一次使用 comment-sicko preset 启动成功");
      },
    };
  },
};
