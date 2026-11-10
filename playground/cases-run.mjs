#!/usr/bin/env node
// 用 Vite 的模块运行器加载 run-cases.mjs，让其中的 `import.meta.glob` 生效。
// 直接用 `vpx run-cases.mjs` 跑不会展开 glob，所以统一从这里进入。
import { runnerImport } from "vite-plus";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

try {
  await runnerImport(resolve(here, "run-cases.mjs"));
} catch (error) {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
}
