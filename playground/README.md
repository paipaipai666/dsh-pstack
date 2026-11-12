# Playground

本目录提供真实 DSH 环境的验证基建。插件功能和适配结论由移植审核文档决定，不在这里预设。

## 准备

1. 在仓库根目录运行 `vp install`。
2. 按 `port/AGENTS.md` 准备插件源码和生成树，再运行 `vp run build`。
3. 确认 `dsh` 在 PATH 中，或把 `DSH_BIN` 指向可执行的 `dsh.cmd`。
4. 运行 `vp run playground`，启动 `127.0.0.1:17353` 上的 Web 环境。CI 只准备 profile 时用 `vp run playground:prepare`，它不检查端口也不启动 Web。

启动器每次同步 `playground/profile/`、宿主凭据和模型配置。运行期文件、依赖、会话和凭据保存在已忽略的 `playground/.dsh/`。

```sh
vp run playground:reset       # 重建运行期 profile
vp run playground:reinstall   # 重新安装插件依赖
```

端口固定为 `17353`。冲突时先确认是否已有 playground，不自行更换端口或停止其他服务。

## 浏览器验证

使用 `dsh web` 输出的带 token URL。

```sh
vp run playground:browser -- '<token URL>' --out .tmp/playground.png
vp run playground:browser -- '<token URL>' --click '<界面文本>' --no-shot
```

helper 输出页面正文、控制台错误和截图。也可以直接使用 `node_modules/.bin/agent-browser` 操作页面。

## 无头验证

复制 `playground/config.example.json` 为 `playground/config.json`，填写允许使用的 provider、apiKey、模型和思考等级。该文件已被忽略。

```sh
vp run cases:list       # 列出用例和就绪状态
vp run cases:check      # 校验配置、部署和路由，不调用模型
vp run cases            # 运行已注册用例
vp run cases -- --case CASE-ID
```

`cases/*.case.mjs` 注册用例。复制 `cases/_template.mjs` 开始。runner 提供事件流、工具调用和进程结果，每个用例定义自己的断言。报告写入 `playground/.dsh/cases-report/`，原始会话保存在 `playground/.dsh/sessions/`。

无头用例的提示词必须是自然的用户请求，不能直接点名工具或展开调用参数。每个目标只允许首次调用成功；出现失败后重试、重复加载或先错后对，该用例判为失败。

用例默认串行运行。每个用例即使写不同的 `pstack-models.mdc`，所有子进程仍共享同一个 `DSH_HOME` 和 profile；要并行运行，需要为每个 worker 复制独立的 DSH home 和 profile，不能只拆角色文件。runner 在正常结束和 SIGINT/SIGTERM 时都会执行当前用例的 cleanup。

不要把涉及用户模型选择的验证结论交给 agent 自行确认。自动化结果用于核对行为和日志，模型路由是否符合用户意图仍由用户确认。
