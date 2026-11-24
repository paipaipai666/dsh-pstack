import { describe, expect, it } from "vite-plus/test";

import {
  catalogVersions,
  distTagVersion,
  fetchNextVersion,
  rewriteCatalog,
} from "../scripts/pin-dsh-version.mjs";

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

describe("resolve the next release", () => {
  it("reads the version from the dist-tags", () => {
    const packument = { "dist-tags": { latest: "0.2.2-rc.5", next: "0.2.3-alpha.7" } };
    expect(distTagVersion(packument, "next")).toBe("0.2.3-alpha.7");
  });

  it("reports a missing dist-tag instead of returning an empty version", () => {
    const packument = { "dist-tags": { latest: "0.2.2-rc.5" } };
    expect(() => distTagVersion(packument, "next")).toThrow(/has no next dist-tag/);
  });

  it("asks the registry for the package instead of running npm in the repo", async () => {
    const seen: string[] = [];
    const fetchImpl = async (url: string) => {
      seen.push(url);
      return { ok: true, json: async () => ({ "dist-tags": { next: "0.3.0-rc.1" } }) };
    };
    const version = await fetchNextVersion(fetchImpl);
    expect(version).toBe("0.3.0-rc.1");
    expect(seen).toEqual(["https://registry.npmjs.org/@deepseek-ai%2Fdsh"]);
  });

  it("surfaces a registry failure with its status", async () => {
    const fetchImpl = async () => ({ ok: false, status: 503, json: async () => ({}) });
    await expect(fetchNextVersion(fetchImpl)).rejects.toThrow(/registry answered 503/);
  });
});
