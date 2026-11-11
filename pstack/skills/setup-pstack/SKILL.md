---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects the routes this deployment serves and writes $DSH_HOME/pstack-models.mdc, the role file pstack_subagent reads on every delegation. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

In DeepSeek Harness, read [the DSH adapter](../../docs/harness/dsh.md) once per session before you follow this skill. It maps the Cursor names in pstack skills to DeepSeek Harness.

Write `$DSH_HOME/pstack-models.mdc`, the role file `pstack_subagent` reads on every delegation.

## Steps

### 1. Detect available routes

Run `pstack_models`. It reports the live providers, models, and the reasoning-effort tokens each route advertises. A route is written `<provider>/<model> [effort]`, and the effort must be one that route advertises. `inherit-parent` and `auto` are always valid even though they are not routes. If `pstack_models` reports no usable route, ask the user to paste the routes they have access to. Never write a route you have not confirmed is available.

### 2. Load current state

The default role-to-route mapping is the shape shown in step 5. If `$DSH_HOME/pstack-models.mdc` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from the baseline in step 5. Role names come from the `pstack_roles` manifest. A line whose role is not in that manifest is retired. Report it by line number, drop it from the new file, and tell the user.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer `ask_user_question` over free text. Offer these four options with these exact labels, and name the current budget when the file records one. With no file, say that `large` matches the skill defaults.

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the defaults. For each role, keep `inherit-parent` and `auto` unchanged. For every real route, move its effort token to the tier target on the ladder `max` > `xhigh` > `high` > `medium` > `low`. If the route does not advertise the target, use the highest advertised effort at or below the target, and say so. If every advertised effort is above the target, ask the user to choose. If the route advertises no effort, keep it without a bracketed effort and say so. `unlimited`, `large`, `medium`, and `small` target `max`, `xhigh`, `high`, and `medium`. For panel roles (arena runners, architect runners, interrogate reviewers), the value is a list and one child runs per entry, so the list length sets the count. `arena cross-judge pool` is a list too, but one judge is chosen. Order it by preference and prefer a family other than the parent's. `swarm workers` is the default route for every worker unless a race assigns another route per arm.

**(c) Show the roles and confirm.** Show every role with its route, marking any route the user must choose. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the routes `pstack_models` returned plus `inherit-parent` and `auto` (both mean the role runs on the parent chat model). Prefer `ask_user_question`.

### 4. Validate

Every real route written must be in the `pstack_models` output, and every bracketed effort must be advertised by that route. `inherit-parent` and `auto` always pass. If a chosen route is not available, stop and ask again.

### 5. Write the file

Write `$DSH_HOME/pstack-models.mdc` with no frontmatter. Start with the comment lines and the `# budget:` line, then one line per role, using the role keys from the `pstack_roles` manifest. Overwrite the whole file so reruns stay idempotent. Shape:

```text
# pstack model configuration. One line per role. Delete a line to inherit the parent route.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model.
# budget: large (xhigh)
feature, refactoring: inherit-parent
bug-fix: inherit-parent
perf-issue: inherit-parent
hillclimb: inherit-parent
judgment and prose: inherit-parent
hardest tasks: inherit-parent
how explorer: inherit-parent
how explainer: inherit-parent
why investigators: inherit-parent
why synthesizer: inherit-parent
reflect tooling: inherit-parent
reflect judgment, divergent, synthesizer: inherit-parent
arena runners: inherit-parent
arena cross-judge pool: inherit-parent
swarm workers: inherit-parent
architect runners: inherit-parent
interrogate reviewers: inherit-parent
```

Never put role lines in `AGENTS.md` or `CLAUDE.md`.

### 6. Confirm

Tell the user the role file was written and that `pstack_subagent` reads it on every delegation, so the next child uses it without a restart. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, invoke `/create-formal-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.
