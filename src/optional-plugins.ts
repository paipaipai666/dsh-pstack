/**
 * The optional DSH plugins pstack recommends on its Plugins page.
 *
 * This module is the single source for the `OPT-*` catalogue used by the page
 * and by the tests that check it against the harness adapter document and both
 * READMEs. `bundle` names the package the plugin manager can switch; rows
 * without one are package groups that only carry documentation guidance.
 */

/** The optional-plugin ids documented by the pstack harness adapter. */
export type OptionalPluginId =
  | "OPT-02"
  | "OPT-03"
  | "OPT-04"
  | "OPT-05"
  | "OPT-06"
  | "OPT-07"
  | "OPT-08"
  | "OPT-09";

/** The task-scenario groups the page renders. */
export type OptionalPluginGroup = "sessions" | "verification" | "multi-agent";

/** One documented optional plugin row. */
export interface OptionalPluginDefinition {
  /** `OPT-*` id from the harness adapter's table. */
  readonly id: OptionalPluginId;
  /** Task-scenario group. */
  readonly group: OptionalPluginGroup;
  /** Packages named by the documentation row, in documentation order. */
  readonly packages: readonly string[];
  /** The bundle `pluginManager.setBundleEnabled` addresses; absent for non-bundle rows. */
  readonly bundle?: string;
  /** Included in the default recommendation and in “enable recommended plugins”. */
  readonly recommended?: boolean;
  /** Entry that only warns about a conflict and cannot be switched here. */
  readonly conflict?: boolean;
  /** Whether this page may offer a switch for the bundle. */
  readonly switchable?: boolean;
}

/** Group order shared by the page and its tests. */
export const OPTIONAL_PLUGIN_GROUPS: readonly OptionalPluginGroup[] = [
  "sessions",
  "verification",
  "multi-agent",
];

/** The complete optional-plugin catalogue in documentation order. */
export const OPTIONAL_PLUGINS: readonly OptionalPluginDefinition[] = [
  {
    id: "OPT-02",
    group: "sessions",
    packages: ["@deepseek-ai/dsh-experimental-forge-bundle"],
    bundle: "@deepseek-ai/dsh-experimental-forge-bundle",
    recommended: true,
    // The forge bundle and the official Git-worktree plugin both create worktrees;
    // that conflict is documented in port/audit.md (CAP worktree rows), not enforced here.
  },
  {
    id: "OPT-03",
    group: "verification",
    packages: [
      "@deepseek-ai/dsh-browser-use",
      "@deepseek-ai/dsh-experimental-browser-use-stagehand-native",
      "@deepseek-ai/dsh-experimental-browser-use-playwright-mcp",
      "@deepseek-ai/dsh-experimental-browser-use-chrome-devtools-mcp",
    ],
  },
  {
    id: "OPT-04",
    group: "verification",
    packages: ["@deepseek-ai/dsh-cua-bundle"],
    bundle: "@deepseek-ai/dsh-cua-bundle",
  },
  {
    id: "OPT-05",
    group: "verification",
    packages: ["@deepseek-ai/dsh-experimental-terminal-bundle"],
    bundle: "@deepseek-ai/dsh-experimental-terminal-bundle",
  },
  {
    id: "OPT-06",
    group: "sessions",
    packages: ["@deepseek-ai/dsh-experimental-session-search"],
    bundle: "@deepseek-ai/dsh-experimental-session-search",
    recommended: true,
  },
  {
    id: "OPT-07",
    group: "verification",
    packages: ["@deepseek-ai/dsh-mcp-client"],
  },
  {
    id: "OPT-08",
    group: "multi-agent",
    packages: ["@deepseek-ai/dsh-experimental-agent-team-profile"],
    bundle: "@deepseek-ai/dsh-experimental-agent-team-profile",
    conflict: true,
    switchable: false,
  },
  {
    id: "OPT-09",
    group: "multi-agent",
    packages: ["@deepseek-ai/dsh-experimental-ralph-bundle"],
    bundle: "@deepseek-ai/dsh-experimental-ralph-bundle",
  },
];

/** The default recommendation ids, in catalogue order. */
export function defaultRecommendationIds(): readonly OptionalPluginId[] {
  return OPTIONAL_PLUGINS.filter((plugin) => plugin.recommended === true).map(
    (plugin) => plugin.id,
  );
}

/** Bundle packages the one-click action enables, in documented order. */
export function recommendedBundleNames(): readonly string[] {
  return OPTIONAL_PLUGINS.filter(
    (plugin) => plugin.recommended === true && plugin.bundle !== undefined,
  ).map((plugin) => plugin.bundle as string);
}
