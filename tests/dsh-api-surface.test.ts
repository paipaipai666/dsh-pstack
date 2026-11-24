import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { join } from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  collectImportedSymbols,
  compareSurfaces,
  extractExports,
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
