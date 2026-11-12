import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

import { bad, ok, resultText } from "./_shared.mjs";

const logFile = join(process.cwd(), "playground", ".dsh", "pstack-script-log.tsv");

export default {
  id: "CASE-PSTACK-SCRIPT-LOG-01",
  title: "pstack_script 真实运行 log 脚本并写出 TSV",
  build() {
    return {
      setup() {
        mkdirSync(dirname(logFile), { recursive: true });
        rmSync(logFile, { force: true });
      },
      cleanup() {
        rmSync(logFile, { force: true });
      },
      prompt: [
        `请用 pstack 的日志工具把这次验证记录到 ${logFile}，字段依次是 phase、decision、why、evidence、result。`,
        "所有字段用 verify 值，不要自己创建文件，也不要使用 shell。",
      ].join("\n"),
      verify({ calls }) {
        const scriptCalls = calls.filter((call) => call.tool === "pstack_script");
        if (scriptCalls.length === 0) return bad("没有调用 pstack_script");
        if (scriptCalls.length > 1)
          return bad(`pstack_script 调用了 ${scriptCalls.length} 次，期望一次成功`);
        const input = scriptCalls[0].input ?? {};
        if (input.id !== "log")
          return bad(`pstack_script id=${JSON.stringify(input.id)}，期望 log`);
        const text = resultText(scriptCalls[0]);
        if (!/exit(?:ed)? code 0|exit=0|exited with code 0/i.test(text))
          return bad(`pstack_script 没有报告成功：${text.slice(0, 300)}`);
        if (!existsSync(logFile)) return bad(`日志文件没有写出：${logFile}`);
        const body = readFileSync(logFile, "utf8");
        for (const field of ["phase", "decision", "why", "evidence", "result"]) {
          if (!body.includes(field)) return bad(`日志缺少字段 ${field}：${body.slice(0, 300)}`);
        }
        return ok(`pstack_script log 写出 ${logFile}`);
      },
    };
  },
};
