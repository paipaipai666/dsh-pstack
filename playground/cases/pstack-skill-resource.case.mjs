import { bad, ok, resultText } from "./_shared.mjs";

export default {
  id: "CASE-PSTACK-SKILL-RESOURCE-01",
  title: "pstack_skill 读取技能相对资源",
  build() {
    return {
      prompt: [
        "请加载 pstack 的 `how` 技能里的 `references/explainer-prompt.md` 参考文件，告诉我它的用途。",
        "只需要读取这个参考文件，不要执行技能正文里的任务，也不要修改文件。",
      ].join("\n"),
      verify({ calls }) {
        const targetCalls = calls.filter(
          (call) =>
            call.tool === "pstack_skill" &&
            call.input?.name === "how" &&
            call.input?.resource === "references/explainer-prompt.md",
        );
        if (targetCalls.length === 0) return bad("没有用 pstack_skill 读取指定资源");
        if (targetCalls.length > 1)
          return bad(`pstack_skill 读取资源调用了 ${targetCalls.length} 次，期望一次成功`);
        const text = resultText(targetCalls[0]);
        if (!text.includes('<skill_resource path="references/explainer-prompt.md"')) {
          return bad(`资源结果未包含 skill_resource：${text.slice(0, 300)}`);
        }
        return ok("pstack_skill 一次读取 how 的相对资源成功");
      },
    };
  },
};
