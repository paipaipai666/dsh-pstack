---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

In DeepSeek Harness, read [the DSH adapter](../../docs/harness/dsh.md) once per session before you follow this skill. It maps the Cursor names in pstack skills to DeepSeek Harness.

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

Before fanning out, find this conversation's transcript. In DeepSeek Harness, `agent-transcripts/` is not a real path and `~/.cursor/projects/*/` must never be read. When the optional `@deepseek-ai/dsh-experimental-session-search` bundle is installed, call `session_event_search` with this Session's id and inspect matching events with `session_trace` / `session_event_read`. Without it, skip the directory lookup and pass a tight digest of the current conversation instead.

```bash
# No agent-transcripts lookup in DeepSeek Harness. Use session_event_search with the current Session id when available.
```

If session-search is unavailable, skip the transcript lookup. Pass a tight digest of the session instead, and say that the transcript itself was not readable.

## 2. Spawn three reviewers in parallel

One message, three `Task` calls, `agent: "general"`. Reviewers must not edit files. In DeepSeek Harness MCP access comes from the profile's configured MCP servers; a child's read-only instruction neither adds nor removes MCP tools. If MCP is not configured, reviewers work from the transcript digest, repository files, `git`, and `gh`, and say which evidence was unavailable.

Each reviewer and the synthesizer name a role line in the `pstack-models.mdc` rule and a default. Set `model` to that line's value, or to the default if the rule or the line is missing. Leave `model` unset when the value is `auto` or `inherit-parent`. If the Task tool rejects a slug, use the default and say so. If it rejects the default, use the closest valid slug of the same family from its error message. Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section of the **poteto-mode** skill.

| Lens | Role line | Default `model` | Prompt template |
|---|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | `claude-opus-5-5-xhigh` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `grok-4.7-xhigh-fast` | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | `claude-opus-5-5-xhigh` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings as completion notices, one per child, after the spawn call returns.

## 3. Synthesize

One `Task` call, `agent: "general"`, `model` from the `reflect judgment, divergent, synthesizer` line (default `claude-opus-5-5-xhigh`). It spot-verifies citations through MCP when the profile configures an MCP client, and otherwise checks them against the transcript digest, repository files, `git`, and `gh`. Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list as a completion notice.

## 4. Structural enforcement check

Move any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably to Backlog. See the **encode-lessons-in-structure** principle skill.

## 5. Apply

Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

File each Backlog item to your team's devex or backlog tracker without waiting. Only the Accepted list waits for approval.

Never edit a skill under `plugins/cache/`. Before approval, show its destination, `.cursor/skills/<skill>/` or `~/.cursor/skills/<skill>/`. After approval, copy the skill folder there and edit the copy. Never open a PR or push.

Follow each approved row's Routing exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): the parent does it directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to Cursor's built-in `create-skill` skill and run its draft / test / iterate loop.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): hand to `create-skill` and run its description-optimization loop.
- `new skill via create-skill: <kebab-name>`: hand creation to `create-skill`. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done.

## 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
