import { describe, expect, it } from "vite-plus/test";

import {
  globToRegExp,
  parseChecklist,
  renderReport,
  selectItems,
} from "../scripts/check-breaking.mjs";

const doc = [
  "# 破坏面清单",
  "",
  "给人看的前言。",
  "",
  "<!-- checklist:begin -->",
  "```json",
  JSON.stringify(
    [
      {
        id: "runtime-vs-generated",
        trigger: ["pstack/**", "runtime/**"],
        check: "生成树里每个生产脚本都要在 runtime 有来源",
        history: "PR #6/#10 缺 janitor",
      },
      {
        id: "preset-rows",
        trigger: ["cordis.patch.yml"],
        check: "preset 行名与服务注入要和 headless 兼容",
        history: "b8acd20",
      },
      {
        id: "comment-gate",
        trigger: ["src/**/*.ts"],
        check: "不许新增解释性注释",
        history: "用户要求",
      },
    ],
    undefined,
    2,
  ),
  "```",
  "<!-- checklist:end -->",
  "",
  "尾巴。",
].join("\n");

describe("breaking checklist", () => {
  it("reads the machine block and ignores the prose around it", () => {
    const items = parseChecklist(doc);
    expect(items.map((item) => item.id)).toEqual([
      "runtime-vs-generated",
      "preset-rows",
      "comment-gate",
    ]);
    expect(items[0].check).toContain("runtime");
  });

  it("turns a glob into a matcher", () => {
    expect(globToRegExp("pstack/**").test("pstack/skills/a/SKILL.md")).toBe(true);
    expect(globToRegExp("pstack/**").test("src/a.ts")).toBe(false);
    expect(globToRegExp("cordis.patch.yml").test("cordis.patch.yml")).toBe(true);
    expect(globToRegExp("src/**/*.ts").test("src/a.ts")).toBe(true);
    expect(globToRegExp("src/**/*.ts").test("src/deep/b.ts")).toBe(true);
    expect(globToRegExp("src/**/*.ts").test("src/deep/b.mjs")).toBe(false);
  });

  it("selects only the items whose trigger the diff touches", () => {
    const items = parseChecklist(doc);
    const selected = selectItems(items, ["cordis.patch.yml", "README.md"]);
    expect(selected.map((item) => item.id)).toEqual(["preset-rows"]);
  });

  it("reports several items once each, in checklist order", () => {
    const items = parseChecklist(doc);
    const selected = selectItems(items, [
      "src/a.ts",
      "pstack/skills/x/SKILL.md",
      "src/b.ts",
      "runtime/skills/x/a.ts",
    ]);
    expect(selected.map((item) => item.id)).toEqual(["runtime-vs-generated", "comment-gate"]);
  });

  it("says so when nothing is triggered", () => {
    const report = renderReport(selectItems(parseChecklist(doc), ["README.md"]));
    expect(report).toContain("no breaking-surface item");
  });

  it("renders the check each triggered item asks for", () => {
    const report = renderReport(selectItems(parseChecklist(doc), ["cordis.patch.yml"]));
    expect(report).toContain("preset-rows");
    expect(report).toContain("preset 行名与服务注入要和 headless 兼容");
    expect(report).not.toContain("comment-gate");
  });
});
