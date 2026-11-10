export default {
  id: "CASE-<TOPIC>-<NN>",
  title: "<一句话场景>",
  build() {
    return {
      prompt: "<发给会话的任务>",
      verify() {
        return { ok: false, detail: "在这里校验可观察事实" };
      },
    };
  },
};
