# Generated skill patches

Each section names one generated file, the exact upstream text to find, and its replacement.
The generator applies these after copying and before injecting the DSH adapter line.
A missing target or a non-matching Find block fails generation.

## `skills/how/SKILL.md`

**Find**

```text
Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section of the **poteto-mode** skill.
```

**Replace**

```text
Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section of the **poteto-mode** skill.

A delegation call returns as soon as the children start. Their reports arrive later as completion notices. Do not expect a report in the tool response and do not poll.
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

## `skills/reflect/SKILL.md`

**Find**

```text
Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the `Task` response body.
```

**Replace**

```text
Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings as completion notices, one per child, after the spawn call returns.
```

## `skills/reflect/SKILL.md`

**Find**

```text
Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list.
```

**Replace**

```text
Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list as a completion notice.
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

## `skills/poteto-mode/SKILL.md`

**Find**

```text
**Defaults for every `Task` call.** `run_in_background: true` (a steer or resume of a running agent too, because a foreground call holds your turn while other reports wait), agent mode (readonly strips MCP),
```

**Replace**

```text
**Defaults for every `Task` call.** `pstack_subagent` starts children and returns; their reports arrive as completion notices. Agent mode (readonly strips MCP),
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

## `skills/poteto-mode/playbooks/multi-phase-plan.md`

**Find**

```text
6. Run `node pstack/skills/poteto-mode/scripts/check-plan.mjs <plan.md>` and fix every line it prints (the **encode-lessons-in-structure** principle skill).
```

**Replace**

```text
6. Run `pstack_script` with `id: "check-plan"` and `args: ["<plan.md>"]` and fix every line it prints (the **encode-lessons-in-structure** principle skill).
```

## `skills/poteto-mode/playbooks/worktree-cleanup.md`

**Find**

```text
run `scripts/worktree-audit.sh [-b <pr-base-ref>] [repo-path]`
```

**Replace**

```text
run `pstack_script` with `id: "worktree-audit"` and `args: ["-b", "<pr-base-ref>", "<repo-path>"]`
```

## `skills/poteto-mode/playbooks/babysit.md`

**Find**

```text
status comes from `scripts/watch-pr/watch-pr`. Run it directly.
```

**Replace**

```text
status comes from `pstack_script` with `id: "watch-pr"`. Run that tool.
```

## `skills/poteto-mode/playbooks/shipping.md`

**Find**

```text
(`scripts/watch-pr/watch-pr --queued-stack --stack-prs <bottom-to-top>`)
```

**Replace**

```text
(`pstack_script` with `id: "watch-pr"` and `args: ["--queued-stack", "--stack-prs", "<bottom-to-top>"]`)
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

## `skills/reflect/SKILL.md`

**Find**

```text
Before fanning out, find this conversation's transcript in the `agent-transcripts/` directory the system prompt names. Do not glob across `~/.cursor/projects/*/`. That crosses workspace boundaries and reads private chats from unrelated projects.
```

**Replace**

```text
Before fanning out, find this conversation's transcript. In DeepSeek Harness, `agent-transcripts/` is not a real path and `~/.cursor/projects/*/` must never be read. When the optional `@deepseek-ai/dsh-experimental-session-search` bundle is installed, call `session_event_search` with this Session's id and inspect matching events with `session_trace` / `session_event_read`. Without it, skip the directory lookup and pass a tight digest of the current conversation instead.
```

## `skills/reflect/SKILL.md`

**Find**

```text
ls -t <agent-transcripts>/*.jsonl <agent-transcripts>/*/*.jsonl <agent-transcripts>/*/subagents/*.jsonl 2>/dev/null | head -10
```

**Replace**

```text
# No agent-transcripts lookup in DeepSeek Harness. Use session_event_search with the current Session id when available.
```

## `skills/reflect/SKILL.md`

**Find**

```text
That covers the legacy flat (`<id>.jsonl`), current nested (`<id>/<id>.jsonl`), and subagent (`<parent>/subagents/<child>.jsonl`) layouts. For each candidate, read the first JSONL line. Take the file whose `message.content[0].text` contains the conversation's opening user prompt. If none matches, pass a tight digest of the session instead.
```

**Replace**

```text
If session-search is unavailable, skip the transcript lookup. Pass a tight digest of the session instead, and say that the transcript itself was not readable.
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

## `skills/why/SKILL.md`

**Find**

```text
Every spawn is `generalPurpose` with `readonly: false` (agent mode). **Do not use readonly/Ask mode.** It strips MCP access, which disables the MCP-backed investigators and the synthesizer's citation spot-checks. Investigators still shouldn't write anything.
```

**Replace**

```text
Every spawn uses `agent: "general"`. Do not pass a `readonly` field; DSH has no such field, and read-only mode does not control MCP access. Tell every investigator and the synthesizer not to edit files. MCP tools come from the profile's configured MCP servers.
```

**Find**

```text
Before spawning investigators, list the available MCPs from the Cursor environment. Use the available-tools map when present. Otherwise inspect the `mcps/` directory Cursor exposes for enabled MCP servers.
```

**Replace**

```text
Before spawning investigators, list the MCP tools the current profile exposes. In DeepSeek Harness, MCP servers are configured through `@deepseek-ai/dsh-mcp-client`; inspect the tools available to this session or the profile's MCP config. Do not look for a Cursor `mcps/` directory.
```

**Find**

```text
Record ambiguous cases in the coverage map.
```

**Replace**

```text
Record ambiguous cases in the coverage map. If the profile has no MCP client or no configured servers, say so in the coverage map and use `git`, `gh`, the local repository, and documents the user supplies; mark the other six categories unavailable instead of guessing.
```

## `skills/reflect/SKILL.md`

**Find**

```text
One message, three `Task` calls, `subagent_type: generalPurpose`, agent mode (`readonly: false`). Reviewers need MCP access to look up the tickets, chat threads, and observability traces the transcript references, and readonly strips MCPs.
```

**Replace**

```text
One message, three `Task` calls, `agent: "general"`. Reviewers must not edit files. In DeepSeek Harness MCP access comes from the profile's configured MCP servers; a child's read-only instruction neither adds nor removes MCP tools. If MCP is not configured, reviewers work from the transcript digest, repository files, `git`, and `gh`, and say which evidence was unavailable.
```

**Find**

```text
One `Task` call, `subagent_type: generalPurpose`, `model` from the `reflect judgment, divergent, synthesizer` line (default `claude-opus-5-5-xhigh`), agent mode (`readonly: false`). It spot-verifies citations through MCP, and readonly strips MCPs.
```

**Replace**

```text
One `Task` call, `agent: "general"`, `model` from the `reflect judgment, divergent, synthesizer` line (default `claude-opus-5-5-xhigh`). It spot-verifies citations through MCP when the profile configures an MCP client, and otherwise checks them against the transcript digest, repository files, `git`, and `gh`.
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
spawn Cursor subagents with per-role models, and Custom Modes and `/loop` are Cursor features, so those parts may not work there.
```

**Replace**

```text
spawn subagents with per-role models through `pstack_subagent`, and the poteto-mode preset and the goal/schedule follow-ups are DSH features, so those parts may not work there.
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

## `skills/poteto-mode/SKILL.md`

**Find**

```text
**Match the model to the job.** Before each spawn, start from the role's line or default and pick the reasoning level and speed the job needs. The `/setup-pstack` budget sets each role's starting level, xhigh by default. Raise it one step, up to max, for the hardest or subtlest work. Lower it one step for judgment and two or more steps for routine work. Use fast mode only when the job is urgent, meaning CI or trunk is red or a person is blocked on the result right now. Otherwise use standard speed, the same slug without `-fast`. Verification is the exception and stays on the `swarm workers` model and speed (`grok-4.7-xhigh-fast` by default). Change only the effort level and whether the slug is fast, and keep the family the role names, so a diverse panel stays diverse. If the family has no slug at that level and speed, use its nearest slug. A role on `auto` or `inherit-parent` stays on the parent model. If the Task tool rejects the adjusted slug, do not try another adjusted slug. Use the role's line or default and say so. If the Task tool rejects that too, continue with the calling skill's fallback. A slug counts as rejected once a Task error says that the model is not valid, or leaves the slug out of its list of valid slugs. Never pass a rejected slug, and skip any fallback whose slug is already rejected. When the calling skill has no fallback, use the closest valid slug of the role's family from the error's list of valid slugs, or omit `model` so the subagent runs on the parent model when the list has none. When the calling skill's fallback runs out of slugs without saying what to do next, omit `model` too. Say so in both cases.
```

**Replace**

```text
**Match the model to the job.** Before each spawn, start from the role's line or default and pick the reasoning effort the job needs. The `/setup-pstack` budget sets each role's starting effort, xhigh by default. Raise it one step, up to max, for the hardest or subtlest work. Lower it one step for judgment and two or more steps for routine work. Pass the effort as `reasoningEffort` on `pstack_subagent`; DeepSeek Harness has no separate speed or fast-mode parameter. Verification is the exception and stays on the `swarm workers` role. Change only the effort level and keep the family the role names, so a diverse panel stays diverse. A role on `auto` or `inherit-parent` stays on the parent model. If the route rejects the chosen model or effort, do not try another adjusted value. Use the role's line or default and say so. If that is rejected too, continue with the calling skill's fallback, or omit `model` so the subagent runs on the parent model. Say so in both cases.
```

## `skills/arena/SKILL.md`

**Find**

```text
If the Task tool rejects a configured entry, run that seat on its family's default and say so. Families go by prefix: `claude-*`, and `grok-*` with `cursor-grok-*` and `composer-*`. A refused `composer-*` entry runs on `grok-4.7-xhigh-fast`. If the family has no default, or the Task tool rejects that default, use the closest valid slug of the same family from its error message, or drop the seat and say so when there is none.
```

**Replace**

```text
If `pstack_subagent` rejects a configured entry, run that seat on its role's default and say so. A role set to `inherit-parent` or `auto` runs on the parent model. If the role has no usable route, omit `model` so the seat runs on the parent model, or drop the seat and say so when there is none.
```
