/**
 * Render a `statechart` Mermaid diagram to a standalone SVG.
 *
 * `statechart` already writes the colours into `chart.mmd` as `classDef`/`class` lines, but DSH has
 * no Mermaid renderer. Pele used to fill that gap. This module reads the subset of Mermaid the
 * statechart backend emits and draws it directly, so a chart becomes a picture again without a
 * dependency on a browser or an external binary.
 *
 * The layout is deterministic but approximate: states are placed in layers by longest path from a
 * start marker, groups become bordered boxes, parallel regions sit side by side. The Mermaid text
 * remains the authoritative artefact; this renderer refuses anything it does not understand instead
 * of guessing.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";

import type {
  JsonSchemaNode,
  ToolDefinition,
  ToolRunContext,
  ToolsHost,
  WorkingDirectoryHost,
} from "./host-contract.ts";

export const name = "pstack-chart";
export const inject = ["tools"] as const;
export const TOOL_NAME = "pstack_chart";
const MAX_INPUT_BYTES = 2 * 1024 * 1024;

/** A `classDef` the chart declared, or one of the marks the statechart backend relies on. */
const BUILT_IN_MARKS: Record<string, string> = {
  breaks: "fill:#ffecee,stroke:#e72e3b,stroke-width:2.5px,color:#cd2834",
  mayBreak: "fill:#fff3e6,stroke:#e8730c,stroke-width:2.5px,color:#b85a06",
  bugPath: "fill:#eaf1ff,stroke:#3b6fd4,stroke-width:2.5px,color:#22457f",
  repeats: "fill:#f0ecff,stroke:#6a4fd8,stroke-width:2.5px,color:#3f2f8f",
};

const DEFAULT_STYLE = { fill: "#f7f8fa", stroke: "#9aa4b2", strokeWidth: 1.5, color: "#1f2937" };

export class ChartSyntaxError extends Error {
  readonly line: number;

  constructor(line: number, message: string) {
    super(`chart.mmd:${line}: ${message}`);
    this.name = "ChartSyntaxError";
    this.line = line;
  }
}

export interface ChartLeaf {
  readonly kind: "leaf";
  readonly id: string;
  readonly label: string;
  readonly parent: string;
  /** Class name from a `class` line, when one applies. */
  readonly mark?: string;
}

export interface ChartGroup {
  readonly kind: "group";
  readonly id: string;
  readonly label: string;
  readonly parent: string;
  readonly regions: number;
}

export type ChartItem = ChartLeaf | ChartGroup;

export interface ChartEdge {
  readonly from: string;
  readonly to: string;
  readonly label: string;
  /** The scope (parent group id, `""` for the root) the line appeared in. */
  readonly scope: string;
}

export interface ParsedChart {
  readonly items: ReadonlyMap<string, ChartItem>;
  readonly roots: readonly string[];
  readonly children: ReadonlyMap<string, readonly string[]>;
  readonly edges: readonly ChartEdge[];
  readonly classDefs: ReadonlyMap<string, string>;
  readonly direction: "TB" | "LR";
  readonly title?: string;
}

const ENTITY = /#(\d+);/g;
const decodeEntities = (text: string) =>
  text.replace(ENTITY, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)));

const splitStyle = (style: string) => {
  const out: Record<string, string> = {};
  for (const part of style.split(",")) {
    const index = part.indexOf(":");
    if (index === -1) continue;
    out[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  return out;
};

const styleOf = (mark: string | undefined, classDefs: ReadonlyMap<string, string>) => {
  const raw = mark === undefined ? undefined : (classDefs.get(mark) ?? BUILT_IN_MARKS[mark]);
  if (raw === undefined) return DEFAULT_STYLE;
  const parts = splitStyle(raw);
  return {
    fill: parts.fill ?? DEFAULT_STYLE.fill,
    stroke: parts.stroke ?? DEFAULT_STYLE.stroke,
    strokeWidth: Number.parseFloat(parts["stroke-width"] ?? "") || DEFAULT_STYLE.strokeWidth,
    color: parts.color ?? DEFAULT_STYLE.color,
  };
};

const STATE_LABEL = /^state\s+"((?:[^"\\]|\\.)*)"\s+as\s+([\p{L}\p{N}_.-]+)(\s*\{)?$/u;
const STATE_PLAIN = /^state\s+([\p{L}\p{N}_.-]+)(\s*\{)?$/u;
const TRANSITION = /^(\[\*\]|[\p{L}\p{N}_.-]+)\s*-->\s*(\[\*\]|[\p{L}\p{N}_.-]+)(?:\s*:\s*(.*))?$/u;
const DESCRIPTION = /^([\p{L}\p{N}_.-]+)\s*:\s*(.*)$/u;
const CLASS_DEF = /^classDef\s+([\p{L}\p{N}_.-]+)\s+(.+)$/u;
const CLASS_APPLY = /^class\s+([\p{L}\p{N}_.,-]+)\s+([\p{L}\p{N}_.-]+)$/u;
const DIRECTION = /^direction\s+(TB|LR|RL|BT)$/u;

/** Parse the Mermaid subset the statechart backend emits. */
export function parseChart(source: string): ParsedChart {
  const items = new Map<string, ChartItem>();
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  const edges: ChartEdge[] = [];
  const classDefs = new Map<string, string>();
  const marks = new Map<string, string>();
  const stack: string[] = [""];
  let regions = new Map<string, number>();
  let direction: "TB" | "LR" = "TB";
  let seenHeader = false;
  let scopeSeq = 0;

  const addChild = (parent: string, id: string) => {
    const list = children.get(parent);
    if (list === undefined) children.set(parent, [id]);
    else list.push(id);
    if (parent === "") roots.push(id);
  };

  const ensureMarker = (kind: "start" | "end", scope: string) => {
    const id = `__${kind}_${scope === "" ? "root" : scope}_${scopeSeq++}`;
    const label = kind === "start" ? "●" : "◉";
    items.set(id, { kind: "leaf", id, label, parent: scope });
    addChild(scope, id);
    return id;
  };

  const lines = source.split(/\r?\n/);
  // statechart writes a YAML front matter block with the title the view returned.
  let first = 0;
  let title: string | undefined;
  const opening = lines.findIndex((line) => line.trim() !== "");
  if (opening !== -1 && lines[opening]?.trim() === "---") {
    let closing = -1;
    for (let index = opening + 1; index < lines.length; index++) {
      if (lines[index]?.trim() === "---") {
        closing = index;
        break;
      }
    }
    if (closing === -1)
      throw new ChartSyntaxError(opening + 1, "front matter has no closing `---`");
    for (let index = opening + 1; index < closing; index++) {
      const value = /^title:\s*(.*)$/.exec(lines[index]?.trim() ?? "")?.[1]?.trim();
      if (value !== undefined && value !== "") title = value.replace(/^"(.*)"$/s, "$1");
    }
    first = closing + 1;
  }
  for (let index = first; index < lines.length; index++) {
    const raw = lines[index] ?? "";
    const line = index + 1;
    const text = raw.trim();
    if (!text || text.startsWith("%%")) continue;
    if (!seenHeader) {
      if (text === "stateDiagram-v2" || text === "stateDiagram") {
        seenHeader = true;
        continue;
      }
      throw new ChartSyntaxError(line, "expected `stateDiagram-v2` on the first line");
    }
    const scope = stack[stack.length - 1] ?? "";
    if (text === "}") {
      if (stack.length === 1) throw new ChartSyntaxError(line, "unmatched `}`");
      stack.pop();
      continue;
    }
    if (text === "--") {
      regions.set(scope, (regions.get(scope) ?? 1) + 1);
      continue;
    }
    const directionMatch = DIRECTION.exec(text);
    if (directionMatch) {
      const value = directionMatch[1];
      direction = value === "LR" || value === "RL" ? "LR" : "TB";
      continue;
    }
    const classDef = CLASS_DEF.exec(text);
    if (classDef) {
      classDefs.set(classDef[1]!, classDef[2]!);
      continue;
    }
    const classApply = CLASS_APPLY.exec(text);
    if (classApply) {
      for (const id of classApply[1]!.split(",")) marks.set(id.trim(), classApply[2]!);
      continue;
    }
    const labelled = STATE_LABEL.exec(text);
    if (labelled) {
      const id = labelled[2]!;
      if (items.has(id)) throw new ChartSyntaxError(line, `state \`${id}\` is declared twice`);
      const group = labelled[3] !== undefined;
      items.set(
        id,
        group
          ? { kind: "group", id, label: decodeEntities(labelled[1]!), parent: scope, regions: 1 }
          : { kind: "leaf", id, label: decodeEntities(labelled[1]!), parent: scope },
      );
      addChild(scope, id);
      if (group) {
        stack.push(id);
        regions.set(id, 1);
      }
      continue;
    }
    const plain = STATE_PLAIN.exec(text);
    if (plain) {
      const id = plain[1]!;
      const group = plain[2] !== undefined;
      if (!items.has(id)) {
        items.set(
          id,
          group
            ? { kind: "group", id, label: id, parent: scope, regions: 1 }
            : { kind: "leaf", id, label: id, parent: scope },
        );
        addChild(scope, id);
      }
      if (group) {
        stack.push(id);
        regions.set(id, 1);
      }
      continue;
    }
    const transition = TRANSITION.exec(text);
    if (transition) {
      const rawFrom = transition[1]!;
      const rawTo = transition[2]!;
      const label = decodeEntities(transition[3]?.trim() ?? "");
      const from = rawFrom === "[*]" ? ensureMarker("start", scope) : rawFrom;
      const to = rawTo === "[*]" ? ensureMarker("end", scope) : rawTo;
      edges.push({ from, to, label, scope });
      continue;
    }
    const description = DESCRIPTION.exec(text);
    if (description) {
      const id = description[1]!;
      const label = decodeEntities(description[2]!);
      const existing = items.get(id);
      if (existing?.kind === "leaf") items.set(id, { ...existing, label });
      else if (existing === undefined) {
        items.set(id, { kind: "leaf", id, label, parent: scope });
        addChild(scope, id);
      } else throw new ChartSyntaxError(line, `\`${id}\` is a group and cannot take a label`);
      continue;
    }
    throw new ChartSyntaxError(line, `unsupported line \`${text}\``);
  }
  if (!seenHeader) throw new ChartSyntaxError(1, "expected `stateDiagram-v2` on the first line");
  if (stack.length !== 1) throw new ChartSyntaxError(lines.length, "unclosed `state` block");

  // A class line may name a state declared later, so apply the marks once everything is read.
  const withMarks = new Map<string, ChartItem>();
  for (const [id, item] of items) {
    const mark = marks.get(id);
    withMarks.set(id, item.kind === "leaf" && mark !== undefined ? { ...item, mark } : item);
  }
  for (const [id, item] of withMarks) {
    if (item.kind === "group" && regions.size > 0) {
      const count = regions.get(id) ?? 1;
      if (count > 1) withMarks.set(id, { ...item, regions: count });
    }
  }
  for (const edge of edges) {
    for (const endpoint of [edge.from, edge.to]) {
      if (!withMarks.has(endpoint)) throw new ChartSyntaxError(1, `unknown state \`${endpoint}\``);
    }
  }
  return title === undefined
    ? { items: withMarks, roots, children, edges, classDefs, direction }
    : { items: withMarks, roots, children, edges, classDefs, direction, title };
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface ScopeLayout {
  readonly width: number;
  readonly height: number;
  readonly boxes: ReadonlyMap<string, Box>;
}

const PAD = 16;
const GAP_X = 56;
const GAP_Y = 64;
const TITLE_HEIGHT = 28;
const GROUP_TITLE = 22;

const charWidth = (text: string) => {
  let width = 0;
  for (const char of text) width += /[\u3000-\u9fff\uff00-\uffef]/u.test(char) ? 12 : 6.6;
  return width;
};

const wrap = (label: string, limit: number) => {
  const words = label.split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (charWidth(next) > limit && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.length === 0 ? [""] : lines;
};

const leafSize = (label: string) => {
  const lines = wrap(label, 176);
  const width = Math.max(96, Math.max(...lines.map(charWidth)) + 28);
  return { width: Math.ceil(width), height: lines.length * 16 + 20, lines };
};

const childrenOf = (chart: ParsedChart, scope: string) => chart.children.get(scope) ?? [];

/** The item of `scope` that holds `node`, or `node` itself when it lives directly here. */
const itemOf = (chart: ParsedChart, scope: string, node: string): string => {
  let current = node;
  for (;;) {
    const item = chart.items.get(current);
    if (item === undefined) return node;
    if (item.parent === scope) return current;
    if (item.parent === "") return current;
    current = item.parent;
  }
};

const layoutScope = (chart: ParsedChart, scope: string): ScopeLayout => {
  const itemIds = childrenOf(chart, scope);
  const boxes = new Map<string, Box>();
  const sizes = new Map<string, { width: number; height: number; lines: string[] }>();
  const inner = new Map<string, ScopeLayout>();
  const regionCount =
    chart.items.get(scope)?.kind === "group" ? (chart.items.get(scope) as ChartGroup).regions : 1;

  for (const id of itemIds) {
    const item = chart.items.get(id);
    if (item === undefined) continue;
    if (item.kind === "leaf") {
      sizes.set(id, leafSize(item.label));
      continue;
    }
    const nested = layoutScope(chart, id);
    inner.set(id, nested);
    sizes.set(id, {
      width: Math.max(160, nested.width + PAD * 2),
      height: nested.height + GROUP_TITLE + PAD,
      lines: [item.label],
    });
  }

  // Longest-path layering on the item graph. Cycles get a fixed point instead of an infinite loop.
  const adjacency = new Map<string, Set<string>>();
  for (const id of itemIds) adjacency.set(id, new Set());
  for (const edge of chart.edges) {
    const from = itemOf(chart, scope, edge.from);
    const to = itemOf(chart, scope, edge.to);
    if (from === to) continue;
    adjacency.get(from)?.add(to);
  }
  const depth = new Map<string, number>();
  const isStart = (id: string) =>
    chart.items.get(id)?.kind === "leaf" && (chart.items.get(id) as ChartLeaf).label === "●";
  for (const id of itemIds) depth.set(id, isStart(id) ? 0 : 0);
  for (let pass = 0; pass < itemIds.length + 1; pass++) {
    let changed = false;
    for (const [from, targets] of adjacency) {
      const base = depth.get(from) ?? 0;
      for (const to of targets) {
        const next = base + 1;
        if ((depth.get(to) ?? 0) < next && next <= itemIds.length) {
          depth.set(to, next);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  // Column per depth, in declaration order inside a column.
  const columns = new Map<number, string[]>();
  for (const id of itemIds) {
    const key = depth.get(id) ?? 0;
    const list = columns.get(key);
    if (list === undefined) columns.set(key, [id]);
    else list.push(id);
  }
  const ordered = [...columns.keys()].sort((a, b) => a - b);
  const columnWidths = ordered.map((key) =>
    Math.max(...(columns.get(key) ?? []).map((id) => sizes.get(id)?.width ?? 0)),
  );
  const totalWidth =
    columnWidths.reduce((sum, width) => sum + width, 0) +
    GAP_X * Math.max(0, columnWidths.length - 1);
  const tallest = Math.max(
    0,
    ...ordered.map(
      (key) =>
        (columns.get(key) ?? []).reduce((sum, id) => sum + (sizes.get(id)?.height ?? 0), 0) +
        GAP_Y * Math.max(0, (columns.get(key)?.length ?? 1) - 1),
    ),
  );

  const horizontal = chart.direction === "LR" || regionCount > 1;
  if (horizontal) {
    let x = 0;
    for (const [column, key] of ordered.entries()) {
      const ids = columns.get(key) ?? [];
      let y = 0;
      for (const id of ids) {
        const size = sizes.get(id)!;
        boxes.set(id, { x, y, ...size });
        y += size.height + GAP_Y;
      }
      x += columnWidths[column]! + GAP_X;
    }
  } else {
    let y = 0;
    for (const key of ordered) {
      const ids = columns.get(key) ?? [];
      let x = 0;
      for (const id of ids) {
        const size = sizes.get(id)!;
        boxes.set(id, { x, y, ...size });
        x += size.width + GAP_X;
      }
      y += Math.max(...ids.map((id) => sizes.get(id)?.height ?? 0)) + GAP_Y;
    }
  }

  const width = Math.max(
    totalWidth,
    ...ordered.map((key) => {
      const ids = columns.get(key) ?? [];
      return (
        ids.reduce((sum, id) => sum + (sizes.get(id)?.width ?? 0), 0) +
        GAP_X * Math.max(0, ids.length - 1)
      );
    }),
    120,
  );
  const height = Math.max(
    tallest,
    ...ordered.map((key) => {
      const ids = columns.get(key) ?? [];
      return (
        ids.reduce((sum, id) => sum + (sizes.get(id)?.height ?? 0), 0) +
        GAP_Y * Math.max(0, ids.length - 1)
      );
    }),
    60,
  );

  // Keep nested boxes for the renderer without re-laying them out.
  const merged = new Map(boxes);
  for (const [id, nested] of inner) {
    merged.set(`inner:${id}`, { x: 0, y: 0, width: nested.width, height: nested.height });
  }
  return { width, height, boxes: merged };
};

const escapeXml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const edgePath = (from: Box, to: Box, direction: "TB" | "LR") => {
  const start =
    direction === "LR"
      ? { x: from.x + from.width, y: from.y + from.height / 2 }
      : { x: from.x + from.width / 2, y: from.y + from.height };
  const end =
    direction === "LR" ? { x: to.x, y: to.y + to.height / 2 } : { x: to.x + to.width / 2, y: to.y };
  if (direction === "LR") {
    const dx = Math.max(18, (end.x - start.x) / 2);
    return {
      d: `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`,
      mid: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    };
  }
  const dy = Math.max(18, (end.y - start.y) / 2);
  return {
    d: `M ${start.x} ${start.y} C ${start.x} ${start.y + dy}, ${end.x} ${end.y - dy}, ${end.x} ${end.y}`,
    mid: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
  };
};

/** Draw a parsed chart. Coordinates are local to each scope and translated on the way out. */
export function renderChartSvg(chart: ParsedChart): string {
  const parts: string[] = [];
  const root = layoutScope(chart, "");

  const drawScope = (scope: string, layout: ScopeLayout, dx: number, dy: number): void => {
    const direction = chart.direction;
    for (const id of childrenOf(chart, scope)) {
      const box = layout.boxes.get(id);
      const item = chart.items.get(id);
      if (box === undefined || item === undefined) continue;
      if (item.kind === "group") {
        const nested = layout.boxes.get(`inner:${id}`);
        parts.push(
          `<g transform="translate(${dx + box.x} ${dy + box.y})">`,
          `<rect width="${box.width}" height="${box.height}" rx="12" fill="#fcfcfd" stroke="#c3c9d2" stroke-width="1.5" stroke-dasharray="6 4"/>`,
          `<text x="14" y="17" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" font-weight="600" fill="#4b5563">${escapeXml(item.label)}</text>`,
        );
        const innerLayout = layoutScope(chart, id);
        drawScope(id, innerLayout, PAD, GROUP_TITLE);
        parts.push("</g>");
        void nested;
        continue;
      }
      const style = styleOf(item.mark, chart.classDefs);
      const lines = wrap(item.label, 176);
      const isMarker = item.label === "●" || item.label === "◉";
      if (isMarker) {
        parts.push(
          `<circle cx="${dx + box.x + box.width / 2}" cy="${dy + box.y + box.height / 2}" r="9" fill="${item.label === "●" ? "#1f2937" : "#ffffff"}" stroke="#1f2937" stroke-width="2"/>`,
        );
        continue;
      }
      parts.push(
        `<rect x="${dx + box.x}" y="${dy + box.y}" width="${box.width}" height="${box.height}" rx="8" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"/>`,
        `<text x="${dx + box.x + box.width / 2}" y="${dy + box.y + 20}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, monospace" font-size="12" fill="${style.color}">`,
        ...lines.map(
          (line, index) =>
            `<tspan x="${dx + box.x + box.width / 2}" dy="${index === 0 ? 0 : 15}">${escapeXml(line)}</tspan>`,
        ),
        "</text>",
      );
    }
    // Edges whose nearest common scope is this one.
    for (const edge of chart.edges) {
      if (edge.scope !== scope) continue;
      const fromId = itemOf(chart, scope, edge.from);
      const toId = itemOf(chart, scope, edge.to);
      const from = layout.boxes.get(fromId);
      const to = layout.boxes.get(toId);
      if (from === undefined || to === undefined || fromId === toId) continue;
      const path = edgePath(
        { x: dx + from.x, y: dy + from.y, width: from.width, height: from.height },
        { x: dx + to.x, y: dy + to.y, width: to.width, height: to.height },
        direction,
      );
      parts.push(
        `<path d="${path.d}" fill="none" stroke="#6b7280" stroke-width="1.5" marker-end="url(#arrow)"/>`,
      );
      if (edge.label) {
        const width = charWidth(edge.label) + 12;
        parts.push(
          `<g><rect x="${path.mid.x - width / 2}" y="${path.mid.y - 9}" width="${width}" height="18" rx="4" fill="#ffffff" fill-opacity="0.92"/><text x="${path.mid.x}" y="${path.mid.y + 4}" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="#374151">${escapeXml(edge.label)}</text></g>`,
        );
      }
    }
  };

  const width = root.width + PAD * 2;
  const titleHeight = chart.title === undefined ? 0 : TITLE_HEIGHT;
  const height = root.height + PAD * 2 + titleHeight;
  drawScope("", root, PAD, PAD + titleHeight);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="${Math.ceil(height)}" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}" role="img" aria-label="statechart">`,
    '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280"/></marker></defs>',
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    ...(chart.title === undefined
      ? []
      : [
          `<text x="${PAD}" y="${PAD}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" font-weight="600" fill="#111827">${escapeXml(chart.title)}</text>`,
        ]),
    ...parts,
    "</svg>",
    "",
  ].join("\n");
}

export interface ChartHost {
  readonly workingDirectory?: WorkingDirectoryHost;
  readonly readFile?: (path: string) => string;
  readonly writeFile?: (path: string, content: string) => void;
  readonly resolveWorkspace?: (exec: ToolRunContext) => Promise<string | undefined>;
}

const OUTPUT_SCHEMA: JsonSchemaNode = {
  type: "object",
  additionalProperties: false,
  properties: {
    input: { type: "string" },
    output: { type: "string" },
    bytes: { type: "number" },
    states: { type: "number" },
    groups: { type: "number" },
    edges: { type: "number" },
    marks: {
      type: "object",
      additionalProperties: false,
      properties: {
        breaks: { type: "number" },
        mayBreak: { type: "number" },
        bugPath: { type: "number" },
        repeats: { type: "number" },
      },
      required: ["breaks", "mayBreak", "bugPath", "repeats"],
    },
  },
  required: ["input", "output", "bytes", "states", "groups", "edges", "marks"],
};

export interface ChartOutcome {
  readonly input: string;
  readonly output: string;
  readonly bytes: number;
  readonly states: number;
  readonly groups: number;
  readonly edges: number;
  readonly marks: { breaks: number; mayBreak: number; bugPath: number; repeats: number };
}

const renderChartOutcome = (outcome: ChartOutcome) =>
  [
    `rendered ${outcome.input} -> ${outcome.output}`,
    `states: ${outcome.states} · groups: ${outcome.groups} · edges: ${outcome.edges} · ${outcome.bytes} bytes`,
    `marks: breaks ${outcome.marks.breaks} · mayBreak ${outcome.marks.mayBreak} · bugPath ${outcome.marks.bugPath} · repeats ${outcome.marks.repeats}`,
  ].join("\n");

const TOOL_DESCRIPTION = [
  "Render a statechart `chart.mmd` to a standalone SVG next to it.",
  "",
  "The statechart script writes colours into the Mermaid text as `classDef`/`class` lines; DSH has no",
  "Mermaid renderer, so this tool draws the subset the backend emits: states, groups, parallel regions,",
  "labelled transitions, and the `breaks`/`mayBreak`/`bugPath`/`repeats` marks. It writes `<input>.svg`",
  "by default and returns the paths and counts. `chart.mmd` stays authoritative; unsupported syntax is",
  "reported with its line number instead of being guessed.",
].join("\n");

export function createPstackChartTool(host: ChartHost): ToolDefinition {
  const read = host.readFile ?? ((path: string) => readFileSync(path, "utf8"));
  const write = host.writeFile ?? ((path: string, content: string) => writeFileSync(path, content));
  return {
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        input: { type: "string", description: "Path to the statechart `chart.mmd`." },
        output: {
          type: "string",
          description: "Where to write the SVG; defaults to `<input>.svg`.",
        },
      },
      required: ["input"],
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [
        { type: "text", text: renderChartOutcome(value as unknown as ChartOutcome) },
      ],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const raw = args as { readonly input?: unknown; readonly output?: unknown };
      if (typeof raw.input !== "string" || raw.input.trim() === "") {
        throw new Error("`input` must be the path to a chart.mmd file.");
      }
      if (raw.output !== undefined && typeof raw.output !== "string") {
        throw new Error("`output` must be a path when it is given.");
      }
      const workspace = await host.resolveWorkspace?.(exec);
      const base = workspace ?? process.cwd();
      const input = resolve(base, raw.input);
      const output = resolve(base, raw.output ?? input.replace(/\.mmd$/u, "") + ".svg");
      if (extname(output).toLowerCase() !== ".svg") {
        throw new Error("`output` must end in .svg.");
      }
      const source = read(input);
      if (Buffer.byteLength(source, "utf8") > MAX_INPUT_BYTES) {
        throw new Error(`${input} is larger than ${MAX_INPUT_BYTES} bytes.`);
      }
      const chart = parseChart(source);
      const svg = renderChartSvg(chart);
      write(output, svg);
      let states = 0;
      let groups = 0;
      const marks = { breaks: 0, mayBreak: 0, bugPath: 0, repeats: 0 };
      for (const item of chart.items.values()) {
        if (item.kind === "group") groups += 1;
        else {
          states += 1;
          const mark = item.mark;
          if (
            mark === "breaks" ||
            mark === "mayBreak" ||
            mark === "bugPath" ||
            mark === "repeats"
          ) {
            marks[mark] += 1;
          }
        }
      }
      return {
        input,
        output,
        bytes: Buffer.byteLength(svg, "utf8"),
        states,
        groups,
        edges: chart.edges.length,
        marks,
      } satisfies ChartOutcome;
    },
  };
}

/** The slice of the Cordis context this row uses. */
export interface PstackChartHost {
  readonly tools: ToolsHost;
  readonly workingDirectory: WorkingDirectoryHost;
}

export function apply(ctx: PstackChartHost): void {
  ctx.tools.register(
    createPstackChartTool({
      resolveWorkspace: async (exec) => {
        if (exec.agent === undefined) return undefined;
        try {
          return await ctx.workingDirectory.ensure(exec.agent, exec.signal);
        } catch {
          return undefined;
        }
      },
    }),
  );
}
