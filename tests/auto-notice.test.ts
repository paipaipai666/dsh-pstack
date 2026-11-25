import { describe, expect, it } from "vite-plus/test";

import {
  announceableSession,
  MAX_DISMISSED,
  parseDismissed,
  presetOf,
  withDismissed,
  type SessionsSnapshot,
} from "../src/client/auto-notice.ts";

function sessions(entries: Record<string, unknown>): SessionsSnapshot {
  return {
    byId: Object.fromEntries(
      Object.entries(entries).map(([id, agentPreset]) => [
        id,
        { projectionValues: { agentPreset } },
      ]),
    ),
  };
}

describe("presetOf", () => {
  it("reads the preset a Session records", () => {
    expect(presetOf({ projectionValues: { agentPreset: "pstack-auto" } })).toBe("pstack-auto");
  });

  it("ignores missing and malformed values", () => {
    expect(presetOf(undefined)).toBeUndefined();
    expect(presetOf({})).toBeUndefined();
    expect(presetOf({ projectionValues: {} })).toBeUndefined();
    expect(presetOf({ projectionValues: { agentPreset: 3 } })).toBeUndefined();
    expect(presetOf({ projectionValues: "pstack-auto" })).toBeUndefined();
  });
});

describe("announceableSession", () => {
  it("picks the newest Session running the experimental preset", () => {
    const state = sessions({ "01A": "poteto-mode", "01B": "pstack-auto", "01C": "pstack-auto" });
    expect(announceableSession(state, new Set())).toBe("01C");
  });

  it("returns nothing for Sessions on other presets", () => {
    expect(announceableSession(sessions({ "01A": "poteto-mode" }), new Set())).toBeUndefined();
    expect(announceableSession({ byId: {} }, new Set())).toBeUndefined();
  });

  it("skips a dismissed Session and falls back to the next one", () => {
    const state = sessions({ "01B": "pstack-auto", "01C": "pstack-auto" });
    expect(announceableSession(state, new Set(["01C"]))).toBe("01B");
    expect(announceableSession(state, new Set(["01B", "01C"]))).toBeUndefined();
  });
});

describe("parseDismissed", () => {
  it("reads the stored ids and tolerates junk", () => {
    expect([...parseDismissed('["01A","01B"]')]).toEqual(["01A", "01B"]);
    expect(parseDismissed(null).size).toBe(0);
    expect(parseDismissed("not json").size).toBe(0);
    expect(parseDismissed('{"id":"01A"}').size).toBe(0);
    expect([...parseDismissed('["01A",3,null]')]).toEqual(["01A"]);
  });
});

describe("withDismissed", () => {
  it("appends the Session id once", () => {
    expect(withDismissed(new Set(), "01A")).toEqual(["01A"]);
    expect(withDismissed(new Set(["01A"]), "01A")).toEqual(["01A"]);
  });

  it("keeps only the newest ids", () => {
    const dismissed = new Set(["01A", "01B"]);
    expect(withDismissed(dismissed, "01C", 2)).toEqual(["01B", "01C"]);
  });

  it("defaults to the storage cap", () => {
    const many = new Set(Array.from({ length: MAX_DISMISSED }, (_, index) => `id-${index}`));
    const next = withDismissed(many, "id-new");
    expect(next).toHaveLength(MAX_DISMISSED);
    expect(next.at(-1)).toBe("id-new");
  });
});
