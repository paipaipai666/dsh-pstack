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
