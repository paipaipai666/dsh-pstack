import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";

const ROOT = resolve(import.meta.dirname, "..");
const SUBMODULE = "upstream/cursor-plugins";
const PINNED_COMMIT = "ae5650febf4320793844c12c4adaa937f417f8da";
const PINNED_TREE = "01f772dbc8b837392df8edaeb4ffe8b7f41cac58";

function git(args: readonly string[], cwd = ROOT): string {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

describe("upstream pstack drift", () => {
  it("keeps the submodule commit pinned", () => {
    const row = git(["ls-tree", "HEAD", SUBMODULE]);
    const match = /^160000 commit ([0-9a-f]{40})\t/.exec(row);
    expect(match?.[1], row).toBe(PINNED_COMMIT);
  });

  it("keeps the checked-out tree hash pinned when the submodule is present", () => {
    const checkout = resolve(ROOT, SUBMODULE);
    if (!existsSync(resolve(checkout, "pstack", "package.json"))) return;
    expect(git(["rev-parse", "HEAD^{tree}"], checkout)).toBe(PINNED_TREE);
  });
});
