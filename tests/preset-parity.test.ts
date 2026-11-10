import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";
import { readPatch } from "./patch-name.ts";

const ROOT = process.cwd();
const BASELINE = join(ROOT, "tests", "fixtures", "dsh-0.2.2-rc.1");
const PATCH = readPatch(join(ROOT, "cordis.patch.yml"));

interface PluginRow {
  id: string;
  name: string;
  indent: number;
  disabled?: string;
}

const PSTACK_ROWS: PluginRow[] = [
  { id: "poteto-mode-section", name: "dsh-pstack/poteto-mode", indent: 10 },
];

function clean(value: string): string {
  return value.trim().replace(/^["'](.*)["']$/, "$1");
}

function presetLines(source: string, presetId: string): string[] {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `    - id: ${presetId}`);
  if (start < 0) throw new Error(`preset "${presetId}" was not found`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith("    - id: "));
  return lines.slice(start, end < 0 ? undefined : end);
}

function pluginRows(source: string, presetId: string): PluginRow[] {
  const lines = presetLines(source, presetId);
  const pluginsAt = lines.findIndex((line) => line === "        plugins:");
  if (pluginsAt < 0) throw new Error(`preset "${presetId}" has no plugins list`);

  const rows: PluginRow[] = [];
  let current: PluginRow | undefined;
  for (const line of lines.slice(pluginsAt + 1)) {
    const match = line.match(/^(\s*)- id:\s*(.+)$/);
    if (match !== null) {
      current = { id: clean(match[2]), name: "", indent: match[1].length };
      rows.push(current);
      continue;
    }
    const name = line.match(/^\s*name:\s*(.+)$/)?.[1];
    if (name !== undefined && current !== undefined && current.name === "") {
      current.name = clean(name);
    }
    const disabled = line.match(/^\s*disabled:\s*(.+)$/)?.[1];
    if (disabled !== undefined && current !== undefined && current.disabled === undefined) {
      current.disabled = disabled.trim();
    }
  }
  return rows;
}

function baselineRows(file: string, presetId: string): PluginRow[] {
  return pluginRows(readFileSync(join(BASELINE, file), "utf8"), presetId);
}

function lineIndent(line: string): number {
  return line.length - line.trimStart().length;
}

/** Extract one plugin row's full config block, dedented and without comments or blank lines. */
function pluginConfigBlock(source: string, presetId: string, pluginId: string): string {
  const lines = presetLines(source, presetId);
  const pluginsAt = lines.findIndex((line) => line === "        plugins:");
  if (pluginsAt < 0) throw new Error(`preset "${presetId}" has no plugins list`);

  const body = lines.slice(pluginsAt + 1);
  const start = body.findIndex((line) => {
    const match = line.match(/^(\s*)- id:\s*(.+)$/);
    return match !== null && clean(match[2]) === pluginId;
  });
  if (start < 0) throw new Error(`plugin "${pluginId}" was not found in preset "${presetId}"`);
  const indent = lineIndent(body[start]!);

  const block: string[] = [body[start]!];
  for (const line of body.slice(start + 1)) {
    const sibling = line.match(/^(\s*)- id:\s*(.+)$/);
    if (sibling !== null && sibling[1].length <= indent) break;
    if (line.trim() !== "" && lineIndent(line) <= indent && !line.trimStart().startsWith("#")) {
      break;
    }
    block.push(line);
  }

  return block
    .filter((line) => line.trim() !== "" && !line.trimStart().startsWith("#"))
    .map((line) => line.slice(indent).replace(/\s+$/, ""))
    .join("\n");
}

/** Plugin ids whose config is shared verbatim with the DSH root picker presets. */
const SHARED_CONFIG_BLOCKS = [
  "tool-fs",
  "tool-fs-search",
  "tool-web",
  "tool-todo",
  "planning",
  "compaction",
] as const;

function expectSharedConfigBlocks(
  targetPreset: string,
  fixtureFile: string,
  fixturePreset: string,
): void {
  const fixture = readFileSync(join(BASELINE, fixtureFile), "utf8");
  for (const id of SHARED_CONFIG_BLOCKS) {
    expect(pluginConfigBlock(PATCH, targetPreset, id)).toBe(
      pluginConfigBlock(fixture, fixturePreset, id),
    );
  }
}

function expectedRootRows(baseline: PluginRow[]): PluginRow[] {
  return [
    ...baseline.filter((row) => row.id !== "tool-subagent" && row.id !== "tool-subagent-fork"),
    ...PSTACK_ROWS,
  ];
}

describe("poteto-mode preset parity", () => {
  it("matches the standard preset with only the documented delegation delta", () => {
    expect(pluginRows(PATCH, "preset-poteto-mode")).toEqual(
      expectedRootRows(baselineRows("standard.patch.yml", "preset-standard")),
    );
  });

  it("matches the Creator preset with only the documented delegation delta", () => {
    expect(pluginRows(PATCH, "preset-poteto-mode-creator")).toEqual(
      expectedRootRows(baselineRows("cordis.patch.yml", "preset-cordis")),
    );
  });

  it("keeps the pstack skills and prompt section in both root presets", () => {
    const poteto = presetLines(PATCH, "preset-poteto-mode").join("\n");
    const creator = presetLines(PATCH, "preset-poteto-mode-creator").join("\n");
    for (const source of [poteto, creator]) {
      expect(source).toContain('name: "@deepseek-ai/dsh-skill-filesystem"');
      expect(source).toContain("id: poteto-mode-section");
    }
    expect(PATCH).toContain("dist/pstack/skills");
    expect(creator).toContain("customSkillDirs");
    // The pstack tools live once at the bundle level, not inside each root preset.
    expect(PATCH).toContain("    - id: pstack-subagent");
    expect(PATCH).toContain("    - id: pstack-models");
    expect(PATCH).toContain("    - id: pstack-roles");
    for (const source of [poteto, creator]) {
      expect(source).not.toContain("id: pstack-subagent");
      expect(source).not.toContain("id: pstack-skill");
    }
  });

  it("matches the standard preset's shared config blocks", () => {
    expectSharedConfigBlocks("preset-poteto-mode", "standard.patch.yml", "preset-standard");
  });

  it("matches the Creator preset's shared config blocks", () => {
    expectSharedConfigBlocks("preset-poteto-mode-creator", "cordis.patch.yml", "preset-cordis");
  });
});
