import { describe, expect, it } from "vite-plus/test";
import {
  isAllowedComment,
  isComment,
  isGatedPath,
  isTestPath,
  parseAddedComments,
} from "../scripts/check-comments.mjs";

describe("comment gate", () => {
  it("detects line and block comments", () => {
    expect(isComment("// why this exists")).toBe(true);
    expect(isComment("/* block */")).toBe(true);
    expect(isComment(" * continuation")).toBe(true);
    expect(isComment("const value = 1;")).toBe(false);
    expect(isComment("https://example.com")).toBe(false);
  });

  it("keeps machine directives", () => {
    expect(isAllowedComment("// eslint-disable-next-line no-console")).toBe(true);
    expect(isAllowedComment("// @ts-expect-error")).toBe(true);
    expect(isAllowedComment('/// <reference types="node" />')).toBe(true);
    expect(isAllowedComment("// this restates the next line")).toBe(false);
  });

  it("gates source files but not tests", () => {
    expect(isGatedPath("src/subagent.ts")).toBe(true);
    expect(isGatedPath("scripts/check-comments.mjs")).toBe(true);
    expect(isTestPath("tests/subagent.test.ts")).toBe(true);
    expect(isGatedPath("tests/subagent.test.ts")).toBe(false);
    expect(isGatedPath("README.md")).toBe(false);
  });

  it("counts added comments against the new line numbers", () => {
    const diff = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -3,2 +3,3 @@",
      " const a = 1;",
      "+// explains nothing",
      "+const b = 2;",
      "diff --git a/tests/a.test.ts b/tests/a.test.ts",
      "--- a/tests/a.test.ts",
      "+++ b/tests/a.test.ts",
      "@@ -1,0 +1,1 @@",
      "+// tests may explain intent",
    ].join("\n");
    expect(parseAddedComments(diff)).toEqual([
      { file: "src/a.ts", line: 4, text: "// explains nothing" },
    ]);
  });

  it("ignores deleted comments", () => {
    const diff = [
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -10,2 +10,1 @@",
      "-// stale note",
      " const a = 1;",
    ].join("\n");
    expect(parseAddedComments(diff)).toEqual([]);
  });
});
