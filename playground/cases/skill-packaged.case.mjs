import { bad, ok, resultText } from "./_shared.mjs";

export default {
  id: "CASE-SKILL-PACKAGED-01",
  title: "随包隐藏 pstack 技能可加载",
  build() {
    return {
      prompt: [
        "请用 pstack 的 `principle-explain-the-number` 技能说明怎样判断一个性能数字是否可信。",
        "只给出一句话结论，不要修改文件。",
      ].join("\n"),
      verify({ calls }) {
        const targetCalls = calls.filter(
          (call) =>
            (call.tool === "pstack_skill" || call.tool === "skill") &&
            call.input?.name === "principle-explain-the-number",
        );
        if (targetCalls.length === 0) return bad("没有加载 principle-explain-the-number");
        if (targetCalls.length > 1)
          return bad(`principle-explain-the-number 调用了 ${targetCalls.length} 次，期望一次成功`);
        if (targetCalls[0].tool !== "pstack_skill")
          return bad(`第一次使用 ${targetCalls[0].tool} 加载，期望 pstack_skill`);
        if (
          !resultText(targetCalls[0]).includes('<skill_content name="principle-explain-the-number"')
        ) {
          return bad(`技能正文未返回：${resultText(targetCalls[0]).slice(0, 200)}`);
        }
        return ok("pstack_skill 一次加载 principle-explain-the-number 成功");
      },
    };
  },
};
