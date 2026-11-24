import { describe, expect, it } from "vite-plus/test";

import { catalogVersions, rewriteCatalog } from "../scripts/pin-dsh-version.mjs";

const catalog = [
  "catalogs:",
  "  types:",
  '    "@deepseek-ai/dsh-agent": 0.2.2-rc.5',
  '    "@deepseek-ai/dsh-llm": 0.2.2-rc.5',
  "    zod: 4.6.6",
  "  runtime:",
  '    "@deepseek-ai/dsh-session": 0.2.2-rc.5',
  "",
].join("\n");

describe("pin the dsh version", () => {
  it("lists every dsh version the catalog pins", () => {
    expect(catalogVersions(catalog)).toEqual(["0.2.2-rc.5"]);
  });

  it("rewrites every dsh entry to the requested version", () => {
    const next = rewriteCatalog(catalog, "0.2.3-alpha.2");
    expect(next).toContain('"@deepseek-ai/dsh-agent": 0.2.3-alpha.2');
    expect(next).toContain('"@deepseek-ai/dsh-session": 0.2.3-alpha.2');
    expect(catalogVersions(next)).toEqual(["0.2.3-alpha.2"]);
  });

  it("leaves packages that are not dsh alone", () => {
    const next = rewriteCatalog(catalog, "0.2.3-alpha.2");
    expect(next).toContain("zod: 4.6.6");
    expect(next).toContain("catalogs:");
    expect(next).toContain("  runtime:");
  });
});
