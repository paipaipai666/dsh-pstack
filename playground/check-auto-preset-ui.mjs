#!/usr/bin/env node
// UI regression for the `pstack-auto` preset picker (web UI, playground).
//
// What it proves, which no headless case can: the preset is reachable in the
// picker under its experimental name, choosing it raises the one-shot notice,
// and acknowledging the notice is remembered for that Session.
//
// Usage:
//   node playground/check-auto-preset-ui.mjs <tokenized-url> [--out shot.png]
//
// Start the playground first (`vp run playground`) and pass the tokenized URL it
// prints; the port is fixed at 17353 and each start issues a new token.
//
// Exit codes: 0 pass, 1 the UI did not behave as expected, 2 setup problem.
import { join } from "node:path";
import { createBrowserSession, consoleErrors } from "./browser.mjs";

const DISMISS_KEY = "pstack:auto-notice-dismissed";

// One expression: dismiss the preview banner if it is still up, clear the
// dismissal record, open the preset menu, pick the experimental preset, read the
// notice, acknowledge it, then report what the page kept.
const FLOW = `(async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const buttons = () =>
    [...document.querySelectorAll("button,[role=button],[role=menuitem],[role=option]")];
  const byText = (text) => buttons().find((el) => (el.innerText || "").trim().includes(text));
  const report = { menuItem: null, dialog: null, ack: false, closed: false, stored: [] };

  localStorage.removeItem(${JSON.stringify(DISMISS_KEY)});
  await sleep(200);
  byText("继续")?.click();
  await sleep(400);
  byText("标准模式")?.click();
  await sleep(600);

  const item = buttons().find((el) => (el.innerText || "").trim().startsWith("Poteto 自动模式"));
  if (item === undefined) return JSON.stringify(report);
  report.menuItem = (item.innerText || "").trim().slice(0, 120);
  item.click();
  await sleep(1500);

  const dialog = document.querySelector("[role=dialog]");
  report.dialog = dialog === null ? null : (dialog.innerText || "").trim().replace(/\\s+/g, " ");
  const ack = buttons().find((el) => (el.innerText || "").trim() === "知道了");
  report.ack = ack !== undefined;
  ack?.click();
  await sleep(600);

  report.closed = document.querySelectorAll("[role=dialog]").length === 0;
  try {
    report.stored = JSON.parse(localStorage.getItem(${JSON.stringify(DISMISS_KEY)}) || "[]");
  } catch {
    report.stored = [];
  }
  return JSON.stringify(report);
})()`;

function fail(detail) {
  console.error(`[ui] FAIL: ${detail}`);
  process.exitCode = 1;
}

function parsePayload(raw) {
  const once = JSON.parse(raw);
  return typeof once === "string" ? JSON.parse(once) : once;
}

function main() {
  const argv = process.argv.slice(2);
  let url;
  let out;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--out") out = argv[++index];
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "usage: node playground/check-auto-preset-ui.mjs <tokenized-url> [--out shot.png]",
      );
      return;
    } else if (!arg.startsWith("--")) url = arg;
    else {
      console.error(`unknown argument: ${arg}`);
      process.exitCode = 2;
      return;
    }
  }
  if (url === undefined) {
    console.error("missing playground URL; run `vp run playground` and pass the ?token=... URL");
    process.exitCode = 2;
    return;
  }

  const session = createBrowserSession({ url });
  let report;
  let pageErrors;
  try {
    report = parsePayload(session.step(["eval", FLOW]));
    if (out !== undefined) {
      session.step(["screenshot", join(process.cwd(), out)]);
      console.log(`[ui] screenshot: ${out}`);
    }
    // Console errors would be a real regression in the dialog, not noise.
    pageErrors = consoleErrors(session);
  } finally {
    session.close();
  }

  const errors = [];
  if (report.menuItem === null) errors.push("预设菜单里没有 Poteto 自动模式");
  else if (!report.menuItem.includes("（实验性）"))
    errors.push(`菜单项缺少实验性标注：${report.menuItem}`);
  if (report.dialog === null) errors.push("选中预设后没有出现提示");
  else {
    if (!report.dialog.includes("实验性预设")) errors.push(`提示标题不对：${report.dialog}`);
    if (!report.dialog.includes("仍在实验阶段")) errors.push("提示正文缺少实验阶段说明");
    if (!report.dialog.includes("换回 Poteto 模式")) errors.push("提示正文缺少回退指引");
  }
  if (!report.ack) errors.push("提示里没有“知道了”按钮");
  if (report.closed !== true) errors.push("点“知道了”后提示没有关闭");
  if (!Array.isArray(report.stored) || report.stored.length === 0)
    errors.push(`${DISMISS_KEY} 没有记下这个 Session`);
  else if (report.stored.some((id) => typeof id !== "string" || id.length === 0))
    errors.push(`${DISMISS_KEY} 里出现空 Session id`);

  for (const message of pageErrors ?? []) errors.push(`console: ${message}`);

  if (errors.length > 0) {
    fail(errors.join("; "));
    return;
  }
  console.log(
    `[ui] PASS  预设带实验性标注，选中弹一次提示，知道了记住 Session（${report.stored.length} 个）`,
  );
}

main();
