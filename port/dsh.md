# pstack in DeepSeek Harness

pstack skills use Cursor names. In DeepSeek Harness, read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/` in the installed `dsh-pstack` package. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

## Tools

| Cursor | DeepSeek Harness |
| --- | --- |
| `Task` | `pstack_subagent`, provided by this package. A call starts one fresh child for a single or selected route, and one fresh child per automatic panel entry. It returns every child id with its resolved route. Results arrive as completion notices; do not poll. |
| `AskQuestion` | `ask_user_question`. It takes a `questions` array with options, `multi_select`, and free input. Only a live root agent has a human answerer. A delegated child keeps its questions in its report. |
| Open a todolist | `todo_write` with the full list, replacing the previous one. It has only `pending`, `in_progress`, and `completed`. Keep a skipped step visible as `skip: <reason> - <step>` with status `completed`. |
| Run another pstack skill (`/name` or "the **name** skill") | `pstack_skill` with the exact kebab-case `name`. It loads pstack skills that `disable-model-invocation` hides from `skill`. Pass a relative `resource` to read one reference or playbook beside `SKILL.md`. User commands keep their plain names, such as `/setup-pstack`. DSH adds no `pstack:` prefix. |
| `Grep`, `Glob` | `grep` and `glob` for discovery, `read` for a known file, and `bash` for shell commands. `grep` uses ripgrep syntax. Both search tools report where an over-limit result was saved. |
| A bundled script under `scripts/` | Prefer `pstack_script` with one of the fixed ids `check-plan`, `watch-pr`, `worktree-audit`, `log`, or `statechart`. It runs the shipped artefact under the Host's own Node runtime, so it works where `node` is not on PATH (the Desktop app runs on Electron). Pass `cwd` for the working directory, `timeoutMs` up to 600000, and `background: true` for a long run. The `pstack-script-policy` row asks for approval before every call; `mode: allow` exists only for a trusted headless profile. A different script keeps its declared interpreter and runs from the shell. |
| A second machine (`environment: "cloud"`, or "the VM") | `pstack_remote` with the target name: `action: "run"` starts one headless DSH run there and returns a job id; `status` and `logs` read it, `cancel` stops it. The `pstack-remote` row owns the target registry and the approval policy. A machine is either an SSH host with `dsh` on its PATH or an HTTP worker that streams NDJSON; `docs/remote-worker.md` is the contract. This package never provides a VM, a dashboard, or a shared filesystem. |

## Subagent fields

| Cursor | DeepSeek Harness |
| --- | --- |
| `subagent_type: generalPurpose` | `agent: "general"`. This plain child joins the parent agent preset and inherits its tools. Every call must also pass `description`, `prompt`, `role`, `roleIndex`, `reasoningEffort`, and `cwd`. Only `maxDepth` is optional. Pass `null` for `role`, `roleIndex`, `reasoningEffort`, or `cwd` when unused. `roleIndex` requires a non-null role. A non-null `cwd` must be inside the Session directory or a separate Git worktree. Omit `maxDepth` or pass null to use the configured row and Host cap. Explicit `maxDepth` must be at least 1 and cannot exceed that cap. |
| `poteto-agent`, `comment-sicko` | `agent: "poteto-agent"`, `agent: "comment-sicko"`. The package declares both as `@deepseek-ai/dsh-agent-preset` rows. `poteto-agent` injects the pstack persona and the absolute `poteto-mode` instruction path. `comment-sicko` mounts the comment reviewer. These are not `subagent_type` values. |
| `readonly: true` | `agent: "readonly"`. The readonly preset mounts the read-only sandbox policy; file writes and write-capable shell commands are denied while reads and queries remain available. |
| `readonly: false` | `agent: "general"`. The child keeps the parent's tools, including mounted MCP tools. |
| `environment: "cloud"` | `pstack_remote` with a registered target, when the profile has one: `action: "run"`, `target`, `task`, `workspacePath`. The remote machine runs `dsh --profile headless --json`; this package never supplies it. Without a target, fall back to a local checkout: `create_worktree`, pass its path as `cwd`, and name the branch or commit. Only the checkout and branch are isolated. |
| `environment: "local"` | `cwd: null`. The child inherits the Session directory. |
| `cloud_base_branch: <b>` | `create_worktree({ from: "<b>" })`, or tell the child to check out `<b>` first. `from` resolves local refs only and does not fetch. |
| `run_in_background: true` | Omit. Every `pstack_subagent` activation is managed and reports by completion notice. There is no background flag. |
| `resume` | Send `send_message` to the existing child id. An idle continuable child cold-resumes; a running child receives the message at its next step. |
| `file_attachments` | List the real paths in `prompt`. There is no attachment argument. |

## Models

| Cursor | DeepSeek Harness |
| --- | --- |
| `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh` | Never pass a Cursor slug to `pstack_subagent`. Pass `role: "<role key>"`. `$DSH_HOME/pstack-models.mdc` supplies the exact `<provider>/<model> [effort]` route. Drop `-fast`. DSH has no speed parameter. Run `pstack_models` to see the routes this deployment actually serves. A call may override the role's starting effort with `reasoningEffort`, using a token the target model advertises. |
| A `grok-*`, `gpt-*`, or other non-Claude slug | Pass `role: null` so the child inherits the parent route, and say so. A role line with `inherit-parent` or `auto` does the same. |
| `auto` or `inherit-parent` | Pass `role: null`, or write the role value as `inherit-parent` or `auto`. `pstack_subagent` sends no route override. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `$DSH_HOME/pstack-models.mdc`. `pstack_subagent` re-reads it on every delegation, so an edit affects the next child and never a running child. A missing file makes every role inherit the parent route. An unreadable file is an error. A malformed line is reported at its line number. Role names come from the pstack role manifest. |
| A role value `<model> <effort>`, such as `opus high` | `<provider>/<model> [effort]`, such as `provider/model [high]`. Split at the first `/`. The bracketed effort must be a token the model advertises. A comma-separated value is a list. `arena runners`, `architect runners`, and `interrogate reviewers` are automatic panels that start one child per entry. `arena cross-judge pool` and `swarm workers` select one entry by `roleIndex` (null selects the first). `swarm workers` is the default route for every worker unless a race assigns one per arm. For `arena cross-judge pool`, skip `inherit-parent` and `auto` and prefer a family other than the parent's. Call `pstack_roles` first when a role may hold a list. |

## setup-pstack

`setup-pstack` writes `$DSH_HOME/pstack-models.mdc`, the role file `pstack_subagent` reads on every delegation. Run `pstack_models` first. It reports the live providers, models, and reasoning-effort tokens instead of inferring routes from Cursor slugs. The pstack tab on the Web Plugins settings page edits the same file; the last write wins, and the next delegation uses it without a restart.

- Detect. Enumerate the routes `pstack_models` returns. Write each real route as `<provider>/<model> [effort]`. The effort must be one that route advertises. If nothing is detectable, ask the user to paste the routes. Never write an unconfirmed one. `inherit-parent` and `auto` are always valid.
- Defaults. Map each default Cursor slug with the Models rows. Apply the budget to the effort token: `unlimited`, `large`, `medium`, and `small` target `max`, `xhigh`, `high`, and `medium`. If a model has no such token, choose the highest advertised effort at or below the target and say so. If every advertised effort is above the target, ask the user to choose a route. If it advertises no effort at all, keep the route without a bracketed effort and say so.
- Write. Write `$DSH_HOME/pstack-models.mdc` with no frontmatter, then the comment lines, the `# budget:` line, and one line per role. Overwrite the whole file so a rerun is idempotent. Delete a role line to make that role inherit the parent route. Report an unknown or retired role line at its line number, omit it from the new file, and tell the user. Never put role lines in `AGENTS.md` or `CLAUDE.md`.

## Paths

| Cursor | DeepSeek Harness |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `.dsh/skills/` or `.agents/skills/` in the project, and `$DSH_HOME/skills/` or `~/.agents/skills/` for user skills. Packaged pstack skills live under `<pstack>/skills/`. Load them through `pstack_skill`, and read relative resources in place. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | The installed `dsh-pstack` package's absolute resource paths. Resolve `references/`, `playbooks/`, and `scripts/` beside their `SKILL.md`. Bundled scripts keep their declared interpreter (`node`, `bun`, `bash`, `sh`) and run from the shell; they are not invoked by `bash` blindly, and the plugin does not wrap them. Install the package through a DSH profile or bundle. |
| `.cursor/rules/*.mdc`, always-applied rules | Project instructions in `AGENTS.md`. DSH loads `$DSH_HOME/AGENTS.md`, `<agentsHome>/AGENTS.md`, and the project instruction chain in every new session. DSH never loads `.mdc` files. The pstack role file is the exception. Only `pstack_subagent` reads it. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when the package ships that file. Read the local copy and never fetch it. Give the user the public URL when they need a link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | The optional `@deepseek-ai/dsh-experimental-session-search` bundle (experimental, disabled by default). `session_search` finds earlier Sessions whose `cwd` exactly matches the current Session's `cwd`. `session_event_search`, `session_trace`, `session_event_trace`, and `session_event_read` inspect them. For the current Session, call `session_event_search` with its own id. Do not read a Cursor transcript directory. |

## Cursor-only features

DeepSeek Harness has no Cursor Automations, Bugbot, Cursor cloud agents, or built-in PR tool. When a step needs one, write one line in your reply, `Skipped in DeepSeek Harness: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL, a key, or a machine, leave a placeholder and name it in the line. A skipped step is not a passed step. Report unavailable verification separately.

| Cursor | DeepSeek Harness |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip the routine object with the line. An inbound event to a new Session exists as an official seam: `@deepseek-ai/dsh-webhook` plus a provider adapter turns a verified delivery into an ordinary Session. Install it, then start the profile with an overlay, for example `dsh web --patch <profile>/node_modules/@deepseek-ai/dsh-webhook-github/examples/github-review/cordis.yml`. Only GitHub ships an adapter; another provider needs a small rule plugin. The seam does not dedupe deliveries and does not report completion, so never read a `202` as a started Session. `schedule_create` remains the local time-based follow-up. Never ask for a `SendToUser` secret in chat. Recipes for both halves, including unattended approval, are in `docs/automations.md`. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | `environment: "cloud"` maps to a remote target when `pstack_remote` has one, and otherwise to a local worktree, as in Subagent fields. A remote target runs the task on a machine the user registered; DeepSeek Harness never supplies that machine. Skip a step that needs the cloud agent's dashboard, its own VM image, or its billing. |
| Tailscale reachability of a local page | Bind one concrete interface address: `dsh --profile web --host <tailscale-ip> --public-url http://<tailscale-ip>:<port>`. The unspecified address is rejected at load, so `0.0.0.0` never works. Check the address with `tailscale ip -4`; the browser-session token still applies, so hand the full URL to the device. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. That is not a skip, so write no line. For PR status, checks, review, and merge through DSH, enable the experimental `@deepseek-ai/dsh-experimental-forge-bundle` (disabled by default). Otherwise use `gh`. If neither is available, report the blocked forge step. |
| Cursor Projects | Skipped in DeepSeek Harness: Run a persistent Cursor Project with cloud child agents that continue after the laptop closes. DeepSeek Harness has no Cursor Project service or cloud coordinator. Local agent teams and workflows are not an equivalent replacement. |

## Local replacements

| Cursor | DeepSeek Harness |
| --- | --- |
| `create-skill` | Use the vendored `writing-for-agents` skill to create or review a skill, then write and validate its `SKILL.md` directly. |
| `/deslop` | Use the vendored `deslop` skill. It removes AI-generated code slop from a diff; `unslop` is only for prose. |
| `/loop` | Use `create_goal` for automatic continuation, `schedule_create` for a timed heartbeat, or a background `bash` watcher for observable events. These tools do not subscribe to forge events. |
| `/automate` | Use `writing-for-agents` to create a personal skill from verified work patterns. When historical evidence is needed, use the session-search fallback in Optional plugins. |
| Custom Mode | Select the shipped `poteto-mode` root preset for the standard tool surface, or `poteto-mode-creator` for the Creator mode tool surface, at session creation. Both keep the full skill in the system prompt for the whole session. If the session uses another preset, invoke `/poteto-mode` on each task. |
| `/visualize` | Prefer the community `@nagi-ovo/dsh-visualize` plugin: its `visualize` tool renders an HTML fragment as an interactive card in the conversation, which is the closest replacement for the built-in chart command. Without it, use Mermaid for diagrams, return the Mermaid text, and do not claim an image. |
| `statechart` | Use Mermaid for the chart. DSH has no built-in SVG renderer, so ignore the `references/render.md` render step, return the `chart.mmd` text, and do not claim an image. |
| `ketchup-video` | Use the text summary. DSH has no built-in video renderer, so do not claim a rendered video. |
| `control-ui`, `control-cli`, and `cursor-team-kit` | The package vendors `control-ui` and `control-cli` as instruction skills. Their browser and PTY requirements are stated in their own `SKILL.md`; enable `@deepseek-ai/dsh-browser-use` or the experimental persistent terminal bundle when those dependencies are required. Keep unavailable GUI or video evidence marked as skipped. |

## Optional plugins

The following DSH plugins are disabled by default. Enable a package through the Plugins page or `dsh plugin --profile <profile> add <package>`, then restart the profile if required. A disabled plugin does not make a dependent step pass.

| Plugin packages | Capability when enabled | When not enabled |
| --- | --- | --- |
| `@deepseek-ai/dsh-experimental-forge-bundle` | PR panels, checks, reviews, ready state, merge, Session binding, and the model-side `create_worktree` tool. | Use `gh` or `git worktree add` through `bash`. |
| `@deepseek-ai/dsh-browser-use` and one browser provider | Browser navigation, input, screenshots, and ARIA snapshots. | Use project-owned browser scripts; otherwise mark browser evidence as skipped. |
| `@deepseek-ai/dsh-cua-bundle` | macOS desktop application control and screenshots. | Use a project-owned desktop driver; otherwise mark desktop evidence as skipped. |
| `@deepseek-ai/dsh-experimental-terminal-bundle` | Persistent PTY tools for CLI and TUI verification. | Run foreground commands or background jobs through `bash`. |
| `@deepseek-ai/dsh-experimental-session-search` | Session history search and event inspection. | Use a resume note or evidence supplied by the user. |
| `@deepseek-ai/dsh-mcp-client` | Configured MCP tools. | Inspect local files and use standard search or fetch tools. |
| `@deepseek-ai/dsh-experimental-agent-team-profile` | Lead and teammate roles and a shared task board. | Do not enable Agent Teams in a profile that offers the pstack root presets. Both own delegation and task coordination; the pstack root preset fails at startup when the Agent Teams service is present. |
| `@deepseek-ai/dsh-experimental-ralph-bundle` | A foreground `ralph` loop with a structured handoff. | Use `create_goal` with `schedule_create` or a background `bash` watcher. |

## Community replacements

These packages are not official DeepSeek Harness plugins and this package does not depend on them. Name them only when the user asks for the capability, and say that it is a community package.

| Package | Replaces | Caveat |
| --- | --- | --- |
| `@nagi-ovo/dsh-visualize` | `/visualize`, and any step that wants a picture instead of text | Renders HTML fragments as conversation cards. It is not a chart DSL, so the numbers still come from the model. |
| `dsh-plugin-mermaid-gb-svg` | A rendered `statechart` or Mermaid diagram | Converts Mermaid to a fixed SVG convention; it does not colour the pstack statechart annotations. |
| `dsh-ffmpeg` | `ketchup-video` post-processing | Transcodes, burns subtitles, extracts frames. It does not build the slides, so the video is still assembled outside this package. |
| `dsh-automations` | Cursor Automations' event triggers | Triggers on host and Session lifecycle events and runs a local command or an HTTP request. It is not a cloud routine and has no Cursor dashboard. |
| `dsh-remote` | Reaching a machine that is not this one | Mirrors an SSH host into a local workspace and opens the remote DSH UI through port forwarding. The machine and its DSH install are the user's. |
