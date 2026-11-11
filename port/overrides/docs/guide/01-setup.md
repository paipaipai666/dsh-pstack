# Set up pstack

In this page you install the plugin, pick which models pstack uses, and run your first task. Setup is one command plus a short conversation.

## Install the plugin

Install the package into a DeepSeek Harness profile:

`dsh plugin --profile web add @paipaipai666/dsh-pstack`

For a local build, pass the tarball path instead. The plugin ships the skills, the agents, and five fixed script entry points. The [DSH adapter](../harness/dsh.md) maps every Cursor name and lists the optional official plugins.

## Pick your models

Run:

```text
/setup-pstack
```

[`/setup-pstack`](../../skills/setup-pstack/SKILL.md) reads the models this deployment serves with `pstack_models`, asks for a reasoning budget, shows you each role (code delegates, judgment, the review panels), and asks what you want. Answer the questions. It writes `$DSH_HOME/pstack-models.mdc`, a plain role file every pstack skill reads. The file has no frontmatter.

The defaults run at `xhigh` reasoning, the same as the `large` budget. `unlimited` lifts each model to its highest tier, up to `max`. `medium` and `small` lower the reasoning and spend fewer tokens.

You only override what you care about. A role with no line in the file inherits from the parent session. To restore a default, delete that role's line. A rerun of `/setup-pstack` keeps any role whose model differs from the default. When a default changes, a line written before the change still pins the old default, so delete those role lines, or delete the file, then run `/setup-pstack` again.

You might be wondering what happens if you use Auto. Set a role to `inherit-parent` or `auto` and pstack omits the subagent `model` field, so the subagent inherits your parent session model. Both values mean the same thing, and neither is a model slug. For a panel role the value is a list, and one subagent runs per entry, so the list length sets the panel size. Setup also configures `swarm workers`, the default model for every `/swarm` worker unless a race names a model for each arm.

## Accept the verification offers, or don't

At the end of setup, `/setup-pstack` looks for a way to prove app behavior in your project, either a `verify-*` skill or an existing harness. If it finds neither, it offers once to generate one with [`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes `.dsh/skills/verify-<app>/`, a project-local skill that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. You can run `/create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers it in depth.

If you're new to pstack, say yes. An agent that can check its own work keeps going until the check passes. An agent that can't hands every result back to you to check by hand. Of everything in this guide, the verification skill pays off the most.

Then setup offers once to generate a formal verification skill with [`/create-formal-verification-skill`](../../skills/create-formal-verification-skill/SKILL.md), unless the project already has one. Tests check the cases someone thought to write. A formal verification skill checks one key property of your code, such as "a job never runs twice at once", in every case within a stated scope. Say yes when your code has concurrency, retries, a state machine, or a parser, where a bug is costly and tests rarely reach the case that breaks. Otherwise say no, and run it later if that changes. [Verify and ship](./06-verify-and-ship.md#prove-a-property-with-a-formal-verification-skill) covers it.

After setup, start a new session. The role file applies to new delegations.

## Enable the optional plugins

Two optional official bundles remove common downgrades. Enable them in the same profile as pstack.

- `@deepseek-ai/dsh-experimental-session-search` adds `session_search`, `session_event_search`, `session_trace`, and `session_event_read`. Without it, `why`, `recall`, and `reflect` cannot inspect earlier chats and must fall back to a digest you provide.
- `@deepseek-ai/dsh-experimental-forge-bundle` adds the pull-request panels and `create_worktree`. Without it, those skills fall back to `gh` and `git worktree add`.

## Keep the cost in check

pstack spends extra tokens on subagents and review panels. That's the price of the rigor. To spend fewer:

- Rerun `/setup-pstack` and pick a smaller reasoning budget or cheaper models. A strong model in the main chat with cheaper, faster models in the code roles is a good split.
- Set a role to `auto` or `inherit-parent` so it runs on the session's own model.
- Shorten a panel list. Each entry runs one subagent.
- Save `/poteto-mode` for work that needs rigor. A small, obvious edit doesn't.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
/poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. Its first items are the matched playbook's steps copied in, the Feature playbook for this prompt. If `/poteto-mode` skips a step, the step stays in the list with `skip: <reason>`, so you can see what it chose not to do.

From here you can type normal follow-ups. To keep `/poteto-mode` on for the whole session, create the session with the `poteto-mode` root preset instead of typing the skill into one message. The root preset keeps the full skill in the system prompt on every turn. A typed `/poteto-mode` attaches the skill to one message only.

Next: [Route work through `/poteto-mode`](./02-poteto-mode.md).
