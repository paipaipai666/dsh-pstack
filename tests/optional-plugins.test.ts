import { describe, expect, it } from "vite-plus/test";

import { OPTIONAL_PLUGINS } from "../src/optional-plugins.ts";

describe("optional plugin catalogue", () => {
  it("lists the rc.2 Agent Teams packages without the retired profile bundle", () => {
    const row = OPTIONAL_PLUGINS.find((plugin) => plugin.id === "OPT-08");

    expect(row).toMatchObject({
      packages: ["@deepseek-ai/dsh-agent-team", "@deepseek-ai/dsh-tool-agent-team"],
      conflict: true,
      switchable: false,
    });
    expect(row?.bundle).toBeUndefined();
  });
});
