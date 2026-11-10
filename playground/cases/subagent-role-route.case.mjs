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

const EFFORT_ORDER = ["max", "xhigh", "high", "medium", "low", "off"];

export function highestEffortRoute(routes) {
  const groups = new Map();
  for (const route of routes) {
    const key = `${route.provider}/${route.model}`;
    groups.set(key, [...(groups.get(key) ?? []), route]);
  }
  const candidates = [...groups.values()].filter(
    (group) => group.length >= 2 && group.every((route) => EFFORT_ORDER.includes(route.effort)),
  );
  return candidates[0]?.toSorted(
    (left, right) => EFFORT_ORDER.indexOf(left.effort) - EFFORT_ORDER.indexOf(right.effort),
  )[0];
}

export default {
  id: "CASE-PSTACK-SUBAGENT-ROUTE-01",
  title: "pstack_subagent 按角色路由并调整思考等级",
  build(routes) {
    const route = highestEffortRoute(routes);
    if (route === undefined) {
      return { skip: "路由用例需要一个至少声明两种已知思考等级的模型，不支持自定义词表" };
    }
    return {
      setup() {
        setupRoleFile(`bug-fix: ${route.provider}/${route.model}\n`);
      },
      cleanup: restoreRoleFile,
      prompt: [
        "请用 pstack 的 `bug-fix` 角色把一个简单任务交给一个普通子代理：读取 playground/README.md，并用一句话总结其中的准备步骤。",
        "使用当前会话目录即可，不需要另行指定工作目录；这次请使用该模型支持的最高思考等级。必须由子代理完成，不要自己阅读。",
      ].join("\n"),
      verify({ calls }) {
        const subagentCalls = calls.filter((call) => call.tool === "pstack_subagent");
        if (subagentCalls.length === 0) return bad("没有调用 pstack_subagent");
        if (subagentCalls.length > 1)
          return bad(`pstack_subagent 调用了 ${subagentCalls.length} 次，期望一次成功`);
        const input = subagentCalls[0].input ?? {};
        if (typeof input.description !== "string" || input.description.trim() === "")
          return bad("pstack_subagent description 缺失");
        if (typeof input.prompt !== "string" || input.prompt.trim() === "")
          return bad("pstack_subagent prompt 缺失");
        if (input.role !== "bug-fix")
          return bad(`pstack_subagent role=${JSON.stringify(input.role)}，期望 bug-fix`);
        if (input.roleIndex !== null)
          return bad(`pstack_subagent roleIndex=${JSON.stringify(input.roleIndex)}，期望 null`);
        if (input.agent !== "general")
          return bad(`pstack_subagent agent=${JSON.stringify(input.agent)}，期望 general`);
        if (input.reasoningEffort !== route.effort)
          return bad(
            `pstack_subagent reasoningEffort=${JSON.stringify(input.reasoningEffort)}，期望 ${route.effort}`,
          );
        const text = resultText(subagentCalls[0]);
        const routeLabel = `${route.provider}/${route.model}`;
        if (!text.includes(`route=${routeLabel}`))
          return bad(`子代理结果未报告角色路由 ${routeLabel}：${text.slice(0, 300)}`);
        if (!text.includes(`effort=${route.effort}`))
          return bad(`子代理结果未报告思考等级 ${route.effort}：${text.slice(0, 300)}`);
        return ok(
          `pstack_subagent 一次按 bug-fix 路由启动子代理，route=${routeLabel}，effort=${route.effort}`,
        );
      },
    };
  },
};
