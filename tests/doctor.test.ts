import { describe, expect, it } from "vite-plus/test";

import { collectDoctorReport, createPstackDoctorTool } from "../src/doctor.ts";

const host = {
  dshHome: "/tmp/dsh-home",
  runCommand: (command: string) => (command === "git" ? "git version 2.51.0" : undefined),
  exists: (path: string) => path.endsWith(".mjs") || path.endsWith("pstack-models.mdc"),
};

describe("pstack_doctor", () => {
  it("reports installed and missing commands without throwing", () => {
    const report = collectDoctorReport(host);
    const git = report.commands.find((command) => command.name === "git");
    const gh = report.commands.find((command) => command.name === "gh");
    expect(git).toMatchObject({ ok: true, version: "git version 2.51.0" });
    expect(gh).toMatchObject({ ok: false });
    expect(report.scripts.every((script) => script.ok)).toBe(true);
    expect(report.roleFile.exists).toBe(true);
  });

  it("returns the same report from the tool", async () => {
    const tool = createPstackDoctorTool(host);
    const result = (await tool.execute(
      {},
      { signal: new AbortController().signal } as never,
    )) as ReturnType<typeof collectDoctorReport>;
    expect(result.platform).toBe(process.platform);
    expect(result.commands).toHaveLength(6);
    expect(result.scripts).toHaveLength(5);
  });
});
