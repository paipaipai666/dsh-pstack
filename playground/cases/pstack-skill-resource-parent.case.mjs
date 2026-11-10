import { bad, ok, resultText } from "./_shared.mjs";

export default {
  id: "CASE-PSTACK-SKILL-RESOURCE-PARENT-01",
  title: "pstack_skill 读取带 ../ 的技能相对资源",
  build() {
    return {
      prompt: [
        "请加载 pstack 的 `how` 技能，并读取路径 `references/../references/explainer-prompt.md` 指向的参考文件，确认它可读。",
        "resource 参数请原样保留 `../` 片段，不要规范化成 `references/explainer-prompt.md`；只读取这个参考文件，不要执行技能正文，也不要修改文件。",
      ].join("\n"),
      verify({ calls }) {
        const targetCalls = calls.filter(
          (call) =>
            call.tool === "pstack_skill" &&
            call.input?.name === "how" &&
            typeof call.input?.resource === "string" &&
            call.input.resource.includes("../") &&
            call.input.resource.endsWith("references/explainer-prompt.md"),
        );
        if (targetCalls.length === 0) return bad("没有用 pstack_skill 读取带 ../ 的资源");
        if (targetCalls.length > 1)
          return bad(`带 ../ 的资源调用了 ${targetCalls.length} 次，期望一次成功`);
        const text = resultText(targetCalls[0]);
        if (!text.includes('<skill_resource path="')) {
          return bad(`资源结果未包含 skill_resource：${text.slice(0, 300)}`);
        }
        return ok(`pstack_skill 一次读取带 ../ 的相对资源成功：${targetCalls[0].input.resource}`);
      },
    };
  },
};
