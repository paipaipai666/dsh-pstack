import { readFileSync } from "node:fs";
import { defineConfig } from "vite-plus";

/** DSH provides its own runtime packages; never bundle them. */
const dshProvided = /^@deepseek-ai\//;

/**
 * The client loader keys factories by the id in the bundle banner and rows by
 * the package name the composition mounts, so both must be the same string.
 * Read it from the manifest instead of repeating the name here.
 */
const packageName = (
  JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
    readonly name: string;
  }
).name;

export default defineConfig({
  pack: [
    {
      entry: "./src/*.ts",
      dts: {
        generator: "tsgo",
      },
      deps: {
        neverBundle: [dshProvided],
        dts: {
          neverBundle: [dshProvided],
        },
      },
      exports: {
        customExports: {
          "./locale/*.json": "./locale/*.json",
          "./client": "./dist/client.js",
        },
      },
      copy: [
        "pstack",
        { from: "skills/.agents/skills", to: "dist/skills", rename: "vendored" },
        { from: "skills/authored", to: "dist/skills", rename: "authored" },
      ],
    },
    {
      name: "dsh-pstack/client",
      cwd: ".",
      entry: ["./src/client/index.ts"],
      outDir: "dist",
      format: "cjs",
      inputOptions: { platform: "browser" },
      dts: false,
      clean: false,
      sourcemap: false,
      exports: false,
      deps: {
        neverBundle: ["react", "react/jsx-runtime", "react-dom", "react-dom/client", dshProvided],
      },
      outputOptions: {
        entryFileNames: "client.js",
        banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageName)}, factory: (require) => {`,
        footer: "return module.exports; } });",
        intro: "var module = { exports: {} }; var exports = module.exports;",
      },
    },
    {
      name: "dsh-pstack/runtime",
      // From `runtime/skills`, so the globs cannot pick up the previous build in
      // `runtime/dist`; pack drops this common root and emits `<skill>/scripts/...`.
      cwd: "runtime/skills",
      entry: [
        "./**/*.ts",
        "./**/*.mjs",
        // Upstream ships this entry with no extension, so no glob above matches it.
        "./poteto-mode/scripts/watch-pr/watch-pr",
      ],
      outDir: "../dist",
      dts: false,
      unbundle: true,
      exports: false,
      clean: ["../dist"],
    },
  ],
  test: {
    include: ["tests/**/*.test.{ts,tsx,mjs}"],
  },
  run: {
    tasks: {
      build: {
        command:
          "vp pack && vpx scripts/replace-runtime-scripts.mjs && vpx scripts/translate-skill-catalog.mjs",
        dependsOn: ["generate"],
      },
      "test:runtime": {
        command: "node --test 'runtime/dist/**/*.test.mjs'",
        dependsOn: ["build"],
        cache: false,
      },
      typecheck: {
        command: "tsc --noEmit -p tsconfig.json",
      },
      generate: {
        command: "vpx port/generate.mjs",
        cache: false,
      },
      "generate:check": {
        command: "vpx port/generate.mjs --check",
        cache: false,
      },
      "compatibility:check": {
        command: "vpx port/release-compatibility.ts --check",
        cache: false,
      },
      playground: {
        command: "vpx playground/start.mjs",
        cache: false,
      },
      "playground:prepare": {
        command: "vpx playground/start.mjs --prepare",
        cache: false,
      },
      "playground:reset": {
        command: "vpx playground/start.mjs --reset",
        cache: false,
      },
      "playground:reinstall": {
        command: "vpx playground/start.mjs --reinstall",
        cache: false,
      },
      "playground:browser": {
        command: "vpx playground/browser.mjs",
        cache: false,
      },
      cases: {
        command: "vpx playground/cases-run.mjs",
        cache: false,
      },
      "cases:list": {
        command: "vpx playground/cases-run.mjs --list",
        cache: false,
      },
      "cases:check": {
        command: "vpx playground/cases-run.mjs --check",
        cache: false,
      },
    },
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    ignorePatterns: ["upstream", "**/*.md", "pstack", "runtime"],
  },
  fmt: {
    ignorePatterns: ["upstream", "**/*.md", "pstack", "runtime"],
  },
  staged: {
    "*": "vp check --fix",
  },
});
