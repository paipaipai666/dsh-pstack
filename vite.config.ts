import { defineConfig } from "vite-plus";

/**
 * Every `@deepseek-ai/*` module is provided by the running DSH, so no bundle may carry
 * its own copy. Matched by namespace instead of enumerating packages: a newly added DSH
 * dependency stays external without touching this file. The published manifest declares
 * them under `devDependencies` only, so a profile install resolves them through the host
 * installation while a linked checkout resolves the local development copies.
 */
const dshProvided = /^@deepseek-ai\//;

export default defineConfig({
  pack: [
    {
      entry: ["./src/*.ts"],
      dts: {
        generator: "tsgo",
      },
      deps: {
        neverBundle: [dshProvided],
        dts: {
          neverBundle: [dshProvided],
        },
      },
      copy: [
        "pstack/dist/pstack",
        { from: "skills/authored", to: "dist/skills" },
        { from: "skills/.agents/skills", to: "dist/skills", rename: "vendored" },
      ],
      exports: {
        customExports: {
          "./client": "./dist/client.mjs",
          "./locale/*.json": "./locale/*.json",
        },
      },
    },
    {
      name: "@paipaipai666/dsh-pstack/client",
      cwd: ".",
      entry: ["./src/client/index.ts"],
      outDir: "dist",
      format: "cjs",
      platform: "browser",
      dts: false,
      clean: false,
      sourcemap: true,
      exports: false,
      deps: {
        // Browser modules the host module loader supplies. `dshProvided` covers the whole
        // `@deepseek-ai/*` namespace, including the packages named by `dsh.client.inject`.
        neverBundle: [
          "react",
          "react/jsx-runtime",
          "react-dom",
          "react-dom/client",
          "zod",
          "@tanstack/react-virtual",
          dshProvided,
        ],
      },
      outputOptions: {
        entryFileNames: "client.mjs",
        banner: 'window.__ModuleLoader__.load({ id: "@paipaipai666/dsh-pstack", factory: (require) => {',
        footer: "return module.exports; } });",
        intro: "var module = { exports: {} }; var exports = module.exports;",
      },
    },
  ],
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  run: {
    tasks: {
      test: {
        command: "vp test",
      },
      dev: {
        command: "vp pack --watch",
        dependsOn: ["@internal/pstack#build"],
        cache: false,
      },
      build: {
        command: "vp pack",
        dependsOn: ["@internal/pstack#build"],
      },
      typecheck: {
        command: "tsc --noEmit -p tsconfig.json",
      },
      playground: {
        command: "node playground/start.mjs",
        cache: false,
      },
      "playground:reset": {
        command: "node playground/start.mjs --reset",
        cache: false,
      },
      "playground:reinstall": {
        command: "node playground/start.mjs --reinstall",
        cache: false,
      },
      "playground:browser": {
        command: "node playground/browser.mjs",
        cache: false,
      },
      cases: {
        command: "node playground/cases-run.mjs",
        cache: false,
      },
      "cases:list": {
        command: "node playground/cases-run.mjs --list",
        cache: false,
      },
      "cases:check": {
        command: "node playground/cases-run.mjs --check",
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
    ignorePatterns: ["upstream", "**/*.md", "pstack/pstack", "pstack/runtime"],
  },
  fmt: {
    ignorePatterns: ["upstream", "**/*.md", "pstack/pstack", "pstack/runtime"],
  },
  staged: {
    "*": "vp check --fix",
  },
});
