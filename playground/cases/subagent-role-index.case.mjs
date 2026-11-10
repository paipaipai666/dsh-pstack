import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { bad, ok, resultText } from "./_shared.mjs";

const roleFile = join(process.cwd(), "playground/.dsh/pstack-models.mdc");
let previous;

function setupRoleFile(text) {
  mkdirSync(dirname(roleFile), { recursive: true });
  previous = existsSync(roleFile) ? readFileSync(roleFile, "utf8") : undefined;
  writeFileSync(roleFile, text, "utf8");
}

function restoreRoleFile() {
  if (previous === undefined) rmSync(roleFile, { force: true });
  else writeFileSync(roleFile, previous, "utf8");
}

export default {
  id: "CASE-PSTACK-SUBAGENT-ROLEINDEX-01",
  title: "pstack_subagent 用 roleIndex 选择列表路由",
  build(routes) {
    const route = routes[0];
    const entry = `${route.provider}/${route.model}`;
    return {
      setup() {
        setupRoleFile(`swarm workers: inherit-parent, ${entry}\n`);
      },
      cleanup: restoreRoleFile,
      prompt: [
        "请用 pstack 的 `swarm workers` 角色的第二个路由启动一个普通子代理，让它只回报当前工作目录。",
        "不要选第一个路由，也不要自己回答；只报告启动结果和子代理使用的路由。",
      ].join("\n"),
      verify({ calls }) {
        const subagentCalls = calls.filter((call) => call.tool === "pstack_subagent");
        if (subagentCalls.length === 0) return bad("没有调用 pstack_subagent");
        if (subagentCalls.length > 1)
          return bad(`pstack_subagent 调用了 ${subagentCalls.length} 次，期望一次成功`);
        const input = subagentCalls[0].input ?? {};
        if (input.role !== "swarm workers")
          return bad(`pstack_subagent role=${JSON.stringify(input.role)}，期望 swarm workers`);
        if (input.roleIndex !== 1)
          return bad(`pstack_subagent roleIndex=${JSON.stringify(input.roleIndex)}，期望 1`);
        const text = resultText(subagentCalls[0]);
        if (!text.includes(`route=${entry}`))
          return bad(`结果未报告第二个路由 ${entry}：${text.slice(0, 300)}`);
        return ok(`pstack_subagent 一次用 roleIndex=1 选择 ${entry}`);
      },
    };
  },
};
