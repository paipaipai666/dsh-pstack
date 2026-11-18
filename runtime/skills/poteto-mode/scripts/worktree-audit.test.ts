import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { ageColumn, bucketFor, dirtyColumn, discoverSessions, formatSize, lastChatColumn, mergedColumn, prColumn, remoteColumn, renderTable, sizeColumn, sortRows, type AuditRow } from "./worktree-audit.ts";
import { expect } from "./support.ts";

const now = Date.UTC(2026, 9, 28, 12, 0, 0) / 1000;

// Windows has no POSIX shell here, so the script-shape tests only run where it exists.
const posixOnly = process.platform === "win32" ? test.skip : test;

test("renders the documented worktree columns", () => {
  const rows: AuditRow[] = [
    {
      size: "2.0G",
      age: "1d",
      merged: "YES",
      dirty: "clean",
      remote: "pushed",
      pr: "#12/OPEN",
      lastChat: "2026-10-28",
      bucket: "hold-open-pr",
      worktree: "/repo/wt-a",
    },
    {
      size: "10.0M",
      age: "10d",
      merged: "NO",
      dirty: "wip:2",
      remote: "ahead1",
      pr: "-",
      lastChat: "-",
      bucket: "hold-wip",
      worktree: "/repo/wt-b",
    },
  ];
  const table = renderTable(sortRows(rows), "origin/main");
  expect(table.split("\n")[0]).toBe("# base: origin/main");
  expect(table).toContain("SIZE\tAGE\tMERGED\tDIRTY\tREMOTE\tPR\tLAST_CHAT\tBUCKET\tWORKTREE");
  expect(table).toContain("/repo/wt-a");
  expect(table).toContain("/repo/wt-b");
});

test("classifies the individual columns", () => {
  expect(formatSize(2 * 1024 ** 3)).toBe("2.0G");
  expect(ageColumn(now - 86400, now)).toBe("1d");
  expect(dirtyColumn("")).toBe("clean");
  expect(dirtyColumn(" M a\n?? b\n")).toBe("wip:1");
  expect(dirtyColumn("?? b\n")).toBe("scratch:1");
  expect(mergedColumn(true)).toBe("YES");
  expect(mergedColumn(false)).toBe("no");
  expect(remoteColumn({ branch: "feature/x", hasRemote: true, remoteSha: "abc", head: "abc", aheadCount: 0 })).toBe("pushed");
  expect(remoteColumn({ branch: "feature/x", hasRemote: true, remoteSha: "abc", head: "def", aheadCount: 2 })).toBe("ahead2");
  expect(remoteColumn({ branch: "feature/x", hasRemote: false, remoteSha: undefined, head: "def", aheadCount: 2 })).toBe("no-remote");
  expect(remoteColumn({ branch: undefined, hasRemote: true, remoteSha: "abc", head: "abc", aheadCount: 0 })).toBe("detached");
  expect(prColumn("feature/x", [{ number: 12, head: "feature/x", state: "OPEN" }])).toBe("#12/OPEN");
  expect(lastChatColumn({ sessionId: "s-1", lastEventTime: Date.UTC(2026, 9, 27, 23, 30) / 1000 })).toBe("2026-10-27");
  expect(lastChatColumn({ sessionId: "s-1" })).toBe("-");
  expect(lastChatColumn(undefined)).toBe("-");
});

test("never marks an unknown usage signal safe", () => {
  expect(
    bucketFor({
      merged: "YES",
      dirty: "clean",
      pr: "-",
      usageKnown: false,
      usedRecently: false,
    }),
  ).toBe("unknown-usage");
  expect(
    bucketFor({
      merged: "YES",
      dirty: "clean",
      pr: "-",
      usageKnown: true,
      usedRecently: true,
    }),
  ).toBe("verify-recent-chat");
});

const sizeInBytes = (text: string): number => {
  const match = /^([\d.]+)([BKMGTP]?)$/.exec(text);
  if (match === null) throw new Error(`cannot read size ${text}`);
  const power = { "": 0, B: 0, K: 1, M: 2, G: 3, T: 4, P: 5 }[match[2] as string] ?? 0;
  return Number(match[1]) * 1024 ** power;
};

// Windows only lets an elevated process make a directory symlink, and every `du`-shaped
// path here goes through the shell helper the script ships.
posixOnly("counts a directory symlink as its own entry and never traverses it", () => {
  const root = mkdtempSync(join(tmpdir(), "worktree-audit-size-"));
  try {
    const external = join(root, "external");
    mkdirSync(external);
    writeFileSync(join(external, "big.bin"), Buffer.alloc(2 * 1024 * 1024, 1));
    const worktree = join(root, "worktree");
    mkdirSync(worktree);
    writeFileSync(join(worktree, "small.txt"), "small");
    symlinkSync(external, join(worktree, "external-link"), "dir");

    expect(sizeInBytes(sizeColumn(external)) >= 2 * 1024 * 1024).toBe(true);
    expect(sizeInBytes(sizeColumn(worktree)) < 1024 * 1024).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("auto-discovers sessions from DSH_HOME/sessions and DSH_LIVE_SESSIONS_JSON", () => {
  const home = mkdtempSync(join(tmpdir(), "worktree-audit-sessions-"));
  try {
    const sessionsDir = join(home, "sessions", "nested");
    mkdirSync(sessionsDir, { recursive: true });
    writeFileSync(
      join(sessionsDir, "s1.json"),
      JSON.stringify({
        header: { id: "s-1", cwd: "/repo/wt-a", createdAt: 1700000000000 },
        events: [{ time: 1700001000000 }],
      }),
    );
    writeFileSync(
      join(home, "sessions", "s2.jsonl"),
      [
        JSON.stringify({ id: "s-2", cwd: "/repo/wt-b", createdAt: 1700002000 }),
        JSON.stringify({ time: 1700003000 }),
      ].join("\n"),
    );

    const discovered = discoverSessions({
      dshHome: home,
      env: {
        DSH_LIVE_SESSIONS_JSON: JSON.stringify([
          { sessionId: "s-1", cwd: "/repo/wt-a", lastEventTime: 1700005000 },
          { sessionId: "s-3", cwd: "/repo/wt-c", lastEventTime: 1700004000 },
        ]),
      },
    });

    expect(discovered?.length).toBe(3);
    const byId = Object.fromEntries((discovered ?? []).map((s) => [s.sessionId, s]));
    expect(byId["s-1"]?.lastEventTime).toBe(1700005000);
    expect(byId["s-2"]?.lastEventTime).toBe(1700003000);
    expect(byId["s-3"]?.cwd).toBe("/repo/wt-c");
    expect(discoverSessions({ env: {} })).toBe(undefined);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
