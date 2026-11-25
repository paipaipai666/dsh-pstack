import { bad, ok, resultText } from "./_shared.mjs";

// The `pstack-auto` preset publishes ten entry skills with
// `disable-model-invocation` stripped, so they reach the model catalog and the
// model may load one on its own. Headless sessions compose no preset roster, so
// this case runs under the `auto` profile, which mounts the same generated tree
// as a host-level `skill-filesystem` row.
export default {
  id: "CASE-PSTACK-AUTO-SKILL-01",
  title: "pstack-auto 让模型自己加载入口技能",
  build() {
    return {
      profile: "auto",
      prompt: [
        "这三句话读起来太像 AI 写的了，帮我把它们改成像人写的：",
        "『在当今数字化浪潮下，我们致力于打造端到端的解决方案，全方位赋能企业的转型升级。通过深度融合前沿技术，我们持续为用户创造价值。』",
        "直接给改写结果就行，不用改文件。",
      ].join("\n"),
      verify({ calls }) {
        const loads = calls.filter(
          (call) => (call.tool === "skill" || call.tool === "pstack_skill") && call.input?.name,
        );
        const first = loads[0];
        if (first === undefined) return bad("会话没有加载任何技能");
        if (first.input.name !== "unslop")
          return bad(`首次加载的是 ${first.input.name}，期望 unslop`);
        if (loads.filter((call) => call.input.name === "unslop").length > 1)
          return bad("unslop 被加载了多次，期望一次成功");
        if (first.tool !== "skill") return bad(`通过 ${first.tool} 加载，说明技能仍未对模型可见`);
        if (!resultText(first).includes("Edit text to remove AI patterns")) {
          return bad(`技能正文未返回：${resultText(first).slice(0, 300)}`);
        }
        return ok(`模型自己通过 skill 加载了入口技能 unslop`);
      },
    };
  },
};
