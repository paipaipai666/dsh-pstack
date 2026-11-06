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
  [/\bsubagent_type:\s*"poteto-agent"/g, 'agent: "poteto-agent"'],
  [/\bsubagent_type:\s*"comment-sicko"/g, 'agent: "comment-sicko"'],
  [/\bsubagent_type:\s*"([^"]+)"/g, 'agent: "$1"'],
  [/\bsubagent_type\b/g, "agent"],
  [/\breadonly:\s*true\b/g, "no file edits"],
  [/\benvironment:\s*"cloud"\b/g, "local worktree"],
  [/\benvironment:\s*"local"\b/g, "current directory"],
  [/\bcloud_base_branch\b/g, "cwd"],
  [/\b~\/\.cursor\/rules\/pstack-models\.mdc\b/g, "$DSH_HOME/pstack-models.mdc"],
  [/(?<!\$DSH_HOME\/)\bpstack-models\.mdc\b/g, "$DSH_HOME/pstack-models.mdc"],
  [/\b~\/\.cursor\/plugins\/\b/g, "the installed dsh-pstack package"],
  [/\b~\/\.cursor\/projects\/\b/g, "the DSH session history"],
  [/\b\.cursor\/skills\//g, ".dsh/skills/"],
  [/\bAskQuestion\b/g, "ask_user_question"],
  [/\bTodoWrite\b/g, "todo_write"],
  [/\bgrok-4\.7-xhigh-fast\b/g, "the configured code role"],
  [/\bclaude-opus-5-5-xhigh\b/g, "the configured judgment role"],
  [/\bclaude-opus-5-5-max\b/g, "the configured judgment role"],
  [/\bgpt-5\.6-sol-max\b/g, "the configured judgment role"],
];

/** Translate Cursor-only names in one skill body without changing upstream files. */
export function toDshText(text: string): string {
  let result = text;
  for (const [pattern, replacement] of REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
