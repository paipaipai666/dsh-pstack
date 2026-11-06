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

  it("exports the doctor, script policy, and native preset surfaces", () => {
    expect(manifest.exports["./doctor"]).toBe("./dist/doctor.mjs");
    expect(manifest.exports["./script-policy"]).toBe("./dist/script-policy.mjs");
    expect(cordis).toContain("name: dsh-pstack/doctor");
    expect(cordis).toContain("name: dsh-pstack/script-policy");
    expect(cordis).toContain("id: pstack");
  });

  it("exports every public source entry", () => {
    const entries: Record<string, string> = {
      ".": "./dist/index.mjs",
      "./doctor": "./dist/doctor.mjs",
      "./models": "./dist/models.mjs",
      "./remote": "./dist/remote.mjs",
      "./role-catalog": "./dist/role-catalog.mjs",
      "./roles": "./dist/roles.mjs",
      "./script": "./dist/script.mjs",
      "./script-policy": "./dist/script-policy.mjs",
      "./skill": "./dist/skill.mjs",
      "./subagent": "./dist/subagent.mjs",
    };
    for (const [key, target] of Object.entries(entries)) {
      expect(manifest.exports[key], key).toBe(target);
    }
  });

  it("keeps the pstack preset able to run a full session", () => {
    const start = cordis.indexOf("- id: preset-pstack");
    const end = cordis.indexOf("- id: preset-poteto-agent");
    expect(start, "preset-pstack").toBeGreaterThan(-1);
    expect(end, "preset-poteto-agent").toBeGreaterThan(start);
    const preset = cordis.slice(start, end);
    for (const packageName of [
      "@deepseek-ai/dsh-persona",
      "@deepseek-ai/dsh-agent-instructions",
      "@deepseek-ai/dsh-tool-fs",
      "@deepseek-ai/dsh-tool-fs-search",
      "@deepseek-ai/dsh-tool-jobs",
      "@deepseek-ai/dsh-skill-filesystem",
      "@deepseek-ai/dsh-tool-skill",
      "@deepseek-ai/dsh-tool-todo",
      "@deepseek-ai/dsh-tool-web",
    ]) {
      expect(preset, packageName).toContain(packageName);
    }
  });

  it("configures the script approval policy as ask by default", () => {
    expect(cordis).toContain("- id: pstack-script-policy");
    expect(cordis).toMatch(/- id: pstack-script-policy\n\s+name: dsh-pstack\/script-policy\n\s+config:\n\s+mode: ask/);
  });
});
