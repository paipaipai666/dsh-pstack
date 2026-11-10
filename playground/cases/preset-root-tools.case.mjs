import { bad, ok, resultText } from "./_shared.mjs";

const PSTACK_TOOLS = ["pstack_models", "pstack_roles", "pstack_subagent"];

function toolError(call) {
  const text = resultText(call);
  if (call?.result?.isError === true) return text;
  if (/unknown tool|is not available|failed to|tool_error/i.test(text)) return text;
  return undefined;
}

export default {
  id: "CASE-PRESET-ROOT-TOOLS-01",
  title: "poteto-mode 根 preset 会话暴露全部 pstack 原生工具且不重复",
  build() {
    return {
      profile: "root",
      prompt: [
        "我准备给 pstack 配置角色模型，先做只读核查，不要修改任何文件。",
        "请完成三件事并汇报结论：",
        "1）列出当前环境实际可用的模型路由和推理档位；",
        "2）说明 pstack 里哪些角色适合一次启动多个子代理；",
        "3）确认 playground/README.md 是否存在。第 3 项必须交给一个实现型子代理完成，不要自己读取文件；role 用 null。",
      ].join("\n"),
      verify({ calls, run }) {
        const missing = PSTACK_TOOLS.filter((tool) => !calls.some((call) => call.tool === tool));
        if (missing.length > 0) {
          return bad(`根 preset 会话缺少或未调用原生工具：${missing.join(", ")}`);
        }
        for (const tool of PSTACK_TOOLS) {
          const call = calls.find((entry) => entry.tool === tool);
          const error = call === undefined ? "missing" : toolError(call);
          if (error !== undefined) return bad(`${tool} 调用失败：${String(error).slice(0, 200)}`);
        }
        const duplicate = /already registered|duplicate tool|工具已注册|重复注册/i.test(
          run.stderr ?? "",
        );
        if (duplicate) return bad(`会话启动疑似重复注册：${(run.stderr ?? "").slice(0, 200)}`);
        return ok("poteto-mode 根 preset 会话中 models/roles/subagent 均可用，且无重复注册迹象");
      },
    };
  },
};
