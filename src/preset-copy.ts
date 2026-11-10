/** Display copy for dsh-pstack presets. */

/** Fallback locale for a missing catalog or preset entry. */
export const FALLBACK_LOCALE = "en";

/** One preset's display name and description. */
export interface PresetCopy {
  readonly name: string;
  readonly description: string;
}

const EN: Record<string, PresetCopy> = {
  "poteto-mode": {
    name: "Poteto mode",
    description:
      "Based on Standard mode, with the same capabilities plus the persistent poteto-mode workflow.",
  },
  "poteto-mode-creator": {
    name: "Poteto Creator mode",
    description:
      "Based on Creator mode, with the same capabilities plus the persistent poteto-mode workflow.",
  },
  "poteto-agent": {
    name: "Implementation agent",
    description: "Implementation delegate that follows poteto-mode discipline for one task.",
  },
  "comment-sicko": {
    name: "Comment review",
    description: "Review comments and report deletion targets and symbols that need refactoring.",
  },
  readonly: {
    name: "Read-only research",
    description: "Read-only research delegate that gathers evidence without editing files.",
  },
};

const ZH: Record<string, PresetCopy> = {
  "poteto-mode": {
    name: "Poteto 模式",
    description: "基于标准模式，能力与标准模式一致，额外常驻 poteto-mode 工作流。",
  },
  "poteto-mode-creator": {
    name: "Poteto 创造模式",
    description: "基于创造模式，能力与创造模式一致，额外常驻 poteto-mode 工作流。",
  },
  "poteto-agent": {
    name: "实现代理",
    description: "实现型子代理，按 poteto-mode 的纪律完成单个任务。",
  },
  "comment-sicko": {
    name: "评论审查",
    description: "审查评论，报告删除目标和需要重构的符号。",
  },
  readonly: {
    name: "只读研究",
    description: "只读研究代理，收集证据但不修改文件。",
  },
};

/** Preset copy keyed by locale, then preset id. */
export const PRESET_COPY: Record<string, Record<string, PresetCopy>> = {
  en: EN,
  zh: ZH,
};

/** Read one preset's copy for a BCP 47 locale. */
export function presetCopyFor(id: string, locale: string | undefined): PresetCopy | undefined {
  const tag = locale?.trim().toLowerCase();
  if (tag !== undefined && tag !== "") {
    const exact = PRESET_COPY[tag]?.[id];
    if (exact !== undefined) return exact;
    const primary = tag.split("-")[0];
    const primaryCopy = primary === undefined ? undefined : PRESET_COPY[primary]?.[id];
    if (primaryCopy !== undefined) return primaryCopy;
  }
  return PRESET_COPY[FALLBACK_LOCALE]?.[id];
}
