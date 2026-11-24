import { describe, expect, it } from "vite-plus/test";

import {
  checkPins,
  parseAuditBaseline,
  parseCatalogVersion,
  parseCIInstallVersion,
  parseEnginesFloor,
} from "../scripts/check-dsh-pins.mjs";

const catalog = `
catalogs:
  types:
    "@deepseek-ai/dsh-agent": 0.2.2-rc.5
    "@deepseek-ai/dsh-llm": 0.2.2-rc.5
  runtime:
    "@deepseek-ai/dsh-base": 0.2.2-rc.5
`;

const lock = { baseline: { id: "dsh-0.2.2-rc.5@pstack-0b46ec3" } };

describe("dsh pins", () => {
  it("reads one catalog version across types and runtime", () => {
    expect(parseCatalogVersion(catalog)).toBe("0.2.2-rc.5");
  });

  it("refuses a catalog that pins two versions", () => {
    const mixed = catalog.replace(
      '"@deepseek-ai/dsh-llm": 0.2.2-rc.5',
      '"@deepseek-ai/dsh-llm": 0.2.2-rc.3',
    );
    expect(() => parseCatalogVersion(mixed)).toThrow(/one version/i);
  });

  it("reads the version CI installs and the audit baseline", () => {
    expect(parseCIInstallVersion('run: npm install -g "@deepseek-ai/dsh@0.2.2-rc.5"')).toBe(
      "0.2.2-rc.5",
    );
    expect(parseAuditBaseline(lock)).toBe("0.2.2-rc.5");
  });

  it("reads the engine floor", () => {
    expect(parseEnginesFloor({ engines: { dsh: ">=0.2.2-rc.2" } })).toBe("0.2.2-rc.2");
  });

  it("accepts pins that agree", () => {
    const verdict = checkPins({
      catalog: "0.2.2-rc.5",
      ci: "0.2.2-rc.5",
      audit: "0.2.2-rc.5",
      auditDoc: "基线 `dsh-0.2.2-rc.5`",
      engines: "0.2.2-rc.2",
    });
    expect(verdict.ok).toBe(true);
    expect(verdict.problems).toEqual([]);
  });

  it("names the files that disagree", () => {
    const verdict = checkPins({
      catalog: "0.2.2-rc.5",
      ci: "0.2.2-rc.3",
      audit: "0.2.2-rc.5",
      auditDoc: "基线 `dsh-0.2.2-rc.5`",
      engines: "0.2.2-rc.2",
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join("\n")).toContain(".github/workflows/ci.yml");
    expect(verdict.problems.join("\n")).toContain("0.2.2-rc.3");
  });

  it("flags an engine floor above what we build against", () => {
    const verdict = checkPins({
      catalog: "0.2.2-rc.5",
      ci: "0.2.2-rc.5",
      audit: "0.2.2-rc.5",
      auditDoc: "基线 `dsh-0.2.2-rc.5`",
      engines: "0.2.3-rc.1",
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.problems.join("\n")).toContain("engines.dsh");
  });
});
