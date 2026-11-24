import { describe, expect, it } from "vite-plus/test";

import { renderMetrics, sizeBucket, summarizePRs } from "../scripts/review-metrics.mjs";

function pr(overrides: Record<string, unknown>) {
  return {
    number: 1,
    title: "a change",
    state: "MERGED",
    headRefName: "auto/issue-1",
    createdAt: "2026-11-01T00:00:00Z",
    mergedAt: "2026-11-01T02:00:00Z",
    closedAt: "2026-11-01T02:00:00Z",
    additions: 10,
    deletions: 5,
    ...overrides,
  };
}

describe("review metrics", () => {
  it("separates automated pull requests from human ones", () => {
    const metrics = summarizePRs([
      pr({ number: 1, state: "MERGED" }),
      pr({ number: 2, state: "MERGED", mergedAt: "2026-11-02T02:00:00Z" }),
      pr({ number: 3, state: "CLOSED", mergedAt: null, closedAt: "2026-11-03T00:00:00Z" }),
      pr({ number: 4, state: "MERGED", headRefName: "fix/human" }),
    ]);

    expect(metrics.automated.total).toBe(3);
    expect(metrics.automated.merged).toBe(2);
    expect(metrics.automated.rejected).toBe(1);
    expect(metrics.automated.mergeRate).toBeCloseTo(2 / 3, 5);
    expect(metrics.human.total).toBe(1);
    expect(metrics.human.mergeRate).toBe(1);
  });

  it("reports the median hours to merge and ignores the ones that never merged", () => {
    const metrics = summarizePRs([
      pr({ number: 1, createdAt: "2026-11-01T00:00:00Z", mergedAt: "2026-11-01T01:00:00Z" }),
      pr({ number: 2, createdAt: "2026-11-01T00:00:00Z", mergedAt: "2026-11-01T05:00:00Z" }),
      pr({ number: 3, createdAt: "2026-11-01T00:00:00Z", mergedAt: "2026-11-01T09:00:00Z" }),
      pr({ number: 4, state: "CLOSED", mergedAt: null }),
    ]);

    expect(metrics.automated.medianHoursToMerge).toBe(5);
  });

  it("counts reverts against the merged pull requests", () => {
    const metrics = summarizePRs([
      pr({ number: 1, title: 'Revert "feat: narrow review"' }),
      pr({ number: 2, title: "feat: something else" }),
      pr({ number: 3, state: "CLOSED", mergedAt: null }),
    ]);

    expect(metrics.reverts).toBe(1);
    expect(metrics.revertRate).toBeCloseTo(0.5, 5);
  });

  it("buckets pull requests by the size of the diff", () => {
    expect(sizeBucket(3)).toBe("small");
    expect(sizeBucket(50)).toBe("small");
    expect(sizeBucket(51)).toBe("medium");
    expect(sizeBucket(500)).toBe("medium");
    expect(sizeBucket(501)).toBe("large");

    const metrics = summarizePRs([
      pr({ number: 1, additions: 5, deletions: 5 }),
      pr({ number: 2, additions: 400, deletions: 0 }),
      pr({ number: 3, additions: 900, deletions: 10, headRefName: "fix/human" }),
    ]);

    const small = metrics.buckets.find((bucket) => bucket.name === "small") ?? {
      name: "small",
      automated: -1,
      human: -1,
    };
    const large = metrics.buckets.find((bucket) => bucket.name === "large") ?? {
      name: "large",
      automated: -1,
      human: -1,
    };
    expect(small.automated).toBe(1);
    expect(small.human).toBe(0);
    expect(large.automated).toBe(0);
    expect(large.human).toBe(1);
  });

  it("renders a table that names its own limits", () => {
    const text = renderMetrics(
      summarizePRs([
        pr({ number: 1 }),
        pr({ number: 2, state: "CLOSED", mergedAt: null }),
        pr({ number: 3, headRefName: "fix/human", additions: 800, deletions: 40 }),
      ]),
    );

    expect(text).toContain("| automated | 2 |");
    expect(text).toContain("| human | 1 |");
    expect(text).toContain("small");
    expect(text).toContain("does not tell you");
  });
});
