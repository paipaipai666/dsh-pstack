import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";

import { PACKAGE_NAME } from "../src/package-name.ts";
import { REMOTE_PACKAGE } from "../src/role-remote.ts";

const ROOT = join(import.meta.dirname, "..");

function manifestName(): string {
  const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { name: string };
  return manifest.name;
}

describe("package identity", () => {
  it("keeps the published name single-sourced", () => {
    expect(PACKAGE_NAME).toBe(manifestName());
  });

  it("names the same package in the composition patch", () => {
    // The composition mounts this package by name; a banner id that disagrees
    // makes the client bundle register twice and the loader rejects it.
    const patch = readFileSync(join(ROOT, "cordis.patch.yml"), "utf8");
    expect(patch).toContain(`name: "${PACKAGE_NAME}"`);
  });

  it("owns the remote invocation descriptors under the same name", () => {
    expect(REMOTE_PACKAGE).toBe(PACKAGE_NAME);
  });

  it("registers the client bundle under the package name", () => {
    // A bare id here made the Desktop loader execute the same bundle twice and
    // abort the boot with `duplicate factory registration`.
    const bundlePath = join(ROOT, "dist", "client.js");
    if (!existsSync(bundlePath))
      throw new Error(`${bundlePath} is missing; run \`vp run build\` first`);
    const head = readFileSync(bundlePath, "utf8").slice(0, 200);
    expect(head).toContain(`id: ${JSON.stringify(PACKAGE_NAME)}`);
  });
});
