import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";

const ROOT = resolve(import.meta.dirname, "..");
const cordis = readFileSync(resolve(ROOT, "cordis.patch.yml"), "utf8");
const manifest = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
  exports: Record<string, string>;
};

describe("bundle configuration", () => {
  it("keeps the expected bundle rows and presets", () => {
    for (const id of [
      "pstack",
      "pstack-models",
      "pstack-roles",
      "pstack-role-catalog",
      "pstack-doctor",
      "pstack-script-policy",
      "pstack-subagent",
      "pstack-script",
    ]) {
      expect(cordis).toContain(`- id: ${id}`);
    }
    for (const id of ["preset-pstack", "preset-poteto-agent", "preset-comment-sicko"]) {
      expect(cordis).toContain(`- id: ${id}`);
    }
    expect(cordis).toMatch(/maxDepth:\s*3/);
  });

  it("keeps every bundle subpath exported by the package", () => {
    const rows = [...cordis.matchAll(/name:\s*dsh-pstack(\/[a-z-]+)?/g)].map((match) =>
      match[1] === undefined ? "." : `.${match[1]}`,
    );
    expect(rows).toContain(".");
    for (const key of rows) expect(manifest.exports[key], key).toBeDefined();
  });

  it("exports the doctor and native preset surfaces", () => {
    expect(manifest.exports["./doctor"]).toBe("./dist/doctor.mjs");
    expect(cordis).toContain("name: dsh-pstack/doctor");
    expect(cordis).toContain("id: pstack");
  });
});
