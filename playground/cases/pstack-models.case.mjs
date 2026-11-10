import { bad, ok, resultText } from "./_shared.mjs";

export default {
  id: "CASE-PSTACK-MODELS-01",
  title: "pstack_models 返回当前可用路由",
  build(routes) {
    const route = routes[0];
    return {
      prompt: [
        "我准备给 pstack 配置角色模型，先帮我看看这个环境实际提供哪些模型路由和推理等级。",
        "不要猜，直接查一下；只报告结果，不要修改文件。",
      ].join("\n"),
      verify({ calls }) {
        const modelCalls = calls.filter((call) => call.tool === "pstack_models");
        if (modelCalls.length === 0) return bad("没有调用 pstack_models");
        if (modelCalls.length > 1)
          return bad(`pstack_models 调用了 ${modelCalls.length} 次，期望一次成功`);
        const text = resultText(modelCalls[0]);
        const expected = `${route.provider}/${route.model}`;
        if (!text.includes(expected)) {
          return bad(`结果未包含配置路由 ${expected}：${text.slice(0, 300)}`);
        }
        return ok(`pstack_models 一次返回包含 ${expected} 的路由目录`);
      },
    };
  },
};
