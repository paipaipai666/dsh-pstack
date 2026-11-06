# pstack in DeepSeek Harness

pstack skills use Cursor names. In DeepSeek Harness, read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/` in the installed `dsh-pstack` package. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

## Tools

| Cursor | DeepSeek Harness |
| --- | --- |
| `Task` | `pstack_subagent`, provided by this package. A call starts one fresh child for a single or selected route, and one fresh child per automatic panel entry. It returns every child id with its resolved route and reports results through completion notices. Do not poll, and do not start a child to run the parent playbook. |
| `AskQuestion` | `ask_user_question`. It takes a `questions` array with options, `multi_select`, and free input. Only a live root agent has a human answerer. A delegated child must keep its questions in its report. |
| Open a todolist | `todo_write` with the full list, replacing the previous one. It has only `pending`, `in_progress`, and `completed`. Keep a skipped step visible as `skip: <reason> - <step>` with status `completed`. |
| Run another pstack skill (`/name` or "the **name** skill") | `pstack_skill` with the exact kebab-case `name`. It loads pstack skills that `disable-model-invocation` hides from the `skill` catalog. Pass a relative `resource` to read one reference or playbook beside `SKILL.md`. User commands keep their plain names, such as `/setup-pstack`. DSH adds no `pstack:` prefix. |
| `Grep`, `Glob` | `grep` and `glob` for discovery, `read` for a known file, and `bash` for shell commands. `grep` uses ripgrep syntax. Both search tools accept a path and report where an over-limit result was saved. |

## Subagent fields

| Cursor | DeepSeek Harness |
| --- | --- |
| `subagent_type: generalPurpose` | `agent: "general"`. This plain child joins the parent agent preset and inherits its tools. Every call must also pass `description`, `prompt`, `role`, `roleIndex`, `reasoningEffort`, and `cwd`. Only `maxDepth` is optional. Pass `null` for `role`, `roleIndex`, `reasoningEffort`, or `cwd` when the setting is unused. `roleIndex` requires a non-null role, and a non-null `cwd` must be inside the Session directory or a separate Git worktree. Omit `maxDepth` or pass null for the safe default of 1, which lets the child exist but not start its own children. Pass 2 or more, within the `pstack-subagent` row's configured cap (3 by default), to let it delegate further. `maxDepth: 0` resolves to 1 because a child is already at depth 1. A reasoning effort is one token, exactly as the target model advertises. Choose `agent` explicitly. Never pass a DSH agent-preset id in its place. |
| `poteto-agent`, `comment-sicko` | `agent: "poteto-agent"`, `agent: "comment-sicko"`. The package declares both as `@deepseek-ai/dsh-agent-preset` rows. `poteto-agent` injects the pstack persona and the absolute `poteto-mode` instruction path. `comment-sicko` mounts the comment reviewer preset. These are not `subagent_type` values. |
| `readonly: true` | No per-call field. Use `agent: "comment-sicko"` for the comment reviewer. Its preset disables `write` and `edit` but keeps `bash`, so treat the no-write rule as a review constraint and check `git status` after it reports. For any other read-only brief, say "do not edit files" and check `git status`. Prose is not a sandbox. |
| `readonly: false` | `agent: "general"`. The child keeps the parent's tools, including mounted MCP tools. |
| `environment: "cloud"` | No cloud VM. Create a local checkout with `create_worktree` (or `git worktree add` through `bash` when the forge bundle is off), pass its path as `cwd`, and name the branch or commit. Only the checkout and branch are isolated. Ports, credentials, caches, and services may remain shared. Skip a step that needs the cloud dashboard or its own machine. |
| `environment: "local"` | `cwd: null`. The child inherits the Session directory. |
| `cloud_base_branch: <b>` | `create_worktree({ from: "<b>" })`, or tell the child to check out `<b>` first. `from` resolves local refs only and does not fetch. |
| `run_in_background: true` | Omit. Every `pstack_subagent` activation is managed and reports by completion notice. There is no background flag. |
| `resume` | Send `send_message` to the existing child id. An idle continuable child cold-resumes, and a running child receives the message at its next step. Start a fresh child only when you do not need its prior context. |
| `file_attachments` | List the real paths in `prompt`. There is no attachment argument. |

## Models

| Cursor | DeepSeek Harness |
| --- | --- |
| `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh` | Never pass a Cursor slug to `pstack_subagent`. Pass `role: "<role key>"`. `$DSH_HOME/pstack-models.mdc` supplies the exact `<provider>/<model> [effort]` route. Drop `-fast`. DSH has no speed parameter. Use `pstack_models` to see the routes this deployment actually serves. A call may override the role's starting effort with `reasoningEffort`, using a token the target model advertises. A running child can change it with `set_reasoning_effort`. |
| A `grok-*`, `gpt-*`, or other non-Claude slug | Pass `role: null` so the child inherits the parent route, and say so. A role line with `inherit-parent` or `auto` does the same. |
| `auto` or `inherit-parent` | Pass `role: null`, or write the role value as `inherit-parent` or `auto`. `pstack_subagent` sends no route override and the child inherits the parent route. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `$DSH_HOME/pstack-models.mdc`. `pstack_subagent` re-reads it on every delegation, so an edit affects the next child and never a running child. A missing file makes every role inherit the parent route. An unreadable file is an error. A malformed line is reported at its line number. Role names come from the pstack role manifest, not free text. |
| A role value `<model> <effort>`, such as `opus high` | `<provider>/<model> [effort]`, such as `provider/model [high]`. Split at the first `/`. The bracketed effort must be a token the model advertises. A comma-separated value is a list. `arena runners`, `architect runners`, and `interrogate reviewers` are automatic panels that start one child per entry, including `inherit-parent` and `auto` entries. `arena cross-judge pool` and `swarm workers` select one entry by `roleIndex` (null selects the first). `swarm workers` is the default route for every worker unless a race assigns one per arm. For `arena cross-judge pool`, skip `inherit-parent` and `auto`. Use `roleIndex` to try eligible routes from a family other than the parent's, in pool order. Skip the judge if none qualifies. If the parent's family is unknown, try the real routes in pool order and say that the family check did not run. Call `pstack_roles` first when a role may hold a list. It reports the role's `shape`, `autoPanel`, and whether `roleIndex` applies. |

## setup-pstack

`setup-pstack` writes `$DSH_HOME/pstack-models.mdc`, the role file `pstack_subagent` reads on every delegation. Run `pstack_models` first. It reports the live providers, models, and reasoning-effort tokens instead of inferring routes from Cursor slugs.

- Detect. Enumerate the routes `pstack_models` returns. Write each real route as `<provider>/<model> [effort]`. The effort is the bracketed token and must be one that route advertises. If nothing is detectable, ask the user to paste the routes. Never write an unconfirmed one. `inherit-parent` and `auto` are always valid.
- Defaults. Map each default Cursor slug with the Models rows: keep the role and replace the slug with a route from `pstack_models`. For example, a `claude-opus-5-5-xhigh` default becomes a real route with `[xhigh]`, and `grok-4.7-xhigh-fast` becomes `inherit-parent`. Apply the budget to the effort token: `unlimited`, `large`, `medium`, and `small` target `max`, `xhigh`, `high`, and `medium`. If a model has no such token, choose the highest advertised effort at or below the target and say so. If every advertised effort is above the target, mark the role as needing a choice and ask the user to choose a route. If it advertises no effort at all, keep the route without a bracketed effort and say so.
- Write. Write `$DSH_HOME/pstack-models.mdc` with no frontmatter, then the comment lines, the `# budget:` line, and one line per role from step 5. Overwrite the whole file so a rerun is idempotent. Delete a role line to make that role inherit the parent route. Report an unknown or retired role line at its line number, omit it from the new file, and tell the user. Never put role lines in `AGENTS.md` or `CLAUDE.md`.

## Paths

| Cursor | DeepSeek Harness |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `.dsh/skills/` or `.agents/skills/` in the project, and `$DSH_HOME/skills/` or `~/.agents/skills/` for user skills. Packaged pstack skills live under `<pstack>/skills/`. Load them through `pstack_skill`, and read relative resources in place. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | The installed `dsh-pstack` package's absolute resource paths. Resolve `references/`, `playbooks/`, and `scripts/` beside their `SKILL.md`. Run a bundled script through `pstack_script` with its registered id: `check-plan`, `watch-pr`, `worktree-audit`, `log`, or `statechart`. Pass one string per argument. A relative `cwd` resolves from the Session directory. `pstack_script` uses the Host's Node runtime, not a shell. It requests the Host approval service before running and fails closed without an answerer; the filesystem sandbox does not apply. Set `background: true` for a long `watch-pr`. Install the package through a DSH profile or bundle. Do not scan a plugin cache for the highest version. |
| `.cursor/rules/*.mdc`, always-applied rules | Project instructions in `AGENTS.md`. DSH loads `$DSH_HOME/AGENTS.md`, `<agentsHome>/AGENTS.md`, and the project instruction chain in every new session. DSH never loads `.mdc` files. The pstack role file is the exception. Only `pstack_subagent` reads it. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when the package ships that file. The plugin ships `skills/`, `docs/guide/`, `agents/`, `README.md`, and `LICENSE`. Read the local copy and never fetch it. Give the user the public URL when they need a link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | The optional `@deepseek-ai/dsh-experimental-session-search` bundle (experimental, disabled by default). `session_search` finds earlier Sessions whose `cwd` exactly matches the current Session's `cwd`. `session_event_search`, `session_trace`, `session_event_trace`, and `session_event_read` inspect them. Sessions require exact `cwd` equality. For the current Session, call `session_event_search` with its own id. Do not read a Cursor transcript directory. |

## Cursor-only features

DeepSeek Harness has no Cursor Automations, Bugbot, Cursor cloud agents, or built-in PR tool. When a step needs one, write one line in your reply, `Skipped in DeepSeek Harness: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL, a key, or a machine, leave a placeholder and name it in the line. A skipped step is not a passed step. Report unavailable verification separately.

| Cursor | DeepSeek Harness |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. `schedule_create` handles local time-based follow-ups, but it is not a routine and does not receive Cursor webhooks. Never ask for a `SendToUser` secret in chat. A step that exists only for `make-bot-ui`'s routine, sender key, or wake loop is also skipped. An ordinary local page or Tailscale server does not replace that loop. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | `environment: "cloud"` maps to a local worktree, as in Subagent fields. Skip a step that needs the cloud agent itself, such as its dashboard status or its own machine. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. That is not a skip, so write no line. For PR status, checks, review, and merge through DSH, enable the experimental `@deepseek-ai/dsh-experimental-forge-bundle` (disabled by default). Otherwise use `gh`. If neither is available, report the blocked forge step. |
| Cursor Projects | Skipped in DeepSeek Harness: Run a persistent Cursor Project with cloud child agents that continue after the laptop closes. DeepSeek Harness has no Cursor Project service or cloud coordinator. Local agent teams and workflows are not an equivalent replacement. |

## Local replacements

| Cursor | DeepSeek Harness |
| --- | --- |
| `create-skill` | Use `writing-for-agents` to create or review a skill, then write and validate its `SKILL.md` directly. |
| `/deslop` | Use `/no-comments` to remove comments that restate the code or obscure its intent. |
| `/loop` | Use `create_goal` for automatic continuation, `schedule_create` for a timed heartbeat, or a background `bash` watcher for observable events. These tools do not subscribe to forge events. |
| `/automate` | Use `writing-for-agents` to create a personal skill from verified work patterns. When historical evidence is needed, use the session-search fallback in Optional plugins. |
| Custom Mode | Invoke `/poteto-mode` on each task. The shipped `poteto-agent` preset is only for delegates and must not run the parent playbook. No persistent root preset ships, so there is no replacement for Cursor's Option+Enter mode toggle. |
| `/visualize` | Use Mermaid for diagrams. Use host-installed image, video, or ffmpeg tools for rendered media, and report any unavailable rendering or frame-level verification separately. |
| `control-ui`, `control-cli`, and `cursor-team-kit` | Enable `@deepseek-ai/dsh-browser-use` for browser interaction, or use the desktop and terminal fallbacks in Optional plugins when they match the required interaction. Keep unavailable GUI or video evidence marked as skipped. |

## Optional plugins

The following DSH plugins are disabled by default. `OPT-07` is stable. The other bundles and providers are experimental. Enable a package through the Plugins page or `dsh plugin --profile <profile> add <package>`, then restart the profile if required. A disabled plugin does not make its dependent step pass. Use the fallback in its row, or print the skip line and continue.

| ID | Plugin packages | Capability when enabled | When not enabled |
| --- | --- | --- | --- |
| OPT-02 | `@deepseek-ai/dsh-experimental-forge-bundle` | PR panels, checks, reviews, ready state, merge, Session binding, a new-worktree option when starting a Session for `/babysit`, `/shipping`, and `/autopilot-*`, and the model-side `create_worktree` tool. One **Change requests & worktrees** switch provides the panel and the tool. | Use `gh` or `git worktree add` through `bash`. The bundle covers GitHub only and needs a logged-in `gh` for GitHub status. Local worktree creation needs no GitHub login. It has no stack or queued-stack verdict and no `origin` CLI, so keep the bundled `watch-pr` for those. It adds no model-side change-request tool, but it does add `create_worktree`. |
| OPT-03 | `@deepseek-ai/dsh-browser-use` and exactly one of `@deepseek-ai/dsh-experimental-browser-use-stagehand-native`, `@deepseek-ai/dsh-experimental-browser-use-playwright-mcp`, or `@deepseek-ai/dsh-experimental-browser-use-chrome-devtools-mcp` | Browser navigation, input, screenshots, and ARIA snapshots. Stagehand also provides act, observe, and extract operations. The providers share one provider slot and expose different tool names and selectors. Screenshots need an image-capable model. | Use project-owned browser scripts through `bash` when available. Otherwise print `Skipped in DeepSeek Harness: Drive the browser UI or capture browser evidence. No browser provider is enabled.` Keep static source inspection and any non-browser verification. |
| OPT-04 | `@deepseek-ai/dsh-cua-bundle` | Clicking, typing, screenshots, permission pages, and session-level authorization for macOS desktop applications in a PTC Session. Install it on demand. Windows support is incomplete, and it uses the single computer-use provider slot. | Use a project-owned desktop driver through `bash` when available. Otherwise print `Skipped in DeepSeek Harness: Drive the desktop application or capture desktop evidence. No computer-use provider is enabled.` |
| OPT-05 | `@deepseek-ai/dsh-experimental-terminal-bundle` | Six global tools keep a shell or REPL alive across calls, support background send, and isolate terminals by owner for CLI and TUI verification. They are added to every Agent, do not cover a GUI, and record no video. Clean up persistent state, and expect switching to invalidate the KV cache. | Run foreground commands or background jobs through `bash`. Preserve input, output, and exit codes in the evidence. |
| OPT-06 | `@deepseek-ai/dsh-experimental-session-search` | `session_search`, `session_event_search`, `session_trace`, `session_event_trace`, and `session_event_read` search and inspect Sessions with exact `cwd` equality. Subagent transcript coverage is not confirmed. | Use a resume note or evidence supplied by the user. Print `Skipped in DeepSeek Harness: Search or read the earlier Session transcript. Session-search tools are not enabled.` Do not infer historical results from the current conversation. |
| OPT-07 | `@deepseek-ai/dsh-mcp-client` | Configured MCP tools appear as `mcp__<server>__<tool>` for `/why` and `/teach`. No server is configured by default, and DSH does not discover evidence categories. | Inspect local files and use standard search or fetch tools. Mark each missing MCP evidence category as not searched. |
| OPT-08 | `@deepseek-ai/dsh-experimental-agent-team-profile` | Lead and teammate roles, a shared task board, nine team tools, and a Web roster for `/orchestrate` and `/autopilot-*`. There is no pstack PR frontier, ledger, or stack verdict. | Use `pstack_subagent`, `workflow`, and `todo_write`. Do not enable Agent Teams and `pstack_subagent` in one profile. Agent Teams disables `subagent` and `subagent_fork` and replaces the global child controls. |
| OPT-09 | `@deepseek-ai/dsh-experimental-ralph-bundle` | A foreground `ralph` loop starts a fresh child each round and carries a structured handoff for `/autonomous-run`. It is not a persistent loop in the same Session and has no event watcher. | Use `create_goal` with `schedule_create` or a background `bash` watcher. This fallback does not subscribe to forge events. |

Browser-use needs its base package and one provider. Stagehand also needs Chromium and a supported non-DeepSeek model. Computer-use covers only macOS PTC Sessions. These optional tools do not record video. Use an external recorder or ffmpeg when a step requires video, and report that dependency separately.
