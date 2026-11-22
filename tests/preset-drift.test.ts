import { gzipSync } from "node:zlib";

import { describe, expect, it } from "vite-plus/test";

import {
  fetchPresetTarball,
  findPresetDrift,
  latestPresetFixture,
  presetsFromTarball,
} from "../scripts/preset-drift.mjs";

const FIXTURE = [
  "preset:",
  "  groups:",
  "    session:",
  "      rows:",
  "        - id: present",
  "          name: '@deepseek-ai/dsh-tool-present'",
  "",
].join("\n");

/** Minimal ustar archive, enough for the paths an npm tarball carries. */
function tarHeader(name: string, size: number): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, "utf8");
  header.write("0000644\0", 100, "utf8");
  header.write("0000000\0", 108, "utf8");
  header.write("0000000\0", 116, "utf8");
  header.write(`${size.toString(8).padStart(11, "0")}\0`, 124, "utf8");
  header.write("00000000000\0", 136, "utf8");
  header.fill(0x20, 148, 156);
  header.write("0", 156, "utf8");
  header.write("ustar\0", 257, "utf8");
  header.write("00", 263, "utf8");
  return header;
}

function tarball(files: Record<string, string>): Buffer {
  const blocks: Buffer[] = [];
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text, "utf8");
    blocks.push(
      tarHeader(name, data.length),
      data,
      Buffer.alloc((512 - (data.length % 512)) % 512),
    );
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

describe("preset drift", () => {
  it("treats quote style, CRLF, and trailing whitespace as the same preset", () => {
    const vendor = FIXTURE.replace(
      "'@deepseek-ai/dsh-tool-present'",
      '"@deepseek-ai/dsh-tool-present"',
    )
      .replace(/\n/g, "\r\n")
      .concat("   \r\n");

    expect(findPresetDrift(FIXTURE, vendor)).toEqual({ equal: true, additions: [], removals: [] });
  });

  it("reports a row the vendored fixture does not know about", () => {
    const vendor = FIXTURE.replace(
      "        - id: present",
      [
        "        - id: tool-office",
        "          name: '@deepseek-ai/dsh-tool-office'",
        "        - id: present",
      ].join("\n"),
    );

    expect(findPresetDrift(FIXTURE, vendor)).toEqual({
      equal: false,
      additions: ["- id: tool-office", 'name: "@deepseek-ai/dsh-tool-office"'],
      removals: [],
    });
  });

  it("reports a row the fixture carries but the shipped preset dropped", () => {
    const vendor = FIXTURE.replace("        - id: present\n", "");

    expect(findPresetDrift(FIXTURE, vendor)).toEqual({
      equal: false,
      additions: [],
      removals: ["- id: present"],
    });
  });

  it("picks the newest fixture directory instead of the last one listed", () => {
    expect(
      latestPresetFixture(["dsh-0.2.2-rc.1", "dsh-0.2.2-rc.10", "dsh-0.2.2-rc.5", "fixtures"]),
    ).toBe("dsh-0.2.2-rc.10");
    expect(latestPresetFixture(["fixtures"])).toBeUndefined();
  });

  it("reads the preset files out of a shipped npm tarball", () => {
    const archive = tarball({
      "package/package.json": '{"name":"@deepseek-ai/dsh-web-app"}',
      "package/presets/standard.patch.yml": FIXTURE,
      "package/presets/cordis.patch.yml": FIXTURE.replace("present", "tool-cordis"),
    });

    expect(presetsFromTarball(archive)).toEqual({
      standard: FIXTURE,
      cordis: FIXTURE.replace("present", "tool-cordis"),
    });
  });

  it("fails when the tarball does not carry a preset", () => {
    expect(() => presetsFromTarball(tarball({ "package/package.json": "{}" }))).toThrow(
      /presets\/standard\.patch\.yml/,
    );
  });

  it("downloads the tarball the fixture version was cut from", async () => {
    const archive = tarball({
      "package/package.json": '{"name":"@deepseek-ai/dsh-web-app"}',
      "package/presets/standard.patch.yml": FIXTURE,
      "package/presets/cordis.patch.yml": FIXTURE.replace("present", "tool-cordis"),
    });
    const urls: string[] = [];

    const fetched = await fetchPresetTarball("@deepseek-ai/dsh-web-app@0.2.2-rc.5", async (url) => {
      urls.push(url);
      return new Response(new Uint8Array(archive));
    });

    expect(urls).toEqual([
      "https://registry.npmjs.org/@deepseek-ai/dsh-web-app/-/dsh-web-app-0.2.2-rc.5.tgz",
    ]);
    expect(presetsFromTarball(fetched).standard).toBe(FIXTURE);
  });

  it("surfaces the status when the registry has no such tarball", async () => {
    await expect(
      fetchPresetTarball(
        "@deepseek-ai/dsh-web-app@9.9.9",
        async () => new Response("", { status: 404 }),
      ),
    ).rejects.toThrow(/404/);
  });
});
