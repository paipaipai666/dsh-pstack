# Automations

Cursor ships two things pstack leans on that DSH does not model the same way: a scheduled or
webhook-triggered **automation object**, and a **routine** that a skill can create at runtime. DSH
has no object to create; it has a scheduler, an HTTP webhook seam, and ordinary sessions. This page
is the recipe book for the gap, so a playbook that says "wake this at 07:00" or "let the bot answer
the webhook" has somewhere to land.

Nothing here is bundled with the plugin. Every recipe uses a host tool, an official package, or a
third-party package by name.

## Capability map

| Cursor concept | DSH equivalent | Notes |
| --- | --- | --- |
| Scheduled automation | `schedule_create` | Recurrence is an RFC 5545 subset; delivery is a user message in a target session. |
| Triggered automation on an event | `ctx.webhookRuntime` via `@deepseek-ai/dsh-webhook` | Process-local rules; the GitHub adapter is the shipped example. |
| Local lifecycle trigger | `dsh-automations` (community) | Fires on session start/idle/end, tool results, user messages, intervals. |
| Routine object (`update_state`) | Not modelled | Compose a schedule or a webhook instead; there is no object to create or await. |
| `SendToUser` prompt for a secret | Not modelled | Ask in the session that owns the work, or store a credential reference for the webhook. |
| Action on a cloud VM | `pstack_remote` + a machine you run | The plugin never provides the machine; see [remote-worker.md](./remote-worker.md). |

## 1. Time-based work

`schedule_create` takes an RRULE and a target. Use `new_once` for a recurring report in a fresh
session, `this_session` for reminders in the conversation that set them up.

```text
schedule_create({
  title: "Triage overnight issues",
  rrule: "DTSTART;TZID=Asia/Singapore:20261111T070000\nRRULE:FREQ=DAILY;BYHOUR=7;BYMINUTE=0",
  target: "new_once",
  prompt: "Run /github-triage against paipaipai666/dsh-pstack and open a draft PR for anything that reproduces.",
})
```

A scheduled message is a normal user message: it runs with whatever approval policy the session has.
See the approval note below before you point one at an unattended task.

## 2. Event-driven work

The official webhook package turns an authenticated delivery into a session. The GitHub adapter is
the worked example: a second WebServer binds `127.0.0.1:3081`, accepts `POST /github`, verifies the
signature, and starts a session only when one of your rules matches.

```powershell
dsh plugin --profile web add "@deepseek-ai/dsh-webhook@0.2.2-rc.1" "@deepseek-ai/dsh-webhook-github@0.2.2-rc.1"
dsh web --patch "$env:DSH_HOME\profiles\web\node_modules\@deepseek-ai\dsh-webhook-github\examples\github-review\cordis.yml"
```

`202 Accepted` means the signature and JSON were accepted. It does **not** mean a rule matched or a
session started. The runtime is fire-and-forget: a crashed host loses deliveries that had not become
sessions yet, and there is no dedupe or completion status. Put the endpoint behind a tunnel or a
tailnet address, not the public internet.

## 3. Local triggers

`dsh-automations` (community, `439436269-ctrl/dsh-automations`) covers what the scheduler cannot:
`startup`, `session-start`, `session-idle`, `session-end`, `user-message`, `tool-after`, `daily`,
`interval`, and `manual`. An action is a local command, an HTTP request, or a run entry.

This is a third-party package. Read its README before you give it a command that can write to a
repository.

## 4. Acting on another machine

When the work belongs on a machine you run, dispatch it with `pstack_remote` instead of pretending a
cloud VM exists:

```text
pstack_remote({ action: "run", target: "build-box", workspacePath: "/srv/app", task: "Run /how on the failing migration", })
```

Register the target in the `pstack-remote` row. The remote side needs `dsh` on `PATH` (ssh) or a
worker that implements [the worker contract](./remote-worker.md) (http). The job runs there, the
records stay here, and closing the laptop does not kill it — but nothing in this plugin starts or
provisions that machine.

## 5. Approval while nobody is watching

`pstack_remote` asks before it dispatches by default, and `pstack_script` asks before it runs a
bundled script. An unattended schedule or webhook delivery cannot answer a prompt, so the dispatch
sits until someone shows up.

Two honest options:

- Keep `mode: ask` and treat the automation as "work queued for a human", which is often what a
  triage automation should be.
- Set `mode: allow` on the row **only** for targets and scripts you trust with the profile's full
  permissions, and keep the machine's own surface small (a dedicated user, no push credentials).

There is no per-run bypass flag. Choosing `allow` is a configuration decision, not a prompt answer.

## What is still missing

- No automation/routine object, so a skill cannot create, list, or await one.
- No `SendToUser` request for a secret mid-routine.
- No hosted machine, container lifecycle, or VM snapshot: `pstack_remote` dispatches to infrastructure
  you already run.
- No delivery log or retry policy for webhooks.