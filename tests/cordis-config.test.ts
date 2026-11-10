import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";

const ROOT = resolve(import.meta.dirname, "..");
const cordis = readFileSync(resolve(ROOT, "cordis.patch.yml"), "utf8").replace(/\r\n/g, "\n");
const manifest = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
  exports: Record<string, string>;
};

/** Every row the bundle inserts, in file order, with its raw block up to the next row. */
const heads = [...cordis.matchAll(/^ {4}- id: ([a-z-]+)$/gm)];
const rows = heads.map((head, index) => ({
  id: head[1] as string,
  block: cordis.slice(head.index, heads[index + 1]?.index ?? cordis.length),
}));

describe("bundle configuration", () => {
  it("keeps the expected plugin rows and presets", () => {
    expect(rows.map((row) => row.id)).toEqual([
      "pstack",
      "pstack-skills",
      "pstack-vendored-skills",
      "pstack-authored-skills",
      "pstack-models",
      "pstack-roles",
      "pstack-role-catalog",
      "pstack-subagent",
      "pstack-doctor",
      "pstack-script-policy",
      "pstack-script",
      "pstack-remote",
      "preset-poteto-mode",
      "preset-poteto-mode-creator",
      "preset-poteto-agent",
      "preset-comment-sicko",
      "preset-readonly",
    ]);
  });

  it("keeps every bundle subpath exported by the package", () => {
    const keys = rows
      .map((row) => /name: "?@paipaipai666\/dsh-pstack(\/[a-z-]+)?"?/.exec(row.block))
      .filter((match) => match !== null)
      .map((match) => (match[1] === undefined ? "." : `.${match[1]}`));
    expect(keys.length).toBeGreaterThan(5);
    expect(keys).toContain(".");
    for (const key of keys) expect(manifest.exports[key], key).toBeDefined();
  });

  it("exposes the fork-only doctor, script, script policy, and remote surfaces", () => {
    expect(manifest.exports["./doctor"]).toBe("./dist/doctor.mjs");
    expect(manifest.exports["./script"]).toBe("./dist/script.mjs");
    expect(manifest.exports["./script-policy"]).toBe("./dist/script-policy.mjs");
    expect(manifest.exports["./remote"]).toBe("./dist/remote.mjs");
    for (const id of ["pstack-doctor", "pstack-script", "pstack-script-policy", "pstack-remote"]) {
      expect(rows.map((row) => row.id)).toContain(id);
    }
  });

  it("gives each shipped skill tree its own filesystem provider", () => {
    const providers = rows
      .slice(0, 5)
      .filter((row) => row.block.includes("@deepseek-ai/dsh-skill-filesystem"));
    expect(providers.map((row) => row.id)).toEqual([
      "pstack-skills",
      "pstack-vendored-skills",
      "pstack-authored-skills",
    ]);
    expect(providers[0]?.block).toContain("dist/pstack/skills");
    expect(providers[1]?.block).toContain("dist/skills/vendored");
    expect(providers[2]?.block).toContain("dist/skills/authored");
    expect(
      new Set(providers.map((row) => /providerName: "?([a-z-]+)"?/.exec(row.block)?.[1])).size,
    ).toBe(3);
  });

  it("runs a full session from the root preset", () => {
    const preset = rows.find((row) => row.id === "preset-poteto-mode")?.block ?? "";
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

  it("boots children through the spawn provider with a bounded depth", () => {
    const subagent = rows.find((row) => row.id === "pstack-subagent")?.block ?? "";
    expect(subagent).toContain("provider: spawn");
    expect(subagent).toMatch(/maxDepth:\s*2\n/);
  });

  it("asks before running a bundled script", () => {
    const policy = rows.find((row) => row.id === "pstack-script-policy")?.block ?? "";
    expect(policy).toContain('name: "@paipaipai666/dsh-pstack/script-policy"');
    expect(policy).toMatch(/config:\s*\n\s+mode: ask\n/);
  });

  it("ships an empty remote registry that asks before dispatching", () => {
    const remote = rows.find((row) => row.id === "pstack-remote")?.block ?? "";
    expect(remote).toContain('name: "@paipaipai666/dsh-pstack/remote"');
    expect(remote).toMatch(/mode: ask\n/);
    expect(remote).toMatch(/targets: \[\]\n/);
  });
});
