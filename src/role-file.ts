/** The parsed line model behind the role file and its editor. */

import { budgetLineValue } from "./budget.ts";
import { findRole, normalizeRoleName, type RoleSpec } from "./role-manifest.ts";
import { parseRouteValue, validateRoleRouteShape, type Route } from "./route.ts";

/** One recognized role line. */
export interface RoleEntry {
  readonly line: number;
  readonly key: string;
  readonly spec: RoleSpec;
  readonly routes: readonly Route[];
  readonly issues: readonly string[];
}

/** A file-level issue. Unknown and malformed lines are reported, never dropped. */
export interface RoleFileIssue {
  readonly line?: number;
  readonly message: string;
}

/** One physical line, classified once for parsing and editing. */
export type RoleFileLine =
  | { readonly kind: "blank"; readonly line: number; readonly raw: string }
  | { readonly kind: "comment"; readonly line: number; readonly raw: string }
  | {
      readonly kind: "role";
      readonly line: number;
      readonly raw: string;
      readonly key: string;
      readonly spec: RoleSpec;
      readonly routes: readonly Route[];
      readonly issues: readonly string[];
    }
  | {
      readonly kind: "other";
      readonly line: number;
      readonly raw: string;
      readonly issue?: string;
    };

/** Parsed role file with its original lines preserved for the editor. */
export interface RoleFileDocument {
  readonly path: string;
  readonly budget?: string;
  readonly lines: readonly RoleFileLine[];
  readonly roles: ReadonlyMap<string, RoleEntry>;
  readonly issues: readonly RoleFileIssue[];
}

/** Parse role-file text into a document and its semantic view. */
export function parseRoleFileDocument(text: string, path: string): RoleFileDocument {
  const roles = new Map<string, RoleEntry>();
  const issues: RoleFileIssue[] = [];
  const lines: RoleFileLine[] = [];
  let budget: string | undefined;

  if (text !== "") {
    text.split(/\r?\n/).forEach((rawLine, index) => {
      const line = index + 1;
      const trimmed = rawLine.trim();
      if (trimmed === "") {
        lines.push({ kind: "blank", line, raw: rawLine });
        return;
      }
      if (trimmed.startsWith("#")) {
        const value = budgetLineValue(rawLine);
        if (value !== undefined && value !== "") budget = value;
        lines.push({ kind: "comment", line, raw: rawLine });
        return;
      }

      const colon = rawLine.indexOf(":");
      if (colon === -1) {
        const message = `expected \`<role>: <value>\`, found ${JSON.stringify(trimmed)}`;
        issues.push({ line, message });
        lines.push({ kind: "other", line, raw: rawLine, issue: message });
        return;
      }
      const rawKey = rawLine.slice(0, colon).trim();
      if (rawKey === "") {
        const message = "the role key is empty";
        issues.push({ line, message });
        lines.push({ kind: "other", line, raw: rawLine, issue: message });
        return;
      }
      const spec = findRole(rawKey);
      if (spec === undefined) {
        const message = `unknown pstack role ${JSON.stringify(rawKey)}`;
        issues.push({ line, message });
        lines.push({ kind: "other", line, raw: rawLine, issue: message });
        return;
      }

      const parsed = parseRouteValue(rawLine.slice(colon + 1));
      const entryIssues = [...parsed.issues];
      const shapeIssue = validateRoleRouteShape(spec, parsed.routes);
      if (shapeIssue !== undefined) entryIssues.push(shapeIssue);
      for (const issue of entryIssues) issues.push({ line, message: `${rawKey}: ${issue}` });

      lines.push({
        kind: "role",
        line,
        raw: rawLine,
        key: spec.key,
        spec,
        routes: parsed.routes,
        issues: entryIssues,
      });
      if (parsed.routes.length === 0) return;

      const previous = roles.get(spec.key);
      if (previous !== undefined) {
        issues.push({
          line,
          message: `role "${spec.key}" is already configured on line ${previous.line}; line ${line} wins`,
        });
      }
      roles.set(spec.key, {
        line,
        key: spec.key,
        spec,
        routes: parsed.routes,
        issues: entryIssues,
      });
    });
  }

  return {
    path,
    ...(budget === undefined ? {} : { budget }),
    lines,
    roles,
    issues,
  };
}

/** Whether a line is the role entry the editor is looking for. */
export function isRoleLineFor(
  line: RoleFileLine,
  key: string,
): line is Extract<RoleFileLine, { kind: "role" }> {
  return line.kind === "role" && normalizeRoleName(line.key) === normalizeRoleName(key);
}
