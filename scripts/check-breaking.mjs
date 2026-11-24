import { execFileSync } from "node:child_process";

import { readFileSync } from "node:fs";

import { join, resolve } from "node:path";

const CHECKLIST_PATH = "docs/fork/BREAKING-CHECKLIST.md";
const BLOCK = /<!-- checklist:begin -->([\s\S]*?)<!-- checklist:end -->/;

export function globToRegExp(pattern) {
  let out = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "*") {
      if (pattern[index + 1] === "*") {
        const slash = pattern[index + 2] === "/";
        out += slash ? "(?:.*/)?" : ".*";
        index += slash ? 2 : 1;
        continue;
      }
      out += "[^/]*";
      continue;
    }
    if (char === "?") {
      out += "[^/]";
      continue;
    }
    out += /[.+^${}()|[\]\\]/.test(char) ? `\\${char}` : char;
  }
  return new RegExp(`${out}$`);
}

export function parseChecklist(markdown) {
  const block = BLOCK.exec(markdown);
  if (block === null) throw new Error(`${CHECKLIST_PATH}: no checklist block`);
  const fenced = /```json\n([\s\S]*?)\n```/.exec(block[1]);
  if (fenced === null) throw new Error(`${CHECKLIST_PATH}: no json block`);
  const items = JSON.parse(fenced[1]);
  if (!Array.isArray(items)) throw new Error(`${CHECKLIST_PATH}: the json block is not a list`);
  for (const item of items) {
    if (typeof item.id !== "string" || item.id === "") throw new Error("an item has no id");
    if (!Array.isArray(item.trigger) || item.trigger.length === 0) {
      throw new Error(`${item.id} has no trigger`);
    }
    if (typeof item.check !== "string") throw new Error(`${item.id} has no check`);
  }
  return items;
}

export function selectItems(items, files) {
  const selected = [];
  for (const item of items) {
    const patterns = item.trigger.map(globToRegExp);
    if (patterns.some((pattern) => files.some((file) => pattern.test(file)))) {
      selected.push(item);
    }
  }
  return selected;
}

export function renderReport(items) {
  if (items.length === 0) {
    return "breaking surface: no breaking-surface item is triggered by this diff.";
  }
  const lines = [`## 破坏面清单命中（${items.length} 项）`, ""];
  for (const item of items) {
    const history = item.history === undefined ? "" : `（出处：${item.history}）`;
    lines.push(`- **${item.id}** — ${item.check}${history}`);
  }
  return lines.join("\n");
}

function changedFiles(root, base) {
  const env = process.env.GIT_FILES;
  if (env !== undefined) {
    return env
      .split(/\r?\n|,/)
      .map((file) => file.trim())
      .filter((file) => file !== "");
  }
  if (base === undefined) return [];
  const raw = execFileSync("git", ["diff", "--name-only", base, "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  return raw
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter((file) => file !== "");
}

function main(argv) {
  const root = resolve(process.cwd());
  const at = argv.indexOf("--base");
  const base = at === -1 ? undefined : argv[at + 1];
  const files = changedFiles(root, base);
  if (files.length === 0) {
    process.stdout.write("breaking surface: no changed files given (set GIT_FILES or --base)\n");
    return 0;
  }
  const items = parseChecklist(readFileSync(join(root, CHECKLIST_PATH), "utf8"));
  const selected = selectItems(items, files);
  process.stdout.write(`${renderReport(selected)}\n`);
  return 0;
}

if (process.argv[1] !== undefined) {
  const self = process.argv[1].replaceAll("\\", "/");
  if (self.endsWith("scripts/check-breaking.mjs")) {
    process.exitCode = main(process.argv);
  }
}
