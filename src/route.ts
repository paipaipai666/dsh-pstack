/** The shared route grammar for the role file, wire codec, and editor. */

import { INHERIT_ALIASES, type InheritAlias, type RoleSpec } from "./role-manifest.ts";

/** One resolved child route. */
export type Route =
  | { readonly kind: "inherit"; readonly alias: InheritAlias }
  | {
      readonly kind: "route";
      readonly provider: string;
      readonly model: string;
      readonly effort?: string;
    };

/** One parsed route token. */
export interface ParsedRoute {
  readonly route?: Route;
  readonly issue: string;
}

/** Parse one route token. */
export function parseRoute(raw: string): ParsedRoute {
  const value = raw.trim();
  if (value === "") return { issue: "the value is empty" };
  const alias = value.toLowerCase();
  if ((INHERIT_ALIASES as readonly string[]).includes(alias)) {
    return { route: { kind: "inherit", alias: alias as InheritAlias }, issue: "" };
  }

  const slash = value.indexOf("/");
  if (slash <= 0 || slash === value.length - 1) {
    return {
      issue: `${JSON.stringify(value)} is not a route; use \`inherit-parent\`, \`auto\`, or \`<provider>/<model> [effort]\``,
    };
  }
  const provider = value.slice(0, slash).trim();
  let rest = value.slice(slash + 1).trim();
  let effort: string | undefined;
  const bracket = /\s*\[([^[\]]*)\]\s*$/.exec(rest);
  if (bracket !== null) {
    effort = bracket[1]!.trim();
    rest = rest.slice(0, bracket.index).trim();
  }
  const model = rest;
  const problem = validateRouteParts(provider, model, effort);
  if (problem !== undefined) {
    return { issue: `${JSON.stringify(value)} ${problem}` };
  }
  return {
    route: { kind: "route", provider, model, ...(effort === undefined ? {} : { effort }) },
    issue: "",
  };
}

/** Parse one role value: a single route or a comma-separated list. */
export function parseRouteValue(raw: string): {
  routes: readonly Route[];
  issues: readonly string[];
} {
  const routes: Route[] = [];
  const issues: string[] = [];
  const segments = raw.split(",");
  segments.forEach((segment, index) => {
    const value = segment.trim();
    if (value === "") {
      if (index !== segments.length - 1) issues.push(`entry ${index + 1} of the list is empty`);
      return;
    }
    const parsed = parseRoute(value);
    if (parsed.route === undefined) issues.push(parsed.issue);
    else routes.push(parsed.route);
  });
  if (routes.length === 0 && issues.length === 0) {
    issues.push(
      "the value is empty; use `inherit-parent`, `auto`, or `<provider>/<model> [effort]`",
    );
  }
  return { routes, issues };
}

/** Validate route parts shared by the text and wire parsers. */
export function validateRouteParts(
  provider: string,
  model: string,
  effort: string | undefined,
): string | undefined {
  if (provider === "" || model === "" || /\s/.test(provider) || /\s/.test(model)) {
    return "is not a route; provider and model cannot contain spaces";
  }
  if (effort !== undefined && effort === "") {
    return "has empty brackets; drop them or name an effort";
  }
  if (effort !== undefined && /\s/.test(effort)) {
    return "has a multi-word effort; an effort is one token";
  }
  return undefined;
}

/** Render one role value in the file grammar. */
export function renderRouteValue(routes: readonly Route[]): string {
  return routes
    .map((route) =>
      route.kind === "inherit"
        ? route.alias
        : route.effort === undefined
          ? `${route.provider}/${route.model}`
          : `${route.provider}/${route.model} [${route.effort}]`,
    )
    .join(", ");
}

/** Type guard for a concrete route. */
export function isRoute(route: Route): route is Extract<Route, { kind: "route" }> {
  return route.kind === "route";
}

/** The single-route shape rule shared by the file parser and the save validator. */
export function validateRoleRouteShape(
  spec: RoleSpec,
  routes: { readonly length: number },
): string | undefined {
  if (spec.shape === "single" && routes.length > 1) {
    return "a single-route role cannot hold a comma-separated list";
  }
  return undefined;
}
