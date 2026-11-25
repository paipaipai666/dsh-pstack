# Skill discovery experiment

Updated 2026-11-25. Answers one question: **can an agent find and load a pstack skill on its own, and
what is the cheapest mechanism that makes it do so?** Runs live in `playground/exp-skill-discovery.mjs`
against `playground/exp/tasks.mjs`; raw sessions land in `.tmp/exp/`.

A second experiment in the same file picks up where the first one stopped: the skill catalog decides
nothing if the session never gets as far as a skill. See [Playbook routing](#playbook-routing).

## The constraint being tested

58 of the 59 generated pstack skills ship with `disable-model-invocation: true` (only `setup-pstack` is
model-invocable). `dsh-tool-skill` therefore keeps them out of the session skill catalog, and its
`/name` gesture is the only entry point — the same shape `port/audit.md` already records as CAP-004.
`pstack_skill` can load a hidden skill, but only once something has told the model its name.

So the question is not "is the tool missing" but "does the model know the name".

## Arms

All arms run the root `poteto-mode` preset headlessly (`dsh --profile … --json`), same model, same
prompts. Only the skill-provider rows differ.

| Arm | Mechanism | Fixed context cost |
|---|---|---|
| a | baseline, nothing changed (58 hidden) | 12,461 |
| b | all 59 skills visible: a `dsh-skill-filesystem` row over copies with the flag stripped | 15,331 (+2,870) |
| c | `pstack-skill-index` opt-in: one line per hidden skill, 96-char cap | 14,585 (+2,124) |
| d | same index, 110-char cap, trigger clause preferred over the summary | 14,745 (+2,284) |
| e | curated: only 10 entry skills visible (`architect`, `sharpen`, `unslop`, `statechart`, `interrogate`, `how`, `why`, `teach`, `figure-it-out`, `technical-writing`) | 12,874 (+413) |

Fixed context cost is the median first-step prompt of runs that loaded no skill, so it isolates the
catalog/index from downstream work.

## Results

First skill the session loaded, per task. `✓` correct on the first call, `✗` none or wrong.

| task | a | b | c | d | e |
|---|---|---|---|---|---|
| unslop | 0/2 | 1/1 | 0/2 | 0/1 | 2/2 |
| statechart | 0/1 | 1/1 | 0/1 | 0/1 | 1/1 |
| interrogate | 0/2 | 1/1 | 0/2 | 0/1 | 1/2 |
| teach | 0/2 | 0/1 | 1/2 | 0/1 | 0/2 |
| sharpen | 0/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| technical-writing | 0/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| why | 0/1 | 0/1 | 0/1 | 0/1 | 0/1 |
| decision-write (visible control) | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| plain-code (no-skill control) | 0 loads | 0 loads | – | – | 0 loads |
| chitchat (no-skill control) | 0 loads | 0 loads | – | – | 0 loads |

Non-control hit rate: **a 0/10 · b 5/7 · c 3/10 · d 2/7 · e 6/10**.

## What the numbers say

1. **Hiding is the whole problem.** With nothing changed the model answers every task itself and loads
   nothing. In arm a the one exception is a late `sharpen` load that only happened after the model
   read the routing sentence in the persistent `poteto-mode` section — proof that a name in prose
   sometimes works, and that the section, not the catalog, was doing the work.
2. **Visibility is what fixes it.** Arm b loads the right skill on 5 of 7 covered tasks. The catalog is
   the only mechanism that reliably changes the first move.
3. **A side-channel index is a bad trade.** Arms c and d pay 74–80% of the catalog's context cost and
   recover under a third of its routing. The index only fires when the Chinese prompt happens to match
   the English trigger wording (`sharpen`, `technical-writing`); semantic matches (`unslop`,
   `interrogate`) do not.
4. **A curated catalog is the good trade.** Arm e reaches 6/10 at +413 tokens — it matches arm b on six
   of the seven covered tasks and loses only the second `interrogate` repeat.
5. **Auto-trigger is not universal.** `teach` and `why` miss in every arm, including the full catalog.
   Those are description/scope problems, not discovery problems.
6. **No false triggers observed.** Two unrelated probes (`plain-code`, `chitchat`) produced zero loads
   in arms a, b, and e. This is a small sample; over-triggering remains the risk to watch when widening
   the visible set.
7. **Downstream cost dwarfs catalog cost.** A fired skill multiplies the session: arm b's `sharpen` run
   spent 1.87M prompt tokens over 34 steps. Budget the work the skill causes, not the 3k of catalog.

## Playbook routing

The first experiment measures what happens once the model is looking at a skill. Most sessions never get
that far: in arm a the model answered every task by itself, and even in arm b it loaded a skill only when
the description happened to match the way the request was phrased.

pstack's own entry point is not a skill but a playbook. `pstack/skills/poteto-mode/SKILL.md` says "Match
the task to a playbook and open its steps at `playbooks/<title>.md`", and the 22 playbooks carry the
per-stage schedule and the dimension checklists that the skills hang off. Nothing in DSH routes to them;
the sentence only works if the model already decided to open `poteto-mode`.

So the second experiment asks the narrower question: **does an explicit routing decision make the session
open the playbook it was routed to?**

### Mechanism

`src/playbook-router.ts` (mounted as `pstack-playbook-router`) listens on `agent/pre-step` and, on the
first step of a turn, makes one routing call over the playbook index — 22 playbooks, 3,431 characters
≈ 953 tokens. It replies with `{"playbook": "<id>" | null, "why": "<12 words>"}`; the plugin appends a
short notice naming the playbook and the `pstack_skill` resource path, or nothing at all when the answer
is `null`. Cost per turn is about 1,000 prompt tokens and 1.1–2.3 s, inside the turn, before the model
sees anything.

The router never loads a playbook itself. It only names one, which keeps the decision auditable and the
failure harmless: a wrong name costs one sentence, not an injected playbook body.

### Results

`playground/exp-playbook-router.mjs`, six tasks, `runs` capped at 60 s each, one run per cell. `✓` the
session opened the expected playbook, `✗` it opened none or a different one.

| task | a: baseline | r: router |
|---|---|---|
| feature-entry | ✗ none | ✗ multi-phase-plan |
| bug-entry | ✗ none | ✗ none (route invalid) |
| refactor-entry | ✗ none | ✓ refactoring |
| investigate-entry | ✗ none | ✓ investigation |
| plan-entry | ✗ none | ✓ multi-phase-plan |
| small-control | ✗ none | ✗ none (correct) |

Non-control hit rate: **a 0/5 · r 3/5**. False positives on the control: 0 in both arms.

### What the numbers say

1. **The baseline never opens a playbook.** Zero reads across six tasks, including the three large ones
   that spent 648k–798k prompt tokens looking around the repository. The routing sentence in
   `poteto-mode` does not fire on its own.
2. **When the router produces a valid route, the read is deterministic.** Four of four routed runs opened
   exactly the named playbook as their first playbook read. The gap between "the host decided" and "the
   model decided" is the whole effect: same model, same prompt, 0 → 4.
3. **The failure moved upstream, with two distinct causes.** `feature-entry` was routed to
   `multi-phase-plan` — the session obeyed and read the wrong playbook, which is a top-1 disambiguation
   problem in the playbook taxonomy (`feature` and `multi-phase-plan` overlap for a large feature).
   `bug-entry` produced no JSON at all — `{"kind":"invalid","detail":"no JSON object in answer"}` after
   2.3 s, a robustness problem: a reasoning model can spend its budget thinking and return prose.
4. **Routing is not expensive.** ~1k prompt tokens and ~1.5 s per turn, and the routed runs were not more
   expensive than the baseline runs (`plan-entry` 301k routed vs 724k baseline). Both arms are truncated
   at 60 s, so those totals compare "work done in a minute", not work completed.
5. **The control stayed quiet.** `small-control` routed `null` in 1.1 s and read nothing.

## Decision this supports

The vehicle the original request proposed — an agent preset — is right, but it needs two mechanisms for
two different lists:

- **A routing decision for the entry layer.** One cheap call per user message picks a playbook; the
  playbook then carries the stage schedule and the dimension checklist, and names the skills to load at
  each stage. This is the part that turns "40+ skills" into "one decision, then a short list".
- **Catalog visibility for a curated skill set.** A preset that mounts a second skill provider over a
  generated tree of a few entry skills with `disable-model-invocation` stripped, leaving the long tail
  behind `pstack_skill`. Arm e gets 6/10 at +413 tokens; the full catalog gets 5/7 at +2,870.

Neither replaces the other: routing fixes "the session never looked", visibility fixes "the model cannot
see what it could load". `/name` stays as the manual override.

Before shipping the router, three things need work, in this order: repair an unparseable route (retry
once, or fall back to no notice); resolve the `feature` / `multi-phase-plan` overlap, or let the routed
playbook hand off; then record planned-vs-actual loads, because the first two failure modes are invisible
without a trace.

`src/skill-index.ts` is the experiment's arm-c/d row. It is built and exported, mounted by no preset,
and the numbers above argue against shipping it. `src/playbook-router.ts` is the routing row: built,
tested, mounted by no preset yet.