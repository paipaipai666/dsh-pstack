import { bad, ok, resultText } from "./_shared.mjs";

export default {
  id: "CASE-PSTACK-SKILL-AUTHORED-01",
  title: "pstack_skill 加载 authored 技能",
  build() {
    return {
      prompt: [
        "请加载 pstack 的 `decision-write` 技能，确认它可读，并告诉我它用于什么。",
        "只读取技能说明，不要执行其中的任务，也不要修改文件。",
      ].join("\n"),
      verify({ calls }) {
        const targetCalls = calls.filter(
          (call) =>
            (call.tool === "pstack_skill" || call.tool === "skill") &&
            call.input?.name === "decision-write",
        );
        if (targetCalls.length === 0) return bad("没有加载 decision-write");
        if (targetCalls.length > 1)
          return bad(`decision-write 调用了 ${targetCalls.length} 次，期望一次成功`);
        if (!resultText(targetCalls[0]).includes("Write or update a decision record")) {
          return bad(`authored 技能正文未返回：${resultText(targetCalls[0]).slice(0, 300)}`);
        }
        return ok(`一次加载 authored decision-write 技能（${targetCalls[0].tool}）`);
      },
    };
  },
};
