import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";
import { readPatch } from "./patch-name.ts";

const ROOT = process.cwd();
const BASELINE = join(ROOT, "tests", "fixtures", "dsh-0.2.2-rc.5");
const PATCH = readPatch(join(ROOT, "cordis.patch.yml"));

interface PluginRow {
  id: string;
  name: string;
  indent: number;
  disabled?: string;
  /** The row's own lines plus everything nested under it, dedented. */
  block: readonly string[];
}

/** Rows pstack adds to the root picker presets. */
const PSTACK_ROWS: PluginRow[] = [
  {
    id: "poteto-mode-section",
    name: "dsh-pstack/poteto-mode",
    indent: 10,
    block: ["- id: poteto-mode-section", "  name: dsh-pstack/poteto-mode"],
  },
];

/**
 * Rows whose own block is expected to differ from the DSH baseline:
 *
 * - `persona` carries the poteto-mode preamble.
 * - `delegation` is a group whose children differ by design: the baseline ships
 *   `tool-subagent`/`tool-subagent-fork`, and pstack replaces both with the
 *   bundle-level `pstack-subagent` rows. Its remaining children are compared
 *   individually below.
 */
const CONTAINER_DELTAS = new Set(["persona", "delegation"]);

/** Rows the baseline ships and pstack intentionally replaces at bundle level. */
const REPLACED_ROWS = new Set(["tool-subagent", "tool-subagent-fork"]);

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

function lineIndent(line: string): number {
  return line.length - line.trimStart().length;
}

/** Parse the plugin rows of one preset, keeping each row's full nested block. */
function presetRows(source: string, presetId: string): PluginRow[] {
  const lines = presetLines(source, presetId);
  const pluginsAt = lines.findIndex((line) => line === "        plugins:");
  if (pluginsAt < 0) throw new Error(`preset "${presetId}" has no plugins list`);

  const body = lines.slice(pluginsAt + 1);
  const rows: PluginRow[] = [];
  for (let index = 0; index < body.length; index += 1) {
    const match = body[index]!.match(/^(\s*)- id:\s*(.+)$/);
    if (match === null) continue;

    const indent = match[1]!.length;
    const block: string[] = [body[index]!];
    for (let next = index + 1; next < body.length; next += 1) {
      const sibling = body[next]!.match(/^(\s*)- id:\s*(.+)$/);
      if (sibling !== null && sibling[1]!.length <= indent) break;
      if (body[next]!.trim() !== "" && lineIndent(body[next]!) <= indent) break;
      block.push(body[next]!);
    }

    const rest = block.slice(1);
    const name = rest.find((line) => /^\s*name:/.test(line));
    const disabled = rest.find((line) => /^\s*disabled:/.test(line));
    const dedented = block.map((line) => line.slice(indent).replace(/\s+$/, ""));
    rows.push({
      id: clean(match[2]!),
      name: name === undefined ? "" : clean(name.replace(/^\s*name:\s*/, "")),
      indent,
      ...(disabled === undefined ? {} : { disabled: disabled.trim() }),
      block: dedented.filter((line) => line.trim() !== "" && !line.trimStart().startsWith("#")),
    });
  }
  return rows;
}

function baselineRows(file: string, presetId: string): PluginRow[] {
  return presetRows(readFileSync(join(BASELINE, file), "utf8"), presetId);
}

/**
 * A row's comparable form: quotes around a `name:` value are YAML spelling, not
 * behaviour, so they are dropped; everything else (indentation, block-scalar
 * line breaks) is compared verbatim.
 */
function comparable(block: readonly string[]): string {
  return block.map((line) => line.replace(/^(\s*name:\s*)["'](.*)["']$/, "$1$2")).join("\n");
}

function expectedRows(baseline: readonly PluginRow[]): PluginRow[] {
  return [...baseline.filter((row) => !REPLACED_ROWS.has(row.id)), ...PSTACK_ROWS];
}

function expectPresetParity(
  targetPreset: string,
  fixtureFile: string,
  fixturePreset: string,
): void {
  const actual = presetRows(PATCH, targetPreset);
  const expected = expectedRows(baselineRows(fixtureFile, fixturePreset));

  expect(
    actual.map((row) => ({
      id: row.id,
      name: row.name,
      indent: row.indent,
      disabled: row.disabled,
    })),
  ).toEqual(
    expected.map((row) => ({
      id: row.id,
      name: row.name,
      indent: row.indent,
      disabled: row.disabled,
    })),
  );

  const byId = new Map(expected.map((row) => [row.id, row]));
  for (const row of actual) {
    if (CONTAINER_DELTAS.has(row.id)) continue;
    const counterpart = byId.get(row.id);
    if (counterpart === undefined) continue;
    expect({ id: row.id, block: comparable(row.block) }).toEqual({
      id: row.id,
      block: comparable(counterpart.block),
    });
  }
}

describe("poteto-mode preset parity", () => {
  it("matches the standard preset with only the documented delegation delta", () => {
    expectPresetParity("preset-poteto-mode", "standard.patch.yml", "preset-standard");
  });

  it("matches the Creator preset with only the documented delegation delta", () => {
    expectPresetParity("preset-poteto-mode-creator", "cordis.patch.yml", "preset-cordis");
  });

  it("hands the standard preset's Office tools to Poteto mode", () => {
    const ids = presetRows(PATCH, "preset-poteto-mode").map((row) => row.id);
    expect(ids).toContain("tool-office");
    expect(ids.indexOf("tool-office")).toBe(ids.indexOf("present") + 1);
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
});
