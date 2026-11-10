/**
 * `$DSH_HOME/pstack-models.mdc` reader and route selector.
 *
 * The role file is read again on every delegation. Missing, unreadable, and
 * loaded-with-issues are distinct states: a missing file means every role
 * inherits the parent route, while an unreadable file must fail loudly instead
 * of silently behaving like a fresh install.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import { parseRoleFileDocument, type RoleEntry, type RoleFileIssue } from "./role-file.ts";
import { PSTACK_MODELS_FILENAME, ROLE_MANIFEST, findRole, type RoleSpec } from "./role-manifest.ts";
import type { Route } from "./route.ts";

export type { RoleEntry, RoleFileIssue } from "./role-file.ts";
export type { Route } from "./route.ts";

/** Parsed role-file state. */
export type RoleConfiguration =
  | { readonly status: "missing"; readonly path: string }
  | { readonly status: "unreadable"; readonly path: string; readonly reason: string }
  | {
      readonly status: "loaded";
      readonly path: string;
      readonly budget?: string;
      readonly roles: ReadonlyMap<string, RoleEntry>;
      readonly issues: readonly RoleFileIssue[];
    };

/** Absolute role-file path for one DSH home. */
export function modelsFilePath(dshHome: string): string {
  return join(dshHome, PSTACK_MODELS_FILENAME);
}

/** Resolve `$DSH_HOME`: environment first, then `~/.dsh`. */
export function resolveDshHome(
  env: Readonly<Record<string, string | undefined>> = process.env,
  home: string = homedir(),
): string {
  const raw = env["DSH_HOME"]?.trim();
  const path = raw === undefined || raw === "" ? join(home, ".dsh") : raw;
  const expanded =
    path === "~"
      ? home
      : path.startsWith("~/") || path.startsWith("~\\")
        ? join(home, path.slice(2))
        : path;
  return resolve(expanded);
}

/** Read the role file without throwing for a missing path. */
export function readRoleConfiguration(path: string): RoleConfiguration {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    if (isMissingFile(error)) return { status: "missing", path };
    return { status: "unreadable", path, reason: describeError(error) };
  }
  return parseRoleConfiguration(text, path);
}

/** Parse role-file text. Pure: no filesystem access. */
export function parseRoleConfiguration(text: string, path: string): RoleConfiguration {
  const document = parseRoleFileDocument(text, path);
  return {
    status: "loaded",
    path,
    ...(document.budget === undefined ? {} : { budget: document.budget }),
    roles: document.roles,
    issues: document.issues,
  };
}

/** How one role expands into children. */
export type RouteSelectionMode = "single" | "panel" | "selected";

export interface RouteSelection {
  readonly role: RoleSpec;
  readonly mode: RouteSelectionMode;
  readonly configured: boolean;
  readonly routes: readonly Route[];
  readonly total: number;
  readonly roleIndex?: number;
}

/** Resolve one role into the routes this call starts. */
export function selectRoutes(
  spec: RoleSpec,
  entry: RoleEntry | undefined,
  roleIndex: number | undefined,
): RouteSelection {
  if (spec.shape === "single" && roleIndex !== undefined) {
    throw new Error(`role "${spec.key}" holds a single route, so \`roleIndex\` does not apply`);
  }
  if (spec.autoPanel && roleIndex !== undefined) {
    throw new Error(
      `role "${spec.key}" is an automatic panel: it starts one child per entry, so \`roleIndex\` does not apply`,
    );
  }
  if (entry === undefined) {
    return {
      role: spec,
      mode: spec.autoPanel ? "panel" : "single",
      configured: false,
      routes: [{ kind: "inherit", alias: "inherit-parent" }],
      total: 1,
    };
  }
  if (entry.issues.length > 0) {
    throw new Error(
      `role "${spec.key}" has invalid configuration on line ${entry.line}: ${entry.issues.join("; ")}`,
    );
  }
  if (spec.autoPanel) {
    return {
      role: spec,
      mode: "panel",
      configured: true,
      routes: entry.routes,
      total: entry.routes.length,
    };
  }
  if (spec.shape === "list") {
    const index = roleIndex ?? 0;
    const route = entry.routes[index];
    if (route === undefined) {
      throw new Error(
        `role "${spec.key}" has ${entry.routes.length} entries, so \`roleIndex\` ${index} is out of range`,
      );
    }
    return {
      role: spec,
      mode: "selected",
      configured: true,
      routes: [route],
      total: entry.routes.length,
      roleIndex: index,
    };
  }
  const route = entry.routes[0];
  if (route === undefined) throw new Error(`role "${spec.key}" has no route`);
  return { role: spec, mode: "single", configured: true, routes: [route], total: 1 };
}

/** Resolve an exact role key or throw a diagnostic that lists the manifest. */
export function requireRole(raw: string): RoleSpec {
  const spec = findRole(raw);
  if (spec !== undefined) return spec;
  throw new Error(
    `unknown pstack role ${JSON.stringify(raw)}; role names come from the pstack role manifest, not free text. Known roles: ${ROLE_MANIFEST.map((role) => JSON.stringify(role.key)).join(", ")}`,
  );
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "ENOENT"
  );
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
