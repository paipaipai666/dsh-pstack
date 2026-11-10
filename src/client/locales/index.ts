/** Locale namespaces and catalogs for pstack client surfaces. */

import { common, type CommonKey } from "./common.ts";
import { config, type ConfigKey } from "./config.ts";
import { plugins, type PluginsKey } from "./plugins.ts";
import { roles, type RolesKey } from "./roles.ts";

export { NS } from "./namespaces.ts";
export type { CommonKey } from "./common.ts";
export type { ConfigKey } from "./config.ts";
export type { PluginsKey } from "./plugins.ts";
export type { RolesKey } from "./roles.ts";

export type Translate<K extends string> = (
  key: K,
  vars?: Record<string, string | number>,
) => string;

export interface PstackTranslations {
  readonly common: Translate<CommonKey>;
  readonly config: Translate<ConfigKey>;
  readonly plugins: Translate<PluginsKey>;
  readonly roles: Translate<RolesKey>;
}

declare module "@deepseek-ai/dsh-client-ui-slots" {
  interface LocaleNamespaceMap {
    "pstack.common": CommonKey;
    "pstack.config": ConfigKey;
    "pstack.plugins": PluginsKey;
    "pstack.roles": RolesKey;
  }
}

export const catalogs = { common, config, plugins, roles } as const;
