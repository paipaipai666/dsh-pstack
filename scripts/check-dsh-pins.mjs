import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compareVersions } from "./check-version-bump.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CATALOG_LINE = /^\s*"(@deepseek-ai\/dsh-[^"]+)":\s*([^\s#]+)\s*$/;
const CI_INSTALL = /@deepseek-ai\/dsh@([0-9A-Za-z.-]+)/;
const AUDIT_ID = /dsh-([0-9A-Za-z.-]+)@pstack-/;
const ENGINE_FLOOR = /^\s*>=\s*([0-9A-Za-z.-]+)\s*$/;

export function parseCatalogVersion(text) {
  const seen = new Map();
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const match = CATALOG_LINE.exec(line);
    if (!match) continue;
    seen.set(match[1], match[2]);
  }
  const versions = [...new Set(seen.values())];
  if (versions.length === 0) throw new Error("no @deepseek-ai/dsh-* entries found in the catalog");
  if (versions.length > 1) {
    throw new Error(`the catalog must pin one version, found ${versions.join(", ")}`);
  }
  return versions[0];
}

export function parseCIInstallVersion(text) {
  const match = CI_INSTALL.exec(String(text ?? ""));
  if (!match) throw new Error("no `@deepseek-ai/dsh@<version>` install found in the workflows");
  return match[1];
}

export function parseAuditBaseline(lock) {
  const id = String(lock?.baseline?.id ?? "");
  const match = AUDIT_ID.exec(id);
  if (!match) throw new Error("the audit baseline id does not name a DSH version");
  return match[1];
}

export function parseEnginesFloor(pkg) {
  const raw = String(pkg?.engines?.dsh ?? "").trim();
  const match = ENGINE_FLOOR.exec(raw);
  if (!match)
    throw new Error(`engines.dsh must look like ">=<version>", found ${JSON.stringify(raw)}`);
  return match[1];
}

export function checkPins({ catalog, ci, audit, auditDoc, engines }) {
  const problems = [];
  if (ci !== catalog) {
    problems.push(
      `.github/workflows/ci.yml installs DSH ${ci} but pnpm-workspace.yaml builds against ${catalog}; the types we compile and the runtime we verify must be the same release`,
    );
  }
  if (audit !== catalog) {
    problems.push(
      `port/audit.lock.json records a baseline of DSH ${audit} but the catalog pins ${catalog}; re-audit against the version we build`,
    );
  }
  if (!String(auditDoc ?? "").includes(audit)) {
    problems.push(`port/audit.md does not mention the audited DSH version ${audit}`);
  }
  if (compareVersions(engines, catalog) > 0) {
    problems.push(
      `package.json engines.dsh requires >=${engines}, which is newer than the ${catalog} we build and verify against; the floor must not exceed the pinned version`,
    );
  }
  return { ok: problems.length === 0, problems };
}

function read(rel) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function main() {
  const catalogText = read("pnpm-workspace.yaml");
  const ciText = [".github/workflows/ci.yml", ".github/workflows/release.yml"]
    .map((rel) => {
      try {
        return read(rel);
      } catch {
        return "";
      }
    })
    .join("\n");
  const lock = JSON.parse(read("port/audit.lock.json"));
  const pkg = JSON.parse(read("package.json"));
  const auditDoc = read("port/audit.md");

  const verdict = checkPins({
    catalog: parseCatalogVersion(catalogText),
    ci: parseCIInstallVersion(ciText),
    audit: parseAuditBaseline(lock),
    auditDoc,
    engines: parseEnginesFloor(pkg),
  });
  if (verdict.ok) {
    console.log("dsh pins: catalog, CI install, audit baseline, and engine floor agree");
    return;
  }
  for (const problem of verdict.problems) console.error(`dsh pins: ${problem}`);
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
