/** Shared copy for pstack client surfaces. */

const en = {
  close: "Close",
  refresh: "Refresh",
  retry: "Retry",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
} as const;

const zh = {
  close: "关闭",
  refresh: "刷新",
  retry: "重试",
  save: "保存",
  saving: "保存中…",
  saved: "已保存",
} as const satisfies Record<keyof typeof en, string>;

export type CommonKey = keyof typeof en;

export const common = { en, zh } as const;
