/** Shared copy for pstack client surfaces. */

const en = {
  close: "Close",
  refresh: "Refresh",
  retry: "Retry",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  experimentalTitle: "Experimental preset",
  experimentalBody:
    "Poteto auto is experimental. It picks a pstack playbook for each request and can pick the wrong one: check the playbook and skills it names before following them, and switch back to Poteto mode if the route looks off.",
  experimentalAck: "Got it",
} as const;

const zh = {
  close: "关闭",
  refresh: "刷新",
  retry: "重试",
  save: "保存",
  saving: "保存中…",
  saved: "已保存",
  experimentalTitle: "实验性预设",
  experimentalBody:
    "Poteto 自动模式仍在实验阶段。它会为每条请求挑一个 pstack playbook，可能挑错：跟进前先核对它引用的 playbook 与技能，路由不对就换回 Poteto 模式。",
  experimentalAck: "知道了",
} as const satisfies Record<keyof typeof en, string>;

export type CommonKey = keyof typeof en;

export const common = { en, zh } as const;
