import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { join } from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  collectImportedSymbols,
  compareSurfaces,
  extractExports,
  extractSurfaceExports,
  resolveTypesEntry,
  surfaceOf,
} from "../scripts/dsh-api-surface.mjs";

const scratch: string[] = [];

function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "dsh-surface-"));
  scratch.push(root);
  for (const [rel, body] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

afterEach(() => {
  for (const root of scratch.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("dsh api surface", () => {
  it("collects the named symbols we import from a package", () => {
    const root = fixture({
      "src/a.ts": 'import { alpha, beta as greek } from "@deepseek-ai/dsh-thing";\n',
      "src/b.ts": 'import type { Gamma } from "@deepseek-ai/dsh-thing";\n',
      "src/c.ts": 'import { local } from "./local.ts";\n',
    });
    const imported = collectImportedSymbols(root);
    expect([...(imported.get("@deepseek-ai/dsh-thing") ?? [])].sort()).toEqual([
      "Gamma",
      "alpha",
      "beta",
    ]);
    expect(imported.has("./local.ts")).toBe(false);
  });

  it("resolves the types entry a package declares", () => {
    const root = fixture({
      "node_modules/@deepseek-ai/dsh-thing/package.json": JSON.stringify({
        name: "@deepseek-ai/dsh-thing",
        types: "./lib/types/index.d.ts",
      }),
      "node_modules/@deepseek-ai/dsh-thing/lib/types/index.d.ts": "export interface Alpha {}\n",
    });
    expect(resolveTypesEntry(root, "@deepseek-ai/dsh-thing")).toBe(
      join(root, "node_modules/@deepseek-ai/dsh-thing/lib/types/index.d.ts"),
    );
    expect(resolveTypesEntry(root, "@deepseek-ai/dsh-absent")).toBe(undefined);
  });

  it("extracts declared and re-exported names", () => {
    const exports = extractExports(
      [
        "export declare interface Alpha {}",
        "export declare class Beta {}",
        "export type Gamma = string;",
        "export declare const delta: number;",
        "export { epsilon, zeta as eta };",
        "export type { theta };",
        "declare const ignored: number;",
        "export default function tail() {}",
      ].join("\n"),
    );
    expect([...exports].sort()).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
      "delta",
      "epsilon",
      "eta",
      "theta",
    ]);
  });

  it("records the exports of the packages we import", () => {
    const root = fixture({
      "src/a.ts": 'import { Alpha, Missing } from "@deepseek-ai/dsh-thing";\n',
      "node_modules/@deepseek-ai/dsh-thing/package.json": JSON.stringify({
        name: "@deepseek-ai/dsh-thing",
        version: "0.2.2-rc.5",
        types: "./lib/types/index.d.ts",
      }),
      "node_modules/@deepseek-ai/dsh-thing/lib/types/index.d.ts": [
        "export declare interface Alpha {}",
        "export declare interface Beta {}",
      ].join("\n"),
    });
    const surface = surfaceOf(root);
    expect(surface.packages["@deepseek-ai/dsh-thing"].version).toBe("0.2.2-rc.5");
    expect(surface.packages["@deepseek-ai/dsh-thing"].imported).toEqual(["Alpha", "Missing"]);
    expect(surface.packages["@deepseek-ai/dsh-thing"].exports).toEqual(["Alpha", "Beta"]);
  });

  it("follows star re-exports, in either quote style and extension", () => {
    const root = fixture({
      "node_modules/@deepseek-ai/dsh-agent/package.json": JSON.stringify({
        name: "@deepseek-ai/dsh-agent",
        version: "0.2.2-rc.5",
        types: "./lib/types/index.d.ts",
      }),
      "node_modules/@deepseek-ai/dsh-agent/lib/types/index.d.ts": [
        "export * from './runtime-types.ts';",
        'export * from "./types.js";',
        "export * from './nested';",
      ].join("\n"),
      "node_modules/@deepseek-ai/dsh-agent/lib/types/runtime-types.d.ts":
        "export type PreStepDecision = {};\n",
      "node_modules/@deepseek-ai/dsh-agent/lib/types/types.d.ts":
        "export declare interface ContextFormed {}\n",
      "node_modules/@deepseek-ai/dsh-agent/lib/types/nested/index.d.ts":
        "export declare const createUserMessage: 1;\n",
    });
    const exports = extractSurfaceExports(
      join(root, "node_modules/@deepseek-ai/dsh-agent/lib/types/index.d.ts"),
    );
    expect(exports).toEqual(["ContextFormed", "PreStepDecision", "createUserMessage"]);
  });

  it("keeps recording a surface when the re-export graph loops", () => {
    const root = fixture({
      "node_modules/@deepseek-ai/dsh-agent/package.json": JSON.stringify({
        name: "@deepseek-ai/dsh-agent",
        version: "0.2.2-rc.5",
        types: "./lib/types/index.d.ts",
      }),
      "node_modules/@deepseek-ai/dsh-agent/lib/types/index.d.ts": [
        "export * from './loop.ts';",
        "export declare interface Visible {}",
      ].join("\n"),
      "node_modules/@deepseek-ai/dsh-agent/lib/types/loop.d.ts": "export * from './index.ts';\n",
    });
    expect(
      extractSurfaceExports(join(root, "node_modules/@deepseek-ai/dsh-agent/lib/types/index.d.ts")),
    ).toEqual(["Visible"]);
  });

  it("does not report drift for a symbol reached through a star re-export", () => {
    const root = fixture({
      "src/a.ts": 'import type { PreStepDecision } from "@deepseek-ai/dsh-agent";\n',
      "node_modules/@deepseek-ai/dsh-agent/package.json": JSON.stringify({
        name: "@deepseek-ai/dsh-agent",
        version: "0.2.2-rc.5",
        types: "./lib/types/index.d.ts",
      }),
      "node_modules/@deepseek-ai/dsh-agent/lib/types/index.d.ts":
        "export * from './runtime-types.ts';\n",
      "node_modules/@deepseek-ai/dsh-agent/lib/types/runtime-types.d.ts":
        "export type PreStepDecision = {};\n",
    });
    const surface = surfaceOf(root);
    expect(surface.packages["@deepseek-ai/dsh-agent"].exports).toEqual(["PreStepDecision"]);
    const before = {
      packages: {
        "@deepseek-ai/dsh-agent": {
          version: "0.2.2-rc.5",
          imported: [],
          exports: ["PreStepDecision"],
        },
      },
    };
    expect(compareSurfaces(before, surface).ok).toBe(true);
  });

  it("still reports an import the package never declares", () => {
    const root = fixture({
      "src/a.ts": 'import { Missing } from "@deepseek-ai/dsh-agent";\n',
      "node_modules/@deepseek-ai/dsh-agent/package.json": JSON.stringify({
        name: "@deepseek-ai/dsh-agent",
        version: "0.2.2-rc.5",
        types: "./lib/types/index.d.ts",
      }),
      "node_modules/@deepseek-ai/dsh-agent/lib/types/index.d.ts":
        "export * from './runtime-types.ts';\n",
      "node_modules/@deepseek-ai/dsh-agent/lib/types/runtime-types.d.ts":
        "export type PreStepDecision = {};\n",
    });
    const verdict = compareSurfaces({ packages: {} }, surfaceOf(root));
    expect(verdict.ok).toBe(true);
    const before = {
      packages: {
        "@deepseek-ai/dsh-agent": { version: "0.2.2-rc.5", imported: [], exports: [] },
      },
    };
    const drift = compareSurfaces(before, surfaceOf(root));
    expect(drift.ok).toBe(false);
    expect(drift.reason).toContain("Missing");
  });

  it("reports a symbol that stopped being exported", () => {
    const before = {
      packages: {
        "@deepseek-ai/dsh-thing": {
          version: "0.2.2-rc.5",
          imported: [],
          exports: ["Alpha", "Beta"],
        },
      },
    };
    const after = {
      packages: {
        "@deepseek-ai/dsh-thing": { version: "0.2.3-alpha.2", imported: [], exports: ["Alpha"] },
      },
    };
    const verdict = compareSurfaces(before, after);
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain("@deepseek-ai/dsh-thing");
    expect(verdict.reason).toContain("Beta");
  });

  it("accepts a surface that gained exports", () => {
    const before = {
      packages: {
        "@deepseek-ai/dsh-thing": { version: "0.2.2-rc.5", imported: [], exports: ["Alpha"] },
      },
    };
    const after = {
      packages: {
        "@deepseek-ai/dsh-thing": {
          version: "0.2.2-rc.6",
          imported: [],
          exports: ["Alpha", "Beta"],
        },
      },
    };
    expect(compareSurfaces(before, after).ok).toBe(true);
  });
});
