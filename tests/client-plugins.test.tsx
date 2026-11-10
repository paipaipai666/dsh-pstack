// @vitest-environment happy-dom
import type { BundleInfo, ChangeResult, ClientRemote } from "@deepseek-ai/dsh-api-remotes/client";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import {
  RecommendedPluginsView,
  type PluginManagerApi,
} from "../src/client/RecommendedPluginsPage.tsx";
import { catalogs, type PstackTranslations } from "../src/client/locales/index.ts";
import { createPluginManagerApi } from "../src/client/index.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FORGE = "@deepseek-ai/dsh-experimental-forge-bundle";
const SESSION_SEARCH = "@deepseek-ai/dsh-experimental-session-search";

function translator(dict: Record<string, string>) {
  return (key: string, vars?: Record<string, string | number>): string => {
    let text = dict[key] ?? key;
    if (vars !== undefined) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };
}

function translations(): PstackTranslations {
  return {
    common: translator(catalogs.common.en),
    config: translator(catalogs.config.en),
    plugins: translator(catalogs.plugins.en),
    roles: translator(catalogs.roles.en),
  };
}

function bundle(name: string, enabled = false): BundleInfo {
  return {
    name,
    enabled,
    availability: "installation",
    official: false,
    installed: true,
    optional: false,
    removable: true,
    updatable: false,
    rows: [],
    overrides: [],
  };
}

function change(application: ChangeResult["application"]): ChangeResult {
  return { changed: true, application, stage: "enable", target: FORGE };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  document.body.innerHTML = "";
});

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function mount(api: PluginManagerApi): Promise<void> {
  await act(async () => {
    root.render(createElement(RecommendedPluginsView, { api, translations: translations() }));
  });
  await flush();
}

function switches(): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('[role="switch"]'));
}

function enableSwitch(): HTMLButtonElement {
  return switches().find((button) => button.getAttribute("aria-label")?.startsWith("Enable"))!;
}

async function click(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.click();
  });
  await flush();
}

function message(): HTMLElement {
  return container.querySelector<HTMLElement>(".pstack-inline-message")!;
}

function toast(): HTMLElement {
  return document.body.querySelector<HTMLElement>(".pstack-toast")!;
}

function apiFor(result: (name: string) => ChangeResult): PluginManagerApi {
  return {
    listBundles: async () => [bundle(FORGE), bundle(SESSION_SEARCH)],
    setBundleEnabled: async (name) => result(name),
  };
}

const applications: readonly [ChangeResult["application"], string, string][] = [
  ["applied", "success", "Applied change to"],
  ["restart-required", "warn", "takes effect after restart"],
  ["overridden", "warn", "was overridden"],
  ["failed", "error", "Could not change"],
  ["cancelled", "neutral", "was cancelled"],
];

describe("plugin manager API resolution", () => {
  function manager(): ClientRemote["pluginManager"] {
    return {
      listBundles: async () => ({
        ok: true,
        value: [bundle(FORGE)],
      }),
      setBundleEnabled: async () => ({
        ok: true,
        value: {
          changed: true,
          application: "restart-required",
          restartReason: "no-hmr",
          stage: "enable",
          target: FORGE,
        },
      }),
    } as unknown as ClientRemote["pluginManager"];
  }

  it("fails only when called with no manager, then recovers when one arrives", async () => {
    let current: ReturnType<typeof manager> | undefined;
    const api = createPluginManagerApi(() => current);
    await expect(api.listBundles()).rejects.toThrow("plugin manager is not available yet");
    current = manager();
    await expect(api.listBundles()).resolves.toMatchObject([bundle(FORGE)]);
  });

  it("maps the Host change result through the current manager", async () => {
    const api = createPluginManagerApi(() => manager());
    await expect(api.setBundleEnabled(FORGE, true)).resolves.toEqual({
      ...change("restart-required"),
      restartReason: "no-hmr",
    });
  });
});

describe("recommended plugin change outcomes", () => {
  for (const [application, tone, text] of applications) {
    it(`shows a ${application} notice with a ${tone} tone`, async () => {
      await mount(
        apiFor(() => ({
          ...change(application),
          ...(application === "restart-required" ? { restartReason: "no-hmr" } : {}),
          ...(application === "failed" ? { error: { code: "bundle-in-use" } } : {}),
        })),
      );
      await click(enableSwitch());
      const notice = message();
      expect(notice.dataset["tone"]).toBe(tone);
      expect(notice.textContent).toContain(text);
    });
  }

  it("names the restart reason and the failure code", async () => {
    await mount(apiFor(() => ({ ...change("restart-required"), restartReason: "no-hmr" })));
    await click(enableSwitch());
    expect(message().textContent).toContain("(no-hmr)");

    await act(async () => {
      root.unmount();
    });
    root = createRoot(container);

    await mount(apiFor(() => ({ ...change("failed"), error: { code: "bundle-in-use" } })));
    await click(enableSwitch());
    expect(message().textContent).toContain("bundle-in-use");
  });

  it("treats a transport failure as an error, not a resolved outcome", async () => {
    const api: PluginManagerApi = {
      listBundles: async () => [bundle(FORGE), bundle(SESSION_SEARCH)],
      setBundleEnabled: async () => {
        throw new Error("socket closed");
      },
    };
    await mount(api);
    await click(enableSwitch());
    expect(message().dataset["tone"]).toBe("error");
    expect(message().textContent).toContain("socket closed");
  });
});

describe("enable-all bulk summary", () => {
  function enableAllButton(): HTMLButtonElement {
    return Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      button.textContent?.includes("Enable all"),
    )!;
  }

  it("counts every settled change", async () => {
    await mount(apiFor(() => change("applied")));
    await click(enableAllButton());
    expect(toast().dataset["tone"]).toBe("success");
    expect(toast().textContent).toContain("Enabled 2 recommended plugins");
    expect(container.querySelector(".pstack-inline-message")).toBeNull();
  });

  it("counts settled versus unsettled outcomes", async () => {
    await mount(apiFor((name) => (name === FORGE ? change("applied") : change("cancelled"))));
    await click(enableAllButton());
    expect(toast().dataset["tone"]).toBe("error");
    expect(toast().textContent).toContain(
      "Changed 1 recommended plugins, 0 require a restart, 1 not applied",
    );
  });

  it("reports a restart instead of claiming all plugins are enabled", async () => {
    await mount(apiFor(() => ({ ...change("restart-required"), restartReason: "no-hmr" })));
    await click(enableAllButton());
    expect(toast().dataset["tone"]).toBe("warn");
    expect(toast().textContent).toContain("2 recommended plugins require a restart");
    expect(toast().textContent).not.toContain("Enabled 2 recommended plugins");
    expect(container.querySelector(".pstack-inline-message")).toBeNull();
  });

  it("includes restart and unsettled counts in a mixed summary", async () => {
    await mount(
      apiFor((name) =>
        name === FORGE
          ? { ...change("restart-required"), restartReason: "no-hmr" }
          : change("cancelled"),
      ),
    );
    await click(enableAllButton());
    expect(toast().dataset["tone"]).toBe("error");
    expect(toast().textContent).toContain(
      "Changed 0 recommended plugins, 1 require a restart, 1 not applied",
    );
  });
});
