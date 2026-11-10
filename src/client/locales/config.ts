/** Copy for the pstack plugin configuration dialog. */

const en = {
  configureAction: "Configure",
  dialogTitle: "Configure Pstack",
  tabsLabel: "Configuration sections",
  tabPlugins: "Recommended plugins",
  tabRoles: "Role models",
} as const;

const zh = {
  configureAction: "配置",
  dialogTitle: "配置 Pstack",
  tabsLabel: "配置分区",
  tabPlugins: "推荐插件",
  tabRoles: "角色模型",
} as const satisfies Record<keyof typeof en, string>;

export type ConfigKey = keyof typeof en;

export const config = { en, zh } as const;
