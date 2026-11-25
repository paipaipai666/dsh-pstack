import { describe, expect, it } from "vite-plus/test";

import {
  latestUserText,
  loadPlaybooks,
  parsePlaybook,
  parseRoute,
  renderPlaybookIndex,
  renderRouteMessage,
} from "../src/playbook-router.ts";

const PLAYBOOKS = [
  { id: "feature", title: "Feature", summary: "A new capability users can see." },
  { id: "bug-fix", title: "Bug fix", summary: "Something that used to work does not." },
];

describe("parsePlaybook", () => {
  it("reads the title and the first prose line", () => {
    expect(parsePlaybook("feature", "# Feature\n\nA new capability.\n\n## When\n")).toEqual({
      id: "feature",
      title: "Feature",
      summary: "A new capability.",
    });
  });

  it("drops bullet markers from the summary", () => {
    expect(parsePlaybook("bug-fix", "# Bug fix\n\n- Something broke.\n")?.summary).toBe(
      "Something broke.",
    );
  });

  it("returns undefined for a file with no prose", () => {
    expect(parsePlaybook("empty", "# Empty\n\n## Next\n")).toBeUndefined();
  });

  it("reads the bundled shape: a level-three heading over a bold lead sentence", () => {
    const parsed = parsePlaybook(
      "feature",
      "### Feature\n\n**You own the design. Plan, review, verify.** Delegate implementation.\n\n1. Trace the affected subsystem.\n",
    );
    expect(parsed).toEqual({
      id: "feature",
      title: "Feature",
      summary: "You own the design. Plan, review, verify. Delegate implementation.",
    });
  });
});

describe("loadPlaybooks", () => {
  it("reads the bundled playbooks", () => {
    const playbooks = loadPlaybooks();
    expect(playbooks.length).toBeGreaterThanOrEqual(20);
    expect(playbooks.map((playbook) => playbook.id)).toContain("multi-phase-plan");
    expect(playbooks.every((playbook) => playbook.summary !== "")).toBe(true);
  });

  it("returns nothing for a missing directory", () => {
    expect(loadPlaybooks("/definitely/not/here")).toEqual([]);
  });
});

describe("renderPlaybookIndex", () => {
  it("renders one line per playbook", () => {
    expect(renderPlaybookIndex(PLAYBOOKS)).toBe(
      "- `feature`: Feature. A new capability users can see.\n- `bug-fix`: Bug fix. Something that used to work does not.",
    );
  });
});

describe("latestUserText", () => {
  it("reads the newest user message and ignores notices", () => {
    const text = latestUserText([
      { source: { kind: "user" }, content: [{ type: "text", text: "first" }] },
      { source: { kind: "playbook-route" }, content: [{ type: "text", text: "notice" }] },
      { source: { kind: "user" }, content: [{ type: "text", text: "second" }] },
    ]);
    expect(text).toBe("second");
  });

  it("returns undefined when no user message is claimed", () => {
    expect(
      latestUserText([{ source: { kind: "repeat-tool-reminder" }, content: [] }]),
    ).toBeUndefined();
  });
});

describe("parseRoute", () => {
  // The real corpus, because a bare-id answer is only readable against the ids
  // that actually exist.
  const known = new Set(loadPlaybooks().map((playbook) => playbook.id));

  it("reads a plain answer", () => {
    expect(parseRoute('{"playbook":"feature","why":"new UI"}', known)).toEqual({
      kind: "playbook",
      id: "feature",
      why: "new UI",
    });
  });

  it("reads an answer wrapped in prose and a fence", () => {
    const answer = 'Sure.\n```json\n{"playbook": "bug-fix", "why": "regression"}\n```';
    expect(parseRoute(answer, known)).toMatchObject({ kind: "playbook", id: "bug-fix" });
  });

  it("accepts an explicit null", () => {
    expect(parseRoute('{"playbook": null}', known)).toEqual({ kind: "none" });
  });

  it("rejects an invented id", () => {
    expect(parseRoute('{"playbook":"deploy"}', known)).toMatchObject({ kind: "invalid" });
  });

  it("reads an id alone, when the model never emitted the object", () => {
    expect(parseRoute("multi-phase-plan", known)).toEqual({
      kind: "playbook",
      id: "multi-phase-plan",
      why: "",
    });
    expect(parseRoute("I would pick `refactoring` here.", known)).toMatchObject({
      kind: "playbook",
      id: "refactoring",
    });
  });

  it("refuses to choose between two playbooks named in prose", () => {
    expect(parseRoute("Either feature or multi-phase-plan.", known)).toMatchObject({
      kind: "invalid",
    });
  });

  it("reads a bare null", () => {
    expect(parseRoute("null", known)).toEqual({ kind: "none" });
  });

  it("rejects prose that names no playbook", () => {
    expect(parseRoute("This is a small change, no plan needed.", known)).toMatchObject({
      kind: "invalid",
    });
  });
});

describe("renderRouteMessage", () => {
  it("names the playbook and the call that opens it", () => {
    const text = renderRouteMessage({ kind: "playbook", id: "feature", why: "new UI" }, PLAYBOOKS);
    expect(text).toContain("**Feature** work");
    expect(text).toContain("`playbooks/feature.md`");
    expect(text).toContain("name `poteto-mode`, resource `playbooks/feature.md`");
    expect(text).toContain("Reason: new UI");
  });

  it("stays silent when no playbook fits", () => {
    expect(renderRouteMessage({ kind: "none" }, PLAYBOOKS)).toBeUndefined();
  });
});
