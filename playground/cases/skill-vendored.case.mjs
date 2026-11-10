import { bad, ok, resultText } from "./_shared.mjs";

function callsTo(calls, name) {
  return calls.filter(
    (call) => (call.tool === "pstack_skill" || call.tool === "skill") && call.input?.name === name,
  );
}

export default {
  id: "CASE-SKILL-VENDORED-01",
  title: "pstack 技能链式调用 vendored 技能",
  build() {
    return {
      prompt: [
        "我在整理 pstack 的提交前检查流程。请查看 pstack 的 `poteto-mode` 技能对提交前的要求，并实际加载它要求使用的那个技能确认可用。",
        "不要执行清理、测试或提交，只做技能加载检查，最后用一句话回答。",
      ].join("\n"),
      verify({ calls }) {
        const pstackCalls = callsTo(calls, "poteto-mode");
        const vendoredCalls = callsTo(calls, "deslop");
        if (pstackCalls.length === 0) return bad("没有加载 pstack 的 poteto-mode 技能");
        if (pstackCalls.length > 1)
          return bad(`poteto-mode 调用了 ${pstackCalls.length} 次，期望一次成功`);
        if (vendoredCalls.length === 0) return bad("poteto-mode 没有继续加载 vendored 的 deslop");
        if (vendoredCalls.length > 1)
          return bad(`deslop 调用了 ${vendoredCalls.length} 次，期望一次成功`);
        const pstackIndex = calls.indexOf(pstackCalls[0]);
        const vendoredIndex = calls.indexOf(vendoredCalls[0]);
        if (vendoredIndex < pstackIndex)
          return bad("deslop 在 poteto-mode 之前被加载，未形成 pstack 技能链式调用");
        if (!resultText(pstackCalls[0]).includes('<skill_content name="poteto-mode"')) {
          return bad(`poteto-mode 正文未返回：${resultText(pstackCalls[0]).slice(0, 200)}`);
        }
        if (!resultText(vendoredCalls[0]).includes("Remove AI code slop")) {
          return bad(`deslop 正文未返回：${resultText(vendoredCalls[0]).slice(0, 200)}`);
        }
        return ok("pstack 的 poteto-mode 一次调用并链式加载 deslop 成功");
      },
    };
  },
};
