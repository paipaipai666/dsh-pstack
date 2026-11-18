/**
 * Runtime text adaptation for pstack skills.
 *
 * Upstream pstack says "Task", "subagent_type", ".cursor", and Cursor model slugs because
 * it was written for Cursor. Keeping the upstream tree makes updates reviewable; this
 * translation layer makes the text executable in DeepSeek Harness without rewriting every
 * upstream file. It only touches text returned by the pstack skill provider.
 */

const REPLACEMENTS: readonly (readonly [RegExp, string])[] = [
  [/\bTask (tool|subagent|call|prompt|error|result|model|fields?)\b/g, "pstack_subagent $1"],
  [/\bTask\b/g, "pstack_subagent"],
  // A read-only general spawn is the readonly preset, not a writable general child. Collapse the
  // pair before the field rules below so it does not emit two conflicting `agent` values.
  [
    /`subagent_type: (?:generalPurpose|"generalPurpose")`(?: and|,) `readonly: true`/g,
    '`agent: "readonly"`',
  ],
  [/\bsubagent_type:\s*"generalPurpose"/g, 'agent: "general"'],
  // Upstream writes the unquoted form too, and the generic rule below would otherwise leave `agent: generalPurpose`.
  [/\bsubagent_type:\s*generalPurpose\b/g, 'agent: "general"'],
  [/\bsubagent_type:\s*"poteto-agent"/g, 'agent: "poteto-agent"'],
  [/\bsubagent_type:\s*"comment-sicko"/g, 'agent: "comment-sicko"'],
  [/\bsubagent_type:\s*"([^"]+)"/g, 'agent: "$1"'],
  [/\bsubagent_type\b/g, "agent"],
  // A bare name in prose ("every spawn is `generalPurpose`") still needs the field it stands for.
  [/\bgeneralPurpose\b/g, 'agent: "general"'],
  // Match the adapter's Subagent fields rows: readonly selects an agent preset, not prose.
  [/\breadonly:\s*true\b/g, 'agent: "readonly"'],
  [/\breadonly:\s*false\b/g, 'agent: "general"'],
  [/\breadonly\/Ask mode\b/g, "read-only mode"],
  // No trailing `\b` after a quote: `"` is not a word character, so the boundary never matches there.
  [/\benvironment:\s*"cloud"/g, "a pstack_remote target"],
  [/\benvironment:\s*"local"/g, "current directory"],
  [/\bcloud_base_branch\b/g, "cwd"],
  // A user-level path belongs under the configured home, not under the default `.dsh`.
  [/~\/\.cursor\/skills\//g, "$DSH_HOME/skills/"],
  [/~\/\.cursor\/rules\/pstack-models\.mdc/g, "$DSH_HOME/pstack-models.mdc"],
  [/(?<!\$DSH_HOME\/)\bpstack-models\.mdc\b/g, "$DSH_HOME/pstack-models.mdc"],
  [/~\/\.cursor\/plugins\//g, "the installed dsh-pstack package resources"],
  [/~\/\.cursor\/projects\//g, "the DSH session history"],
  [/\.cursor\/skills\//g, ".dsh/skills/"],
  [/\bAskQuestion\b/g, "ask_user_question"],
  [/\bTodoWrite\b/g, "todo_write"],
  [/\bgrok-4\.7-xhigh-fast\b/g, "the configured code role"],
  [/\bgrok-4\.7-medium-fast\b/g, "the configured code role"],
  // The `-fast` suffixes come before the bare slugs, since the bare pattern matches their prefix.
  [/\bclaude-opus-5-5-(?:high|medium|low)-fast\b/g, "the configured worker role"],
  [/\bclaude-opus-5-5-xhigh-fast\b/g, "the configured code role"],
  [/\bclaude-opus-5-5-xhigh\b/g, "the configured judgment role"],
  [/\bclaude-opus-5-5-medium\b/g, "the configured judgment role"],
  [/\bclaude-opus-5-5-max\b/g, "the configured judgment role"],
  [/\bclaude-opus-5-5-high-fast\b/g, "the configured worker role"],
  [/\bclaude-fable-5-2-max\b/g, "the configured judgment role"],
  [/\bclaude-fable-5-2-high\b/g, "the configured judgment role"],
  [/\bgemini-4-carbon-high\b/g, "the configured cross-check role"],
  [/\bgpt-5\.6-sol-max\b/g, "the configured judgment role"],
  [/\b(?:cursor-grok|composer)-\*/g, "the configured code role family"],
  [/\bclaude-fable-\*/g, "the configured deep-reasoning role family"],
  [/\bclaude-\*/g, "the configured judgment role family"],
  [/\bgemini-\*/g, "the configured cross-check role family"],
  [/\bgrok-\*/g, "the configured code role family"],
  [/so omit `model` and spawn/g, "so leave `role` and `reasoningEffort` out and spawn"],
  [
    /For `auto` or `inherit-parent`, omit `model` so/g,
    "For `auto` or `inherit-parent`, leave `role` and `reasoningEffort` out so",
  ],
  // DSH has no speed parameter; the recurring spawn instruction becomes a reasoning-effort pick.
  [
    /Pick each subagent's reasoning level and fast or standard speed for the job/g,
    "Pick each subagent's reasoning effort for the job",
  ],
  // The shortened ladder keeps the role-default rung but drops the family walk, which DSH cannot enumerate.
  [
    /rejects a slug, never pass it again\. Fall back to the role's line or default, then the calling skill's fallback, then the closest valid slug of the same family, then omit `model`\. Say so\./g,
    "rejects the route, never pass it again. Fall back to the role's line or default, then the calling skill's fallback, then leave `role` and `reasoningEffort` out so the child runs on the parent route. Say so.",
  ],
  // The slug-rejection ladder has no DSH counterpart; fall back to the role default, then the parent.
  [
    /rejects a slug, use the default and say so\. If it rejects the default, use the closest valid slug of the same family from its error message\./g,
    "rejects the chosen model or effort, use the role's default and say so. If it rejects the default, omit `model` so the subagent runs on the parent model.",
  ],
  // The shorter ladders in `arena` stop at the seat, not at a slug list.
  [
    /rejects a slug, use the nearest valid slug of the same family or drop the seat/g,
    "rejects the route, use the role's nearest configured route or drop the seat",
  ],
  [
    /rejects a slug, use the nearest valid slug of the same family, then the next such entry, or skip the judge/g,
    "rejects the route, use the nearest configured route of the same family, then the next such entry, or skip the judge",
  ],
  // deslop, control-cli, and control-ui are vendored here, not in Cursor's team kit.
  [/\bcursor-team-kit\b/g, "dsh-pstack"],
];

/** Translate Cursor-only names in one skill body without changing upstream files. */
export function toDshText(text: string): string {
  let result = text;
  for (const [pattern, replacement] of REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
