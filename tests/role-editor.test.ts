import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { parseRoleConfiguration } from "../src/role-config.ts";
import {
  removeRoleText,
  saveBudgetConfiguration,
  saveRoleConfiguration,
  snapshotFromConfiguration,
  updateRoleText,
  validateSaveRequest,
} from "../src/role-editor.ts";
import type { LlmRuntime } from "@deepseek-ai/dsh-llm";

import { parseSaveRoleRequest } from "../src/role-wire.ts";
import type { CatalogueResult } from "../src/models.ts";

const directories: string[] = [];

function tempHome(text: string): string {
  const directory = mkdtempSync(join(tmpdir(), "pstack-editor-"));
  directories.push(directory);
  writeFileSync(join(directory, "pstack-models.mdc"), text);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

const catalogue: CatalogueResult = {
  truncated: false,
  providers: [
    {
      provider: "cpa",
      name: "CPA",
      models: [{ route: "cpa/model-a", id: "model-a", name: "Model A", efforts: ["low", "high"] }],
    },
  ],
};

function llmFixture(overrides: Partial<Record<keyof LlmRuntime, unknown>> = {}): LlmRuntime {
  return {
    listProviders: () =>
      catalogue.providers.map((entry) => ({ id: entry.provider, name: entry.name })),
    listModels: async () => [{ provider: "cpa", id: "model-a", name: "Model A" }],
    resolveModelInfo: async (provider: string, model: string) => ({
      provider,
      id: model,
      name: model,
      reasoning: { efforts: [{ id: "low" }, { id: "high" }], defaultEffort: "high" },
    }),
    ...overrides,
  } as unknown as LlmRuntime;
}

const llm = llmFixture();

describe("role editor", () => {
  it("reports every manifest role in a missing snapshot", () => {
    const path = join(tempHome(""), "missing.mdc");
    const snapshot = snapshotFromConfiguration({ status: "missing", path });
    expect(snapshot.status).toBe("missing");
    expect(snapshot.roles.length).toBe(17);
    expect(snapshot.canSave).toBe(true);
  });

  it("replaces one role line and preserves comments", () => {
    const text = "# keep me\n# budget: large (xhigh)\nbug-fix: cpa/model-a [low]\n";
    expect(updateRoleText(text, "bug-fix", "cpa/model-a [high]")).toBe(
      "# keep me\n# budget: large (xhigh)\nbug-fix: cpa/model-a [high]\n",
    );
  });

  it("validates provider, model, and effort against the catalogue", () => {
    expect(
      validateSaveRequest(
        {
          key: "bug-fix",
          routes: [{ kind: "route", provider: "cpa", model: "model-a", effort: "high" }],
        },
        catalogue,
      ).ok,
    ).toBe(true);
    expect(
      validateSaveRequest(
        {
          key: "bug-fix",
          routes: [{ kind: "route", provider: "cpa", model: "model-a", effort: "max" }],
        },
        catalogue,
      ),
    ).toMatchObject({ ok: false });
  });

  it("accepts deletion and rejects malformed routes at the wire boundary", () => {
    expect(validateSaveRequest({ key: "bug-fix", routes: [] }, catalogue)).toEqual({
      ok: true,
      key: "bug-fix",
      routes: [],
    });
    expect(() =>
      parseSaveRoleRequest({ key: "bug-fix", routes: [{ kind: "route", provider: "cpa" }] }),
    ).toThrow();
  });

  it("removes every matching role line by its normalized key", () => {
    const text = "Feature,refactoring: cpa/a\nbug-fix: cpa/b\nfeature, refactoring: cpa/c\n";
    expect(removeRoleText(text, "feature, refactoring")).toBe("bug-fix: cpa/b\n");
    expect(removeRoleText("bug-fix: cpa/b", "bug-fix")).toBe("");
  });

  it("removes duplicate role lines and writes one effective line", () => {
    const text = "bug-fix: cpa/a [low]\nbug-fix: cpa/b [low]\n";
    expect(updateRoleText(text, "bug-fix", "cpa/b [high]")).toBe("bug-fix: cpa/b [high]\n");
  });

  it("keeps a list role on one line when routes change", () => {
    const text = "arena runners: cpa/a [high], cpa/b [low]\n";
    expect(updateRoleText(text, "arena runners", "cpa/c [high], cpa/d [low]")).toBe(
      "arena runners: cpa/c [high], cpa/d [low]\n",
    );
  });

  it("saves one role and leaves the rest of the file intact", async () => {
    const home = tempHome("# header\nbug-fix: cpa/model-a [low]\n");
    const path = join(home, "pstack-models.mdc");
    const result = await saveRoleConfiguration(
      path,
      {
        key: "feature, refactoring",
        routes: [{ kind: "route", provider: "cpa", model: "model-a", effort: "high" }],
      },
      llm as unknown as LlmRuntime,
      new AbortController().signal,
    );
    expect(result.ok).toBe(true);
    const text = readFileSync(path, "utf8");
    expect(text).toContain("# header");
    expect(text).toContain("bug-fix: cpa/model-a [low]");
    expect(text).toContain("feature, refactoring: cpa/model-a [high]");
    expect(parseRoleConfiguration(text, path).status).toBe("loaded");
  });

  it("re-reads the role file after an asynchronous catalogue lookup", async () => {
    const home = tempHome("# header\nbug-fix: cpa/model-a [low]\n");
    const path = join(home, "pstack-models.mdc");
    const concurrentLlm = llmFixture({
      listModels: async () => {
        writeFileSync(path, `${readFileSync(path, "utf8")}perf-issue: cpa/model-a [high]\n`);
        return [{ provider: "cpa", id: "model-a", name: "Model A" }];
      },
    });
    const result = await saveRoleConfiguration(
      path,
      {
        key: "feature, refactoring",
        routes: [{ kind: "route", provider: "cpa", model: "model-a", effort: "high" }],
      },
      concurrentLlm,
      new AbortController().signal,
    );
    expect(result.ok).toBe(true);
    expect(readFileSync(path, "utf8")).toContain("perf-issue: cpa/model-a [high]");
  });

  it("clears a role without model discovery and makes repeat clears a no-op", async () => {
    const home = tempHome("# header\nbug-fix: cpa/model-a [low]\n");
    const path = join(home, "pstack-models.mdc");
    const unavailable = {
      listProviders() {
        throw new Error("catalogue unavailable");
      },
    } as unknown as LlmRuntime;
    const first = await saveRoleConfiguration(
      path,
      { key: "bug-fix", routes: [] },
      unavailable,
      new AbortController().signal,
    );
    if (!first.ok) throw new Error(first.reason);
    expect(readFileSync(path, "utf8")).toBe("# header\n");
    expect(first.snapshot.roles.find((role) => role.key === "bug-fix")?.configured).toBe(false);

    const second = await saveRoleConfiguration(
      path,
      { key: "bug-fix", routes: [] },
      unavailable,
      new AbortController().signal,
    );
    expect(second.ok).toBe(true);
    expect(readFileSync(path, "utf8")).toBe("# header\n");
  });

  it("saves an inherit-only route without model discovery", async () => {
    const home = tempHome("# header\nbug-fix: cpa/model-a [low]\n");
    const path = join(home, "pstack-models.mdc");
    const unavailable = {
      listProviders() {
        throw new Error("catalogue unavailable");
      },
    } as unknown as LlmRuntime;
    const result = await saveRoleConfiguration(
      path,
      { key: "bug-fix", routes: [{ kind: "inherit", alias: "auto" }] },
      unavailable,
      new AbortController().signal,
    );
    if (!result.ok) throw new Error(result.reason);
    expect(readFileSync(path, "utf8")).toContain("bug-fix: auto\n");
  });

  it("does not create a file when an absent role is cleared", async () => {
    const path = join(tempHome(""), "missing.mdc");
    const result = await saveRoleConfiguration(
      path,
      { key: "bug-fix", routes: [] },
      llm as unknown as LlmRuntime,
      new AbortController().signal,
    );
    if (!result.ok) throw new Error(result.reason);
    expect(result.snapshot.status).toBe("missing");
    expect(existsSync(path)).toBe(false);
  });

  it("rejects an aborted clear without changing the file", async () => {
    const home = tempHome("bug-fix: cpa/model-a [low]\n");
    const path = join(home, "pstack-models.mdc");
    const controller = new AbortController();
    controller.abort();
    await expect(
      saveRoleConfiguration(
        path,
        { key: "bug-fix", routes: [] },
        llm as unknown as LlmRuntime,
        controller.signal,
      ),
    ).rejects.toThrow();
    expect(readFileSync(path, "utf8")).toBe("bug-fix: cpa/model-a [low]\n");
  });

  it("returns a refused save for provider and model discovery failures", async () => {
    const home = tempHome("# header\n");
    const path = join(home, "pstack-models.mdc");
    const failures = [
      {
        listProviders() {
          throw new Error("provider failed");
        },
      },
      llmFixture({ listModels: async () => Promise.reject(new Error("models failed")) }),
      llmFixture({
        resolveModelInfo: async () => Promise.reject(new Error("info failed")),
      }),
    ] as unknown as LlmRuntime[];
    for (const failing of failures) {
      const result = await saveRoleConfiguration(
        path,
        {
          key: "bug-fix",
          routes: [{ kind: "route", provider: "cpa", model: "model-a", effort: "high" }],
        },
        failing,
        new AbortController().signal,
      );
      expect(result).toMatchObject({ ok: false, reason: expect.any(String) });
      expect(readFileSync(path, "utf8")).toBe("# header\n");
    }
  });

  it("rejects malformed input before reading the model catalogue", async () => {
    const home = tempHome("");
    const result = await saveRoleConfiguration(
      join(home, "pstack-models.mdc"),
      { key: 42, routes: [] } as never,
      {
        listProviders() {
          throw new Error("must not be called");
        },
      } as unknown as LlmRuntime,
      new AbortController().signal,
    );
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining("request.key") });
  });

  it("applies a budget to concrete routes and rewrites the budget line", async () => {
    const home = tempHome("# budget: large (xhigh)\nbug-fix: cpa/model-a [low]\n");
    const path = join(home, "pstack-models.mdc");
    const result = await saveBudgetConfiguration(
      path,
      { tier: "large", scope: "concrete" },
      llm as unknown as LlmRuntime,
      new AbortController().signal,
    );
    if (!result.ok) throw new Error(result.reason);
    expect(readFileSync(path, "utf8")).toBe(
      "# budget: large (xhigh)\nbug-fix: cpa/model-a [high]\n",
    );
  });

  it("leaves the file byte-identical when the budget is a no-op", async () => {
    const original = "# budget: large (xhigh)\nbug-fix: cpa/model-a [high]\n";
    const home = tempHome(original);
    const path = join(home, "pstack-models.mdc");
    const result = await saveBudgetConfiguration(
      path,
      { tier: "large", scope: "concrete" },
      llm as unknown as LlmRuntime,
      new AbortController().signal,
    );
    expect(result.ok).toBe(true);
    expect(readFileSync(path, "utf8")).toBe(original);
  });

  it("applies a budget to the effective duplicate role line", async () => {
    const home = tempHome("bug-fix: cpa/model-a [low]\nbug-fix: cpa/model-a [low]\n");
    const path = join(home, "pstack-models.mdc");
    const result = await saveBudgetConfiguration(
      path,
      { tier: "large", scope: "concrete" },
      llm as unknown as LlmRuntime,
      new AbortController().signal,
    );
    if (!result.ok) throw new Error(result.reason);
    expect(readFileSync(path, "utf8")).toBe(
      "# budget: large (xhigh)\nbug-fix: cpa/model-a [high]\n",
    );
  });

  it("refuses a budget when a configured route model is missing", async () => {
    const home = tempHome("bug-fix: ghost/model [low]\n");
    const path = join(home, "pstack-models.mdc");
    const result = await saveBudgetConfiguration(
      path,
      { tier: "large", scope: "concrete" },
      llm as unknown as LlmRuntime,
      new AbortController().signal,
    );
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining("bug-fix") });
    expect(readFileSync(path, "utf8")).toBe("bug-fix: ghost/model [low]\n");
  });

  it("re-reads the role file after an asynchronous catalogue lookup for a budget", async () => {
    const home = tempHome("# header\nbug-fix: cpa/model-a [low]\n");
    const path = join(home, "pstack-models.mdc");
    const concurrentLlm = llmFixture({
      listModels: async () => {
        writeFileSync(path, `${readFileSync(path, "utf8")}perf-issue: cpa/model-a [high]\n`);
        return [{ provider: "cpa", id: "model-a", name: "Model A" }];
      },
    });
    const result = await saveBudgetConfiguration(
      path,
      { tier: "large", scope: "concrete" },
      concurrentLlm,
      new AbortController().signal,
    );
    if (!result.ok) throw new Error(result.reason);
    const text = readFileSync(path, "utf8");
    expect(text).toContain("perf-issue: cpa/model-a [high]");
    expect(text).toContain("bug-fix: cpa/model-a [high]");
  });

  it("fills an unconfigured role with the selected default model", async () => {
    const home = tempHome("# header\n");
    const path = join(home, "pstack-models.mdc");
    const result = await saveBudgetConfiguration(
      path,
      {
        tier: "large",
        scope: "unconfigured",
        defaultModel: { provider: "cpa", model: "model-a" },
      },
      llm as unknown as LlmRuntime,
      new AbortController().signal,
    );
    if (!result.ok) throw new Error(result.reason);
    const text = readFileSync(path, "utf8");
    expect(text).toContain("# budget: large (xhigh)");
    expect(text).toContain("feature, refactoring: cpa/model-a [high]");
  });

  it("does not rewrite configured concrete routes in the unconfigured scope", async () => {
    const original = "# header\nbug-fix: cpa/model-a [low]\n";
    const home = tempHome(original);
    const path = join(home, "pstack-models.mdc");
    const result = await saveBudgetConfiguration(
      path,
      {
        tier: "large",
        scope: "unconfigured",
        defaultModel: { provider: "cpa", model: "model-a" },
      },
      llm as unknown as LlmRuntime,
      new AbortController().signal,
    );
    if (!result.ok) throw new Error(result.reason);
    expect(readFileSync(path, "utf8")).toContain("bug-fix: cpa/model-a [low]");
  });

  it("leaves a role line with parse issues untouched during a budget apply", async () => {
    const original = "bug-fix: cpa/model-a [low], bad token\n";
    const home = tempHome(original);
    const path = join(home, "pstack-models.mdc");
    const result = await saveBudgetConfiguration(
      path,
      { tier: "large", scope: "concrete" },
      llm as unknown as LlmRuntime,
      new AbortController().signal,
    );
    expect(result.ok).toBe(true);
    expect(readFileSync(path, "utf8")).toContain("bad token");
  });

  it("preserves CRLF line endings when editing a role line", () => {
    const text = "# header\r\nbug-fix: cpa/model-a [low]\r\n";
    expect(updateRoleText(text, "bug-fix", "cpa/model-a [high]")).toBe(
      "# header\r\nbug-fix: cpa/model-a [high]\r\n",
    );
  });
});
