/** A localized `@deepseek-ai/dsh-agent-preset` replacement row. */

import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
import { EntryGroup } from "@deepseek-ai/cordis-plugin-loader";
import type { PresetDefinition } from "@deepseek-ai/dsh-agent-preset-registry";
import type { SettingsForms } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";

import { presetCopyFor } from "./preset-copy.ts";

/** Read the explicit Web UI locale from `locale.preference`. */
export function readWebUiLocale(ctx: Context): string | undefined {
  const host = ctx as unknown as { get(name: string): unknown };
  const settings = host.get("settings") as SettingsForms | undefined;
  try {
    const value = settings?.describe().find((row) => row.ns === "locale")?.value;
    if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
    const preference = (value as { preference?: unknown }).preference;
    return typeof preference === "string" ? preference : undefined;
  } catch {
    return undefined;
  }
}

/** Replace one preset's name and description with its copy for the active locale. */
export function localizePresetConfig(ctx: Context, config: PresetDefinition): PresetDefinition {
  const copy = presetCopyFor(config.id, readWebUiLocale(ctx));
  if (copy === undefined) return config;
  return { ...config, name: copy.name, description: copy.description };
}

/** Drop-in replacement for `@deepseek-ai/dsh-agent-preset`. */
export default class LocalizedAgentPreset {
  static inject = ["agentPresets"];

  /** Preserve child expressions until their own plugins activate. */
  static readonly [EntryGroup.key] = true;

  static Config = z.object({
    id: z.string().required(),
    name: z.string(),
    description: z.string(),
    order: z.number(),
    plugins: z.array(z.any()).required(),
  });

  private readonly ctx: Context;
  private readonly config: PresetDefinition;

  constructor(ctx: Context, config: PresetDefinition) {
    this.ctx = ctx;
    this.config = localizePresetConfig(ctx, config);
  }

  async *[Service.init](): AsyncGenerator<() => Promise<void>, void, unknown> {
    yield await this.ctx.agentPresets.register(this.config);
  }
}
