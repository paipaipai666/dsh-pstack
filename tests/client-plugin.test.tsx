import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import type { Context } from "@deepseek-ai/cordis";

import { apply, inject } from "../src/client/index.ts";
import { PACKAGE_NAME } from "../src/package-name.ts";
import { ROLE_COPY } from "../src/client/role-copy.ts";
import { ROLE_MANIFEST } from "../src/role-manifest.ts";
import type { PstackRolesNamespace } from "../src/role-remote.ts";
import type { BundleInfo } from "@deepseek-ai/dsh-api-remotes/client";
import { RecommendedPluginsView } from "../src/client/RecommendedPluginsPage.tsx";
import { catalogs, type PstackTranslations } from "../src/client/locales/index.ts";
import { FALLBACK_LOCALE } from "../src/preset-copy.ts";

type Dictionaries = Record<string, Record<string, string>>;

function translateFrom(
  dictionaries: Dictionaries,
  language = FALLBACK_LOCALE,
): (key: string) => string {
  return (key) => dictionaries[language]?.[key] ?? dictionaries[FALLBACK_LOCALE]?.[key] ?? key;
}

function translationsFrom(language = FALLBACK_LOCALE): PstackTranslations {
  return {
    common: translateFrom(catalogs.common as Dictionaries, language),
    config: translateFrom(catalogs.config as Dictionaries, language),
    plugins: translateFrom(catalogs.plugins as Dictionaries, language),
    roles: translateFrom(catalogs.roles as Dictionaries, language),
  };
}

function roleApi() {
  const snapshot = {
    path: "/tmp/pstack-models.mdc",
    status: "missing" as const,
    roles: [],
    issues: [],
    canSave: true,
  };
  return {
    status: async () => ({ ok: true as const, value: snapshot }),
    catalogue: async () => ({ ok: true as const, value: { providers: [], truncated: false } }),
    save: async () => ({ ok: true as const, value: { ok: false as const, reason: "not used" } }),
  };
}

describe("pstack client", () => {
  it("mounts the role Remote and registers the plugin-detail action", async () => {
    const mounts: unknown[] = [];
    const slots: {
      name: string;
      id?: string;
      component: unknown;
    }[] = [];
    const dictionaries = new Map<string, Dictionaries>();
    const pstackRoles = roleApi() as unknown as PstackRolesNamespace["pstackRoles"];
    const pluginManager = {
      listBundles: async () => ({ ok: true as const, value: [] as BundleInfo[] }),
      setBundleEnabled: async (name: string) => ({
        ok: true as const,
        value: {
          changed: true,
          application: "applied" as const,
          stage: "enable" as const,
          target: name,
        },
      }),
    };
    const slotHost = {
      inject: (_name: string, register: () => void) => register(),
      register: (options: { name: string; id?: string }, component: unknown) => {
        slots.push({ ...options, component });
        return () => {};
      },
    };

    const ctx = {
      remote: {
        $mount: async (contribution: unknown) => {
          mounts.push(contribution);
          return async () => {};
        },
      },
      slots: slotHost,
      locale: {
        register: (namespace: string, value: Dictionaries) => {
          dictionaries.set(namespace, value);
          return () => {};
        },
        bind: (namespace: string) => translateFrom(dictionaries.get(namespace) ?? {}),
      },
      effect: (callback: () => unknown) => callback(),
      inject: (_deps: string[], callback: (scope: unknown) => void) => {
        callback({
          remote: { pstackRoles, pluginManager },
          slots: slotHost,
        });
        return () => {};
      },
    } as unknown as Context;

    await apply(ctx);
    expect(inject).toEqual(["remote", "slots", "locale"]);
    expect([...dictionaries.keys()].sort()).toEqual([
      "pstack.common",
      "pstack.config",
      "pstack.plugins",
      "pstack.roles",
    ]);
    expect(mounts).toHaveLength(1);
    expect(slots.filter((slot) => slot.name === "plugins.detail.actions")).toHaveLength(1);
    const action = slots.find((slot) => slot.name === "plugins.detail.actions");
    expect(action?.id).toBe("pstack");

    const Component = action?.component as (props: unknown) => unknown;
    const html = renderToStaticMarkup(
      createElement(Component as never, {
        subject: { kind: "bundle", pkg: { name: PACKAGE_NAME } },
      }),
    );
    expect(html).toContain("Configure");
    expect(
      renderToStaticMarkup(
        createElement(Component as never, {
          subject: { kind: "bundle", pkg: { name: "other" } },
        }),
      ),
    ).toBe("");
  });

  it("renders recommended plugin copy in one language only", () => {
    const translations = translationsFrom("zh");
    const html = renderToStaticMarkup(
      createElement(RecommendedPluginsView, { api: undefined, translations }),
    );
    expect(html).toContain(catalogs.plugins.zh.recommendedForgeTitle);
    expect(html).toContain(catalogs.plugins.zh.recommendedForgeDescription);
    expect(html).not.toContain(catalogs.plugins.en.recommendedForgeTitle);
    expect(html).not.toContain(catalogs.plugins.en.recommendedForgeDescription);
  });

  it("has a localized name and scenario for every pstack role", () => {
    const dictionaries = catalogs.roles as unknown as Dictionaries;
    for (const role of ROLE_MANIFEST) {
      const copy = ROLE_COPY[role.key];
      expect(copy, role.key).toBeDefined();
      for (const language of ["en", "zh"]) {
        expect(
          dictionaries[language]?.[copy!.nameKey],
          `${role.key} name ${language}`,
        ).toBeTruthy();
        expect(
          dictionaries[language]?.[copy!.descriptionKey],
          `${role.key} description ${language}`,
        ).toBeTruthy();
      }
    }
  });

  it("keeps ROLE_COPY keys in lockstep with the role manifest", () => {
    const manifestKeys = ROLE_MANIFEST.map((role) => role.key).sort();
    expect(Object.keys(ROLE_COPY).sort()).toEqual(manifestKeys);
  });
});
