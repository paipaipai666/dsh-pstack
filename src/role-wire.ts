/** Wire shapes shared by the role settings Host service and Client page. */

import {
  INHERIT_ALIASES,
  isRoleKey,
  ROLE_SHAPES,
  type InheritAlias,
  type RoleShape,
} from "./role-manifest.ts";
import { validateRouteParts, type Route } from "./route.ts";
import { WireTypeError } from "./wire-error.ts";

export type { CatalogueResult } from "./catalogue.ts";
export type { BudgetApplyRequest } from "./budget.ts";
export { parseBudgetApplyRequest } from "./budget.ts";
export { parseCatalogueResult } from "./catalogue.ts";
export { WireTypeError } from "./wire-error.ts";
export type { InheritAlias } from "./role-manifest.ts";

export type RouteView = Route;

export interface RoleView {
  readonly key: string;
  readonly shape: RoleShape;
  readonly configured: boolean;
  readonly line?: number;
  readonly routes: readonly RouteView[];
  readonly issues: readonly string[];
}

export interface RoleFileIssueView {
  readonly line?: number;
  readonly message: string;
}

export interface RoleFileSnapshot {
  readonly path: string;
  readonly status: "missing" | "loaded" | "unreadable";
  readonly reason?: string;
  readonly budget?: string;
  readonly roles: readonly RoleView[];
  readonly issues: readonly RoleFileIssueView[];
  readonly canSave: boolean;
}

export interface SaveRoleRequest {
  readonly key: string;
  readonly routes: readonly RouteView[];
}

export type SaveRoleResult =
  | { readonly ok: true; readonly snapshot: RoleFileSnapshot }
  | { readonly ok: false; readonly reason: string };

export type BudgetApplyResult =
  | { readonly ok: true; readonly snapshot: RoleFileSnapshot }
  | { readonly ok: false; readonly reason: string };

function parseRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new WireTypeError(path, "an object");
  }
  return value as Record<string, unknown>;
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string | undefined {
  const value = record[key];
  if (value !== undefined && typeof value !== "string") {
    throw new WireTypeError(`${path}.${key}`, "a string when present");
  }
  return value as string | undefined;
}

function parseRouteView(value: unknown, path: string): RouteView {
  const record = parseRecord(value, path);
  if (record["kind"] === "inherit") {
    const alias = record["alias"] ?? "inherit-parent";
    if (typeof alias !== "string" || !(INHERIT_ALIASES as readonly string[]).includes(alias)) {
      throw new WireTypeError(`${path}.alias`, '"inherit-parent" or "auto"');
    }
    return { kind: "inherit", alias: alias as InheritAlias };
  }
  if (record["kind"] !== "route") throw new WireTypeError(`${path}.kind`, '"route" or "inherit"');
  const provider = record["provider"];
  const model = record["model"];
  const effort = record["effort"];
  if (typeof provider !== "string" || provider.trim() === "") {
    throw new WireTypeError(`${path}.provider`, "a non-empty string");
  }
  if (typeof model !== "string" || model.trim() === "") {
    throw new WireTypeError(`${path}.model`, "a non-empty string");
  }
  if (effort !== undefined && (typeof effort !== "string" || effort.trim() === "")) {
    throw new WireTypeError(`${path}.effort`, "a non-empty string when present");
  }
  const providerValue = provider.trim();
  const modelValue = model.trim();
  const effortValue = typeof effort === "string" ? effort.trim() : undefined;
  const issue = validateRouteParts(providerValue, modelValue, effortValue);
  if (issue !== undefined) throw new WireTypeError(path, issue);
  return {
    kind: "route",
    provider: providerValue,
    model: modelValue,
    ...(effortValue === undefined ? {} : { effort: effortValue }),
  };
}

/** Parse one save request. An empty route list removes the role line. */
export function parseSaveRoleRequest(value: unknown): SaveRoleRequest {
  const record = parseRecord(value, "request");
  if (typeof record["key"] !== "string" || record["key"].trim() === "") {
    throw new WireTypeError("request.key", "a non-empty string");
  }
  if (!Array.isArray(record["routes"])) {
    throw new WireTypeError("request.routes", "an array");
  }
  return {
    key: record["key"],
    routes: record["routes"].map((route, index) =>
      parseRouteView(route, `request.routes[${index}]`),
    ),
  };
}

function parseRoleFileIssue(value: unknown, path: string): RoleFileIssueView {
  const record = parseRecord(value, path);
  if (typeof record["message"] !== "string") {
    throw new WireTypeError(`${path}.message`, "a string");
  }
  const line = record["line"];
  if (line !== undefined && typeof line !== "number") {
    throw new WireTypeError(`${path}.line`, "a number when present");
  }
  return { ...(typeof line === "number" ? { line } : {}), message: record["message"] };
}

function parseRoleView(value: unknown, index: number): RoleView {
  const path = `snapshot.roles[${index}]`;
  const record = parseRecord(value, path);
  if (typeof record["key"] !== "string" || !isRoleKey(record["key"])) {
    throw new WireTypeError(`${path}.key`, "a role in the manifest");
  }
  if (
    typeof record["shape"] !== "string" ||
    !(ROLE_SHAPES as readonly string[]).includes(record["shape"])
  ) {
    throw new WireTypeError(`${path}.shape`, '"single" or "list"');
  }
  if (typeof record["configured"] !== "boolean") {
    throw new WireTypeError(`${path}.configured`, "a boolean");
  }
  if (!Array.isArray(record["routes"]) || !Array.isArray(record["issues"])) {
    throw new WireTypeError(path, "routes and issues arrays");
  }
  const line = record["line"];
  if (line !== undefined && typeof line !== "number") {
    throw new WireTypeError(`${path}.line`, "a number when present");
  }
  return {
    key: record["key"],
    shape: record["shape"] as RoleShape,
    configured: record["configured"],
    ...(typeof line === "number" ? { line } : {}),
    routes: record["routes"].map((route, routeIndex) =>
      parseRouteView(route, `${path}.routes[${routeIndex}]`),
    ),
    issues: record["issues"].map((issue, issueIndex) => {
      if (typeof issue !== "string") {
        throw new WireTypeError(`${path}.issues[${issueIndex}]`, "a string");
      }
      return issue;
    }),
  };
}

/** Parse one role-file snapshot returned by the Host. */
export function parseRoleFileSnapshot(value: unknown): RoleFileSnapshot {
  const record = parseRecord(value, "snapshot");
  const status = record["status"];
  if (status !== "missing" && status !== "loaded" && status !== "unreadable") {
    throw new WireTypeError("snapshot.status", '"missing", "loaded", or "unreadable"');
  }
  if (typeof record["path"] !== "string") {
    throw new WireTypeError("snapshot.path", "a string");
  }
  if (typeof record["canSave"] !== "boolean") {
    throw new WireTypeError("snapshot.canSave", "a boolean");
  }
  if (!Array.isArray(record["roles"]) || !Array.isArray(record["issues"])) {
    throw new WireTypeError("snapshot", "roles and issues arrays");
  }
  const reason = optionalString(record, "reason", "snapshot");
  const budget = optionalString(record, "budget", "snapshot");
  return {
    path: record["path"],
    status,
    ...(typeof reason === "string" ? { reason } : {}),
    ...(typeof budget === "string" ? { budget } : {}),
    roles: record["roles"].map((role, index) => parseRoleView(role, index)),
    issues: record["issues"].map((issue, index) =>
      parseRoleFileIssue(issue, `snapshot.issues[${index}]`),
    ),
    canSave: record["canSave"],
  };
}

function parseSnapshotResult(value: unknown): SaveRoleResult {
  const record = parseRecord(value, "result");
  if (record["ok"] === true)
    return { ok: true, snapshot: parseRoleFileSnapshot(record["snapshot"]) };
  if (record["ok"] === false && typeof record["reason"] === "string") {
    return { ok: false, reason: record["reason"] };
  }
  throw new WireTypeError("result", "a successful snapshot or a refusal reason");
}

/** Parse one role-save result returned by the Host. */
export function parseSaveRoleResult(value: unknown): SaveRoleResult {
  return parseSnapshotResult(value);
}

/** Parse one budget-apply result returned by the Host. */
export function parseBudgetApplyResult(value: unknown): BudgetApplyResult {
  return parseSnapshotResult(value);
}
