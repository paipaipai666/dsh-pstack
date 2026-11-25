#!/usr/bin/env node
// Headless screenshot / visual check for the playground (127.0.0.1:17353).
//
// The agent sandbox does not allow Chrome's normal user-data dirs or its setuid
// sandbox, and agent-browser's daemon dies with the sandbox process tree. This
// helper centralises the workaround used when validating the playground UI:
//   - writable HOME / XDG dirs under the short system temporary runtime path
//   - Chrome launched with --no-sandbox
//   - one process tree for open → wait → eval → console → screenshot → close
//
// Usage:
//   vpx playground/browser.mjs <tokenized-url> [options]
//
// Options:
//   --out <path>      screenshot path (default: .tmp/playground-<timestamp>.png)
//   --wait <ms>       settle time after load (default: 6000)
//   --eval <js>       extra JS expression to print after load
//   --click <text>    click the first element with this text (repeatable)
//   --no-shot         skip the screenshot
//   --keep-open       leave the browser session open (not for CI)
//
// The URL must be the tokenized URL printed by `dsh web`:
//   http://127.0.0.1:17353/?token=...
// A bare http://127.0.0.1:17353/ returns 401 "dsh web authentication required".
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(HERE);
// Keep the runtime path short: agent-browser uses it for a Unix socket and
// rejects paths over 103 bytes (the repo checkout path alone can exceed that).
const RUNTIME_DIR = join(tmpdir(), `pstack-browser-${String(process.getuid?.() ?? "u")}`);

/**
 * How to start the agent-browser CLI.
 *
 * Windows shims are `.cmd` files, which `spawnSync` refuses to launch without a
 * shell (EINVAL), so there the CLI runs as a JS entry through the current node.
 */
function browserInvocation() {
  if (process.platform !== "win32") {
    return {
      file: join(REPO_ROOT, "node_modules", ".bin", "agent-browser"),
      prefix: [],
    };
  }
  const requireFromRepo = createRequire(join(REPO_ROOT, "package.json"));
  const packageDir = dirname(requireFromRepo.resolve("agent-browser/package.json"));
  return { file: process.execPath, prefix: [join(packageDir, "bin", "agent-browser.js")] };
}

function die(message) {
  console.error(`[browser] ERROR: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    url: undefined,
    out: undefined,
    wait: 6000,
    eval: undefined,
    clicks: [],
    shot: true,
    keepOpen: false,
  };
  const rest = [...argv];
  while (rest.length > 0) {
    const arg = rest.shift();
    if (arg === "--out") options.out = rest.shift();
    else if (arg === "--wait") options.wait = Number(rest.shift());
    else if (arg === "--eval") options.eval = rest.shift();
    else if (arg === "--click") options.clicks.push(rest.shift());
    else if (arg === "--no-shot") options.shot = false;
    else if (arg === "--keep-open") options.keepOpen = true;
    else if (arg === "-h" || arg === "--help") {
      console.log(
        readFileSync(fileURLToPath(import.meta.url), "utf8")
          .split("\n")
          .slice(0, 34)
          .join("\n"),
      );
      process.exit(0);
    } else if (arg !== undefined && !arg.startsWith("--") && options.url === undefined)
      options.url = arg;
    else die(`unknown argument: ${String(arg)}`);
  }
  if (options.url === undefined) die("missing tokenized playground URL");
  if (!Number.isFinite(options.wait) || options.wait < 0)
    die("--wait must be a non-negative number");
  return options;
}

function chromeExecutable() {
  if (process.env.AGENT_BROWSER_CHROME_PATH) return process.env.AGENT_BROWSER_CHROME_PATH;
  const root = join(homedir(), ".agent-browser", "browsers");
  const candidates = [];
  if (existsSync(root)) {
    for (const name of readdirSync(root)) {
      const binary = join(root, name, process.platform === "win32" ? "chrome.exe" : "chrome");
      if (existsSync(binary)) candidates.push({ name, binary });
    }
  }
  candidates.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const managed = candidates.at(-1)?.binary;
  if (managed !== undefined) return managed;
  return systemChrome();
}

/** Chrome installed by the OS, for machines that never ran `agent-browser install`. */
function systemChrome() {
  const windowsBases = [
    process.env.PROGRAMFILES,
    process.env["PROGRAMFILES(X86)"],
    process.env.LOCALAPPDATA,
  ];
  const binaries = [
    ...windowsBases
      .filter((base) => base !== undefined)
      .map((base) => join(base, "Google", "Chrome", "Application", "chrome.exe")),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  return binaries.find((binary) => existsSync(binary));
}

function run(args, env) {
  const invocation = browserInvocation();
  const result = spawnSync(invocation.file, [...invocation.prefix, ...args], {
    env,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error)
    die(`failed to run agent-browser: ${result.error.message} (run \`vp install\`)`);
  return result;
}

/**
 * Open one browser session against the playground and return its step runner.
 *
 * Exported so a UI case can drive several stages of the same page (open, inspect,
 * click, re-inspect) instead of collapsing everything into one `--eval` string.
 */
export function createBrowserSession({ url, wait = 6000 }) {
  const invocation = browserInvocation();
  if (!existsSync(invocation.file))
    die(`agent-browser binary not found at ${invocation.file}; run \`vp install\``);

  const executable = chromeExecutable();
  if (executable === undefined) {
    die(
      "no Chrome found. Run `node_modules/.bin/agent-browser install` or set AGENT_BROWSER_CHROME_PATH.",
    );
  }

  mkdirSync(RUNTIME_DIR, { recursive: true });
  const env = {
    ...process.env,
    HOME: join(RUNTIME_DIR, "home"),
    XDG_CONFIG_HOME: join(RUNTIME_DIR, "home", ".config"),
    XDG_RUNTIME_DIR: join(RUNTIME_DIR, "run"),
  };
  mkdirSync(env.HOME, { recursive: true });
  mkdirSync(env.XDG_CONFIG_HOME, { recursive: true });
  mkdirSync(env.XDG_RUNTIME_DIR, { recursive: true });

  const session = `ab-${String(process.pid)}`;
  const base = ["--session", session, "--executable-path", executable, "--args", "--no-sandbox"];
  const runInSession = (args) => run([...base, ...args], env);
  const step = (args) => {
    const result = runInSession(args);
    if (result.status !== 0) {
      process.stderr.write(result.stderr || "");
      die(`agent-browser ${args[0]} failed with exit ${String(result.status)}`);
    }
    return result.stdout.trim();
  };

  step(["open", url]);
  step(["wait", String(wait)]);
  return { step, run: runInSession, close: () => runInSession(["close"]) };
}

/** Console errors agent-browser collected for the open page. */
export function consoleErrors(session) {
  const result = session.run(["console", "--json"]);
  const errors = [];
  try {
    const payload = JSON.parse(result.stdout);
    for (const message of payload?.data?.messages ?? []) {
      if (message.type === "error" || message.args?.some?.((arg) => arg?.subtype === "error")) {
        errors.push(
          message.text ?? message.args?.map((arg) => arg?.value ?? arg?.description).join(" "),
        );
      }
    }
  } catch {
    errors.push(result.stdout.trim());
  }
  return errors;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const session = createBrowserSession({ url: options.url, wait: options.wait });

  let failed = false;
  try {
    for (const text of options.clicks) session.step(["find", "text", text, "click"]);

    console.log("\n--- body text ---");
    console.log(session.step(["eval", "document.body.innerText.slice(0, 4000)"]));

    if (options.eval !== undefined) {
      console.log("\n--- eval ---");
      console.log(session.step(["eval", options.eval]));
    }

    const errors = consoleErrors(session);
    console.log("\n--- console errors ---");
    console.log(errors.length === 0 ? "(none)" : errors.join("\n"));
    if (errors.length > 0) failed = true;

    if (options.shot) {
      const out = resolve(
        REPO_ROOT,
        options.out ??
          join(".tmp", `playground-${new Date().toISOString().replace(/[:.]/g, "-")}.png`),
      );
      mkdirSync(dirname(out), { recursive: true });
      session.step(["screenshot", out]);
      console.log(`\n--- screenshot ---\n${out}`);
    }
  } finally {
    if (!options.keepOpen) session.close();
  }

  if (failed) {
    console.error("\n[browser] page reported console errors");
    process.exit(2);
  }
}

if (
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
)
  main();
