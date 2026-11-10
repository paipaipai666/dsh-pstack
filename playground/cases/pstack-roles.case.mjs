import { bad, ok, resultText } from "./_shared.mjs";

export default {
  id: "CASE-PSTACK-ROLES-01",
  title: "pstack_roles 报告可并行角色",
  build() {
    return {
      prompt: [
        "我想确认 pstack 里哪些角色适合一次启动多个子代理。",
        "请查一下角色定义，不要猜；只报告结论，不要修改文件。",
      ].join("\n"),
      verify({ calls }) {
        const roleCalls = calls.filter((call) => call.tool === "pstack_roles");
        if (roleCalls.length === 0) return bad("没有调用 pstack_roles");
        if (roleCalls.length > 1)
          return bad(`pstack_roles 调用了 ${roleCalls.length} 次，期望一次成功`);
        const text = resultText(roleCalls[0]);
        if (!text.includes("arena runners") || !text.includes("autoPanel=true")) {
          return bad(`角色目录未包含并行角色：${text.slice(0, 300)}`);
        }
        return ok("pstack_roles 一次返回包含 arena runners 的角色定义");
      },
    };
  },
};
