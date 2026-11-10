import { bad, ok, resultText } from "./_shared.mjs";

export default {
  id: "CASE-PSTACK-MODELS-PROVIDER-01",
  title: "pstack_models 按 provider 过滤",
  build(routes) {
    const provider = routes[0].provider;
    return {
      prompt: [
        `我只需要看 ${provider} 这个 provider 的模型路由，请查一下它实际提供哪些模型和推理等级。`,
        "不要猜，直接查；只报告该 provider 的结果，不要修改文件。",
      ].join("\n"),
      verify({ calls }) {
        const modelCalls = calls.filter((call) => call.tool === "pstack_models");
        if (modelCalls.length === 0) return bad("没有调用 pstack_models");
        if (modelCalls.length > 1)
          return bad(`pstack_models 调用了 ${modelCalls.length} 次，期望一次成功`);
        const input = modelCalls[0].input ?? {};
        if (input.provider !== provider)
          return bad(`pstack_models provider=${JSON.stringify(input.provider)}，期望 ${provider}`);
        const text = resultText(modelCalls[0]);
        if (!text.includes(provider)) return bad(`结果未包含 ${provider}：${text.slice(0, 300)}`);
        return ok(`pstack_models 一次按 ${provider} provider 返回路由`);
      },
    };
  },
};
