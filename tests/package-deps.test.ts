import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vite-plus/test";

/**
 * A DSH profile already provides the host runtime. Declaring a host package as a
 * runtime dependency installs a second, version-pinned copy into the profile; that
 * copy can serve the host's routes (agent presets among them) while the app itself
 * has moved on, so the client asks for a route the stale copy never registers.
 * Only packages this plugin imports as values, and that the host does not provide
 * as a service, may stay listed.
 */
const HOST_RUNTIME_ALLOWED = new Set(["@deepseek-ai/schemastery"]);

const MANIFEST = join(fileURLToPath(new URL("..", import.meta.url)), "package.json");

function runtimeHostPackages(): string[] {
  const manifest = readFileSync(MANIFEST, "utf8");
  const { dependencies = {} } = JSON.parse(manifest) as {
    dependencies?: Record<string, string>;
  };
  return Object.keys(dependencies)
    .filter((name) => name.startsWith("@deepseek-ai/") && !HOST_RUNTIME_ALLOWED.has(name))
    .sort();
}

describe("package manifest", () => {
  it("keeps host runtime packages out of dependencies", () => {
    expect(runtimeHostPackages()).toEqual([]);
  });
});
