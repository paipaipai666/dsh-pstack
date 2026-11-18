# Generated skill patches

Each section names one generated file, the exact upstream text to find, and its replacement.
The generator applies these after copying and before injecting the DSH adapter line.
A missing target or a non-matching Find block fails generation.

## `skills/how/SKILL.md`

**Find**

```text
Spawn one Task subagent with `subagent_type: generalPurpose` and `readonly: true` that explores and explains in one pass.
```

**Replace**

```text
Spawn one `pstack_subagent` with `agent: "readonly"` that explores and explains in one pass. A delegation call returns as soon as the child starts. Its report arrives later as a completion notice. Do not expect a report in the tool response and do not poll.
```

## `skills/arena/SKILL.md`

**Find**

```text
Spawn all N subagents in one message with `run_in_background: true`, each with the task, the path to the shared grounding, its own output path, and instructions to produce the artifact and a short rationale naming the alternatives it considered and what it rejected.
```

**Replace**

```text
Spawn all N subagents in one message, each with the task, the path to the shared grounding, its own output path, and instructions to produce the artifact and a short rationale naming the alternatives it considered and what it rejected. The spawn calls return when the children start. Their artifacts arrive as completion notices, so wait for all N notices before Phase C.
```

## `skills/arena/SKILL.md`

**Find**

```text
Pick each subagent's reasoning level per the Subagents section of the **poteto-mode** skill.
```

**Replace**

```text
Pick each subagent's reasoning effort for the job, per the Subagents section of the **poteto-mode** skill.
```

## `skills/swarm/SKILL.md`

**Find**

```text
Spawn all N workers in one message with `subagent_type: generalPurpose`, `environment: "cloud"`, `run_in_background: true`, and the step 3 model, left unset for `auto` or `inherit-parent`. Use `environment: "local"` only when the worker needs access to something on the user's computer.
```

**Replace**

```text
Spawn all N workers in one message with `agent: "poteto-agent"` and the step 3 model, left unset for `auto` or `inherit-parent`. The spawn calls return when the workers start. Their reports arrive later as completion notices. For work that must run on a registered remote machine, use `pstack_remote` instead.
```

## `skills/swarm/SKILL.md`

**Find**

```text
Read the terminal results.
```

**Replace**

```text
Read the terminal results from the completion notices.
```

## `skills/swarm/SKILL.md`

**Find**

```text
When a worker must start from a non-default pushed branch, pass `cloud_base_branch`.
```

**Replace**

```text
When a worker must start from a non-default pushed branch, create a worktree from that branch with `create_worktree({ from: "<branch>" })` and pass its path as `cwd`.
```

## `skills/poteto-mode/SKILL.md`

**Find**

```text
**Defaults for every `Task` call.** `run_in_background: true`, agent mode (readonly strips MCP), file pointers not inlined context, and an explicit model per role, Project workers included. `/setup-pstack` writes `~/.cursor/rules/pstack-models.mdc`, whose per-role lines override the defaults below and the role models in the routed skills (`arena`, `swarm`, `interrogate`). A role with no line keeps its default. A line of `inherit-parent` or `auto` runs the role on the parent model, so omit `model` and spawn `generalPurpose`, because `poteto-agent` defaults to Opus 5.5.
```

**Replace**

```text
**Defaults for every `Task` call.** `pstack_subagent` starts children and returns; their reports arrive as completion notices. Agent mode (readonly strips MCP), file pointers not inlined context, and an explicit route per role, Project workers included. `/setup-pstack` writes `$DSH_HOME/pstack-models.mdc`, whose per-role lines override the defaults below and the role models in the routed skills (`arena`, `swarm`, `interrogate`). A role with no line keeps its default. A line of `inherit-parent` or `auto` runs the role on the parent model, so leave `role` and `reasoningEffort` out and spawn `generalPurpose`, because `poteto-agent` carries its own default route.
```

## `skills/show-me-your-work/SKILL.md`

**Find**

```text
Use the helper `scripts/log.sh <logfile> <phase> <decision> <why> <evidence> <result>`. It stamps `ts`, writes the header on first use, strips stray tabs/newlines, and prefixes any cell starting with `=`, `+`, `-`, or `@` with a single quote.
```

**Replace**

```text
Use `pstack_script` with `id: "log"` and `args: [<logfile>, <phase>, <decision>, <why>, <evidence>, <result>]`. It stamps `ts`, writes the header on first use, strips stray tabs/newlines, and prefixes any cell starting with `=`, `+`, `-`, or `@` with a single quote.
```

## `skills/statechart/SKILL.md`

**Find**

```text
<skill dir>/scripts/statechart SPEC.tla [--config FILE] [--view FILE] [--out DIR]
```

**Replace**

```text
pstack_script({ id: "statechart", args: ["SPEC.tla", "--config", "FILE", "--view", "FILE", "--out", "DIR"] })
```

## `skills/statechart/SKILL.md`

**Find**

```text
`scripts/statechart.ts` is TypeScript, so run it with a runtime that can execute TypeScript.
```

**Replace**

```text
The `pstack_script` `statechart` id runs the shipped JavaScript under the Host's Node runtime.
```

## `skills/statechart/SKILL.md`

**Find**

```text
Render charts with Pele. When the user asks for an image, or a chart is too large to read as text, follow `references/render.md`. Do not use a different renderer unless the user asks for it.
```

**Replace**

```text
Render charts with `pstack_chart`. When the user asks for an image, or a chart is too large to read as text, follow `references/render.md`. It is the only renderer; do not install Pele or another renderer unless the user asks for a different one.
```

## `skills/poteto-mode/playbooks/worktree-cleanup.md`

**Find**

```text
run `scripts/worktree-audit.sh [-b <pr-base-ref>] [repo-path]`
```

**Replace**

```text
run `pstack_script` with `id: "worktree-audit"` and `args: ["-b", "<pr-base-ref>", "--sessions", "<sessions.json>", "<repo-path>"]`, where `<sessions.json>` is a file you write holding a JSON array of `{"sessionId","cwd","lastEventTime"}` objects built from DSH session-search results
```

## `skills/poteto-mode/playbooks/babysit.md`

**Find**

```text
On GitHub, status comes from the mode's watcher at `scripts/watch-pr/watch-pr`.
```

**Replace**

```text
On GitHub, status comes from `pstack_script` with `id: "watch-pr"`.
```

## `skills/poteto-mode/playbooks/shipping.md`

**Find**

```text
On GitHub, watch the run with `scripts/watch-pr/watch-pr --queued-stack` under `/loop` until it reports `COMPLETE` at the ceiling.
```

**Replace**

```text
On GitHub, watch the run with `pstack_script` with `id: "watch-pr"` and `args: ["--queued-stack", "--stack-prs", "<bottom-to-top>"]` under `/loop` until it reports `COMPLETE` at the ceiling.
```

## `skills/recall/SKILL.md`

**Find**

```text
Transcripts live at `~/.cursor/projects/<slug>/agent-transcripts/<uuid>/<uuid>.jsonl`, where `<slug>` is the workspace path with the leading slash dropped and each "/" turned into "-" (so `/Users/you/proj` becomes `Users-you-proj`). Every line is one chat message.
```

**Replace**

```text
In DeepSeek Harness, `agent-transcripts/` is not a real path; never read a Cursor transcript directory. When the optional `@deepseek-ai/dsh-experimental-session-search` bundle is installed, use `session_search` to find earlier Sessions with the same `cwd` and `session_event_search` / `session_trace` / `session_event_read` to inspect them. Without it, mine the current Session and the artifacts the user supplies, and say that earlier-chat evidence is unavailable.
```

## `skills/automate-me/SKILL.md`

**Find**

```text
Locate the active workspace's transcripts before fanning out. The system prompt names the workspace's `agent-transcripts/` directory. Use only that path. Don't glob across `~/.cursor/projects/*/`. That crosses workspace boundaries and reads private chats from unrelated projects.
```

**Replace**

```text
Locate evidence of the user's recent work before fanning out. In DeepSeek Harness, `agent-transcripts/` is not a real path; never read a Cursor transcript directory. When the optional `@deepseek-ai/dsh-experimental-session-search` bundle is installed, use `session_search` and `session_event_search` against the current workspace. Without it, use artifacts the user supplies, the current Session, and the repository history, and say that earlier-chat evidence is unavailable.
```

## `skills/automate-me/SKILL.md`

**Find**

```text
Each slice mining subagent reads transcripts from the workspace-scoped path the parent provides, looks for the signals below, and returns a short structured list of patterns it saw with evidence pointers.
```

**Replace**

```text
Each slice mining subagent reads the session evidence the parent provides (`session_search` results when the bundle is installed, otherwise user-supplied artifacts), looks for the signals below, and returns a short structured list of patterns it saw with evidence pointers.
```

## `skills/show-me-your-work/SKILL.md`

**Find**

```text
At the end of the run, before handing back, check the log told the truth. Read this run's transcript under the active workspace's `agent-transcripts/` directory (the system prompt names the path). Don't glob across `~/.cursor/projects/*/`. That reads unrelated private chats. Walk this run's rows against what actually happened.
```

**Replace**

```text
At the end of the run, before handing back, check the log told the truth. In DeepSeek Harness, `agent-transcripts/` is not a real path; never read a Cursor transcript directory. When the optional `@deepseek-ai/dsh-experimental-session-search` bundle is installed, use `session_event_search` / `session_event_read` for this Session. Without it, audit against the run's `log` rows, command output, and artifacts the user has, and mark transcript-only checks unavailable. Walk this run's rows against what actually happened.
```

## `skills/poteto-help/SKILL.md`

**Find**

```text
mention once that a Custom Mode keeps it on.
```

**Replace**

```text
mention once that the poteto-mode preset keeps it on.
```

## `skills/poteto-help/SKILL.md`

**Find**

```text
1. Install with `/add-plugin pstack` in chat, or from Customize in the sidebar.
```

**Replace**

```text
1. Install the plugin into a DSH profile: `dsh plugin --profile web add @paipaipai666/dsh-pstack`.
```

## `skills/poteto-help/SKILL.md`

**Find**

```text
pstack is built for Cursor, and it also installs in Claude Code with `/plugin marketplace add cursor/plugins`, then `/plugin install pstack@cursor-plugins`. There, each command takes a `pstack:` prefix, such as `/pstack:poteto-mode`. The [Claude Code adapter](../../docs/harness/claude-code.md) maps the Cursor names, and a step that needs a Cursor-only feature, such as Bugbot or Automations, is skipped with a one-line note.
```

**Replace**

```text
This is the DeepSeek Harness port of pstack. The [DSH adapter](../../docs/harness/dsh.md) maps the Cursor names to DSH tools, and a step that needs a Cursor-only feature, such as Bugbot or Automations, is skipped with a one-line note.
```

## `skills/poteto-help/SKILL.md`

**Find**

```text
Other tools can read the skills, because they use the Agent Skills format. But most workflow skills, including `/poteto-mode`, `/how`, and `/teach`, spawn Cursor subagents, some with per-role models, and Custom Modes and `/loop` are Cursor features, so those parts may not work there.
```

**Replace**

```text
Other tools can read the skills, because they use the Agent Skills format. But most workflow skills, including `/poteto-mode`, `/how`, and `/teach`, spawn subagents with per-role models through `pstack_subagent`, and the poteto-mode preset and the goal/schedule follow-ups are DSH features, so those parts may not work there.
```

## `skills/poteto-help/SKILL.md`

**Find**

```text
Whether `/poteto-mode` stays on depends on how the user starts it:

- Enter on `/poteto-mode` attaches the skill to one message. It fades as the chat moves on.
- Option+Enter on Mac or Alt+Enter on Windows, or Use as Mode from the skill entry, makes it a Custom Mode. It stays in context every turn until the user exits the mode, and it stays out of casual turns.
- Cursor's docs list Custom Modes in the Agents Window and the CLI. Elsewhere, start each new task with `/poteto-mode`.
```

**Replace**

```text
Whether `/poteto-mode` stays on depends on how the user starts it:

- Invoking `/poteto-mode` in a message attaches the skill to that turn. It fades as the chat moves on.
- Running the session under the `poteto-mode` agent preset keeps the skill in context every turn until the user switches presets, and it stays out of casual turns.
- Without the preset, start each new task with `/poteto-mode`.
```

## `skills/poteto-help/SKILL.md`

**Find**

```text
Link [Cursor's skills docs](https://cursor.com/docs/skills) when this comes up. Mid-chat,
```

**Replace**

```text
Mid-chat,
```

## `skills/poteto-help/SKILL.md`

**Find**

```text
- `/deslop`, `control-cli`, and `control-ui` ship in the `cursor-team-kit` plugin.
- `/loop` and `/create-skill` are Cursor built-ins.
```

**Replace**

```text
- `/deslop`, `control-cli`, and `control-ui` are vendored with this plugin and load through `pstack_skill`.
- `/loop` maps to `create_goal` / `schedule_create`; authoring a skill uses the `writing-for-agents` skill.
```

## `skills/poteto-help/SKILL.md`

**Find**

```text
It was started with Enter. Start it as a Custom Mode, or start each task with `/poteto-mode`.
```

**Replace**

```text
It was started as a one-off invocation. Run the session under the `poteto-mode` preset, or start each task with `/poteto-mode`.
```

## `skills/poteto-help/SKILL.md`

**Find**

```text
or run them as cloud agents, which each get their own machine.
```

**Replace**

```text
or run them on a `pstack_remote` target, which each get their own machine.
```

## `skills/poteto-help/SKILL.md`

**Find**

```text
`/loop` needs a check that can pass or fail, not a duration.
```

**Replace**

```text
A `create_goal` run needs a check that can pass or fail, not a duration.
```

## `skills/make-bot-ui/SKILL.md`

**Find**

```text
Build a page the user clicks. A server on this computer POSTs JSON to a webhook routine. The bot wakes with that JSON. Keep the sender key on the server. Do not put the sender key in the browser, in chat, or in this skill.
```

**Replace**

```text
In DeepSeek Harness there is no Cursor routine object: `update_state` routine calls, the `api2.cursor.sh/automations` webhook, routine wakes, and `SendToUser` secret requests are Cursor-only. Skip those steps with the adapter's one-line note. The inbound seam is `@deepseek-ai/dsh-webhook` plus a provider adapter (only GitHub ships one); the recipe is in `docs/automations.md`. The local-server hosting and Tailscale steps below still apply. Never ask for a webhook sender key in chat.

Build a page the user clicks. A server on this computer POSTs JSON to a webhook endpoint. The bot wakes with that JSON. Keep the sender key on the server. Do not put the sender key in the browser, in chat, or in this skill.
```

## `skills/poteto-mode/playbooks/eval.md`

**Find**

```text
6. **Verify the chain from transcripts, not self-report.** Read each candidate's local transcript under the active workspace's `agent-transcripts/` directory (the system prompt names this path). Do not glob across `~/.cursor/projects/*/`. That crosses workspace boundaries and reads private chats from unrelated projects. Look at which files each candidate actually opened. Grade chain-following from the files it really read plus the shape of the code, never from the candidate's own claims.
```

**Replace**

```text
6. **Verify the chain from evidence, not self-report.** In DeepSeek Harness, `agent-transcripts/` is not a real path; never read a Cursor transcript directory. When the optional `@deepseek-ai/dsh-experimental-session-search` bundle is installed, use `session_event_search` / `session_event_read` for each candidate's Session. Without it, grade from the files each candidate actually opened and the artifacts it left. Look at which files each candidate actually opened. Grade chain-following from the files it really read plus the shape of the code, never from the candidate's own claims.
```

## `skills/poteto-mode/playbooks/session-pickup.md`

**Find**

```text
1. Locate the prior trail. A local transcript under the active workspace's `agent-transcripts/` directory (the system prompt names the path. Do not glob across `~/.cursor/projects/*/`, that crosses workspace boundaries and reads private chats from unrelated projects), a cloud-agent URL, or a pushed branch.
```

**Replace**

```text
1. Locate the prior trail. In DeepSeek Harness, `agent-transcripts/` is not a real path; never read a Cursor transcript directory. When the optional `@deepseek-ai/dsh-experimental-session-search` bundle is installed, use `session_search` / `session_event_search` to find the prior Session for this workspace; without it, use the artifacts the user supplies and the current Session. A `pstack_remote` job record or a pushed branch also works.
```

## `skills/poteto-mode/playbooks/worktree-cleanup.md`

**Find**

```text
It classifies each worktree by size, age, merge state, uncommitted work, PR state, and the newest chat that touched it, then suggests a bucket. The transcript scan is slow, so background it.
```

**Replace**

```text
It classifies each worktree by size, age, merge state, uncommitted work, PR state, and the newest supplied session that touched it, then suggests a bucket. The script never reads the session store: `--sessions` is the only usage signal, and without it every row lands in `unknown-usage`. When the session-search bundle is absent, say so and lean on the user's pinned and active set instead of guessing.
```

## `skills/poteto-mode/playbooks/worktree-cleanup.md`

**Find**

```text
since a hand-typed `myrepo-worktrees/x` misses one that lives at `.cursor/worktrees/myrepo/x`
```

**Replace**

```text
since a hand-typed `myrepo-worktrees/x` misses one that lives at a hidden path such as `.worktrees/myrepo/x`
```

## `skills/poteto-mode/playbooks/worktree-cleanup.md`

**Find**

```text
3. Verify usage before deleting. For every `verify-recent-chat` row, or anything you doubt, fan subagents out to read the transcripts and report whether the chat is pinned or ongoing and which worktrees it touches (principle-guard-the-context-window, transcripts are bulk). A pinned chat spawns arena and repro trees into sibling worktrees via background subagents, and those are in use even when their names never hit the sidebar.
```

**Replace**

```text
3. Verify usage before deleting. For every `verify-recent-chat` row, or anything you doubt, check whether the session is pinned or ongoing and which worktrees it touches. When the session-search bundle is installed, fan subagents out to inspect the matching Sessions with `session_event_search` / `session_event_read` (principle-guard-the-context-window, history is bulk); without it, ask the user. A pinned session spawns arena and repro trees into sibling worktrees via subagents, and those are in use even when their names never surface.
```

## `skills/poteto-mode/playbooks/worktree-cleanup.md`

**Find**

```text
6. Simulators and other reclaimers. Simulators are usually the next-biggest win. `xcrun simctl --set testing delete all` (XCTestDevices clones), `xcrun simctl delete unavailable`, and `xcrun simctl runtime list` then `runtime delete <id>` for old runtimes. More when needed: Xcode `DerivedData` and `iOS DeviceSupport`, `~/Library/Application Support/Cursor` (`state.vscdb.backup`, and `snapshots/roots/<root>` where a `<root>` named for a folder you opened as a workspace balloons), package caches (pnpm, uv, brew, yarn). Clear only caches the user has not said to keep.
```

**Replace**

```text
6. Simulators and other reclaimers. On macOS, simulators are usually the next-biggest win: `xcrun simctl --set testing delete all` (XCTestDevices clones), `xcrun simctl delete unavailable`, and `xcrun simctl runtime list` then `runtime delete <id>` for old runtimes, plus Xcode `DerivedData` and `iOS DeviceSupport`. On any platform, package caches (pnpm, uv, brew, yarn) and old build artifacts are safe reclaimers. Skip the simulator and Xcode steps off macOS. Clear only caches the user has not said to keep.
```

## `skills/poteto-mode/playbooks/worktree-cleanup.md`

**Find**

```text
Get that set from the user or sidebar and cross-check every candidate.
```

**Replace**

```text
Get that set from the user and cross-check every candidate.
```
