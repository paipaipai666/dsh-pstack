import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vite-plus/test";

import {
  ChartSyntaxError,
  createPstackChartTool,
  parseChart,
  renderChartSvg,
} from "../src/chart.ts";

const CORPUS = join(
  import.meta.dirname,
  "..",
  "pstack",
  "skills",
  "statechart",
  "scripts",
  "test",
  "corpus",
);
const corpusChart = (name: string) => readFileSync(join(CORPUS, name, "chart.mmd"), "utf8");

const leafCount = (source: string) => {
  const chart = parseChart(source);
  let leaves = 0;
  for (const item of chart.items.values()) if (item.kind === "leaf") leaves += 1;
  return leaves;
};

const marksOf = (source: string) => {
  const chart = parseChart(source);
  const marks = { breaks: 0, mayBreak: 0, bugPath: 0, repeats: 0 };
  for (const item of chart.items.values()) {
    if (item.kind !== "leaf" || item.mark === undefined) continue;
    if (item.mark in marks) marks[item.mark as keyof typeof marks] += 1;
  }
  return marks;
};

describe("pstack_chart", () => {
  it("parses a flat counter chart", () => {
    const chart = parseChart(corpusChart("Counter"));
    expect(chart.direction).toBe("TB");
    expect(chart.items.size).toBe(5); // four states plus the start marker
    expect(chart.edges).toHaveLength(4);
    expect(leafCount(corpusChart("Counter"))).toBe(5);
    const labels = [...chart.items.values()]
      .filter((item) => item.kind === "leaf" && item.label !== "●")
      .map((item) => item.label)
      .sort();
    expect(labels).toEqual(["0", "1", "2", "3"]);
  });

  it("walks into groups and parallel regions", () => {
    const chart = parseChart(corpusChart("LoginParallel"));
    expect(chart.direction).toBe("LR");
    let groups = 0;
    for (const item of chart.items.values()) if (item.kind === "group") groups += 1;
    expect(groups).toBe(4); // Legend, At the same time, Session, Tries
    expect(leafCount(corpusChart("LoginParallel"))).toBe(11);
    expect(chart.edges).toHaveLength(12);

    const session = chart.children.get("r0") ?? [];
    expect(session.filter((id) => /^s\d$/u.test(id))).toEqual(["s0", "s1", "s2"]);
    const regions = chart.items.get("all");
    expect(regions).toMatchObject({ kind: "group", regions: 2 });
  });

  it("keeps quoted labels from the corpus", () => {
    const chart = parseChart(corpusChart("SpacedNames"));
    const labels = [...chart.items.values()]
      .filter((item) => item.kind === "leaf")
      .map((item) => item.label);
    expect(labels).toContain('s="a b" t="c"');
    expect(labels).toContain('s="" t="z"');
  });

  it("keeps the last class of a state that carries two", () => {
    const chart = parseChart(corpusChart("LoginParallel"));
    expect(chart.items.get("lg0")).toMatchObject({ mark: "mayBreak" });
    // s2 is declared `mayBreak` and then `bugPath`; the later line wins, as it does in Mermaid.
    expect(chart.items.get("s2")).toMatchObject({ mark: "bugPath" });
    expect(marksOf(corpusChart("LoginParallel"))).toEqual({
      breaks: 0,
      mayBreak: 1,
      bugPath: 8,
      repeats: 0,
    });
  });

  it("paints declared and built-in marks", () => {
    const svg = renderChartSvg(parseChart(corpusChart("SpacedNames")));
    expect(svg).toContain('fill="#ffecee"'); // breaks, declared by the file
    expect(svg).toContain('fill="#eaf1ff"'); // bugPath, supplied by the renderer
    const login = renderChartSvg(parseChart(corpusChart("LoginParallel")));
    expect(login).toContain('fill="#fff3e6"'); // mayBreak, declared by the file
  });

  it("draws start markers as circles instead of text", () => {
    const svg = renderChartSvg(parseChart(corpusChart("Counter")));
    expect(svg).toContain("<circle");
    expect(svg).not.toContain(">●<");
    expect(svg.startsWith("<svg")).toBe(true);
  });

  it("escapes labels that would break the document", () => {
    const svg = renderChartSvg(parseChart("stateDiagram-v2\n  s0: a < b & c\n  [*] --> s0\n"));
    expect(svg).toContain("a &lt; b &amp; c");
    expect(svg).not.toContain("a < b & c");
  });

  it("reports the line of syntax it cannot read", () => {
    expect(() =>
      parseChart("stateDiagram-v2\n  s0: zero\n  s0 --> s1: Go\n  note over s0\n"),
    ).toThrow(ChartSyntaxError);
    try {
      parseChart("stateDiagram-v2\n  s0: zero\n  note over s0\n");
      expect.unreachable("the parser should reject an unsupported line");
    } catch (error) {
      expect(error).toBeInstanceOf(ChartSyntaxError);
      expect((error as ChartSyntaxError).line).toBe(3);
      expect((error as ChartSyntaxError).message).toContain("unsupported line");
    }
  });

  it("requires the stateDiagram header", () => {
    expect(() => parseChart("graph TD\n  a --> b\n")).toThrow(/expected `stateDiagram-v2`/);
  });

  it("reads the front matter statechart writes above the diagram", () => {
    const chart = parseChart(
      '---\ntitle: "A session that can be reopened"\n---\nstateDiagram-v2\n  s0: idle\n  s0 --> s1: you send\n  s1: streaming\n',
    );
    expect(chart.title).toBe("A session that can be reopened");
    expect(chart.items.get("s0")?.label).toBe("idle");
    expect(chart.edges).toHaveLength(1);
    expect(renderChartSvg(chart)).toContain("A session that can be reopened");
  });

  it("refuses an edge that points at a state nobody declared", () => {
    expect(() => parseChart("stateDiagram-v2\n  s0: zero\n  s0 --> s9\n")).toThrow(
      /unknown state `s9`/,
    );
  });

  it("renders every chart in the statechart corpus", () => {
    const names = [
      "Counter",
      "CounterAction",
      "CounterDeadlock",
      "CounterFan",
      "CounterGuard",
      "CounterInitPast",
      "CounterInitPastHolds",
      "CounterInstance",
      "CounterJump",
      "CounterLoop",
      "CounterOrder",
      "CounterRules",
      "CounterStart",
      "CounterStop",
      "CounterTie",
      "CounterTieInGraph",
      "CounterView",
      "DieHard",
      "FirstRule",
      "HiddenClock",
      "Login",
      "LoginGuarded",
      "LoginParallel",
      "MediaPlayer",
      "MediaPlayerFixed",
      "MediaPlayerProps",
      "PickWorker",
      "Shadow",
      "SpacedNames",
      "TwoPhase",
      "TwoPhaseFixed",
      "TypeGuard",
      "UserNoDeadlock",
    ];
    expect(names.length).toBeGreaterThan(30);
    for (const name of names) {
      const svg = renderChartSvg(parseChart(corpusChart(name)));
      expect(svg, name).toContain("<svg");
      expect(svg, name).toContain("</svg>");
    }
  });

  it("writes the svg next to the chart", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pstack-chart-"));
    try {
      writeFileSync(join(dir, "chart.mmd"), corpusChart("Counter"), "utf8");
      const tool = createPstackChartTool({ resolveWorkspace: async () => dir });
      const outcome = (await tool.execute({ input: "chart.mmd" }, {
        signal: new AbortController().signal,
      } as never)) as {
        input: string;
        output: string;
        states: number;
        groups: number;
        edges: number;
        marks: { breaks: number };
      };
      expect(outcome.output).toBe(join(dir, "chart.svg"));
      expect(outcome).toMatchObject({ states: 5, groups: 0, edges: 4 });
      expect(readFileSync(outcome.output, "utf8")).toContain("<svg");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects an output that is not an svg", async () => {
    const tool = createPstackChartTool({ resolveWorkspace: async () => process.cwd() });
    await expect(
      tool.execute({ input: "chart.mmd", output: "chart.png" }, {
        signal: new AbortController().signal,
      } as never),
    ).rejects.toThrow(/\.svg/u);
  });

  it("rejects a call without an input path", async () => {
    const tool = createPstackChartTool({ resolveWorkspace: async () => process.cwd() });
    await expect(
      tool.execute({}, { signal: new AbortController().signal } as never),
    ).rejects.toThrow(/`input`/u);
  });
});
