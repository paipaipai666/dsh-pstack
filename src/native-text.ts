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
  [/\bsubagent_type:\s*"generalPurpose"/g, 'agent: "general"'],
  // Upstream writes the unquoted form too, and the generic rule below would otherwise leave `agent: generalPurpose`.
  [/\bsubagent_type:\s*generalPurpose\b/g, 'agent: "general"'],
  [/\bsubagent_type:\s*"poteto-agent"/g, 'agent: "poteto-agent"'],
  [/\bsubagent_type:\s*"comment-sicko"/g, 'agent: "comment-sicko"'],
  [/\bsubagent_type:\s*"([^"]+)"/g, 'agent: "$1"'],
  [/\bsubagent_type\b/g, "agent"],
  // A bare name in prose ("every spawn is `generalPurpose`") still needs the field it stands for.
  [/\bgeneralPurpose\b/g, 'agent: "general"'],
  [/\breadonly:\s*true\b/g, "no file edits"],
  [/\breadonly:\s*false\b/g, "no read-only restriction"],
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
  [/\bclaude-opus-5-5-xhigh\b/g, "the configured judgment role"],
  [/\bclaude-opus-5-5-medium\b/g, "the configured judgment role"],
  [/\bclaude-opus-5-5-max\b/g, "the configured judgment role"],
  [/\bgpt-5\.6-sol-max\b/g, "the configured judgment role"],
  [/\b(?:cursor-grok|composer)-\*/g, "the configured code role family"],
  [/\bclaude-\*/g, "the configured judgment role family"],
  [/\bgrok-\*/g, "the configured code role family"],
];

/** Translate Cursor-only names in one skill body without changing upstream files. */
export function toDshText(text: string): string {
  let result = text;
  for (const [pattern, replacement] of REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
