# Playground agent 须知

- 启动用 `vp run playground`。改了插件源码先 `vp run build` 再重启。
- 启动端口固定 `17353`。已有 playground 时沿用，其他占用必须先获得用户指示。
- 运行期 DSH home 是 `playground/.dsh`。不要另建测试用 home 或 profile。
- 浏览器截图和不涉及模型选择的 UI 交互用 `playground/browser.mjs` 或 agent-browser 完成。
- 无头用例从 `playground/config.json` 读取用户允许的模型。用 `vp run cases:check` 先校验，再用 `vp run cases` 执行。
- 无头用例必须使用自然的用户提示词，不得直接点名工具或展开调用参数；每个目标必须在一次会话中首次调用成功，出现失败后重试、重复加载或先错后对的用例判为失败。
- 不要用例并发运行，也不要与手动会话共享同一份运行期配置进行写入。
- 真实会话的模型选择由用户确认。agent 可以用会话日志核对调用和返回。
