import { bad, ok, resultText } from "./_shared.mjs";

export default {
  id: "CASE-PSTACK-SUBAGENT-CWD-01",
  title: "pstack_subagent 使用 cwd 指定工作目录",
  build() {
    return {
      prompt: [
        "请让 pstack 的普通子代理（不要使用只读代理）把工作目录设为 `playground`，在该目录里读取 `README.md`，并用一句话总结其中的准备步骤。",
        "必须交给子代理完成，不要自己读取；只报告结果。",
      ].join("\n"),
      verify({ calls }) {
        const subagentCalls = calls.filter((call) => call.tool === "pstack_subagent");
        if (subagentCalls.length === 0) return bad("没有调用 pstack_subagent");
        if (subagentCalls.length > 1)
          return bad(`pstack_subagent 调用了 ${subagentCalls.length} 次，期望一次成功`);
        const input = subagentCalls[0].input ?? {};
        if (
          typeof input.cwd !== "string" ||
          (input.cwd !== "playground" && !input.cwd.replaceAll("\\", "/").endsWith("/playground"))
        )
          return bad(`pstack_subagent cwd=${JSON.stringify(input.cwd)}，期望 playground 目录`);
        if (!resultText(subagentCalls[0]).includes("started"))
          return bad(`子代理未报告启动：${resultText(subagentCalls[0]).slice(0, 200)}`);
        return ok("pstack_subagent 一次在 playground cwd 启动子代理");
      },
    };
  },
};
