# Skill discovery experiment

Updated 2026-11-25. Answers one question: **can an agent find and load a pstack skill on its own, and
what is the cheapest mechanism that makes it do so?** Runs live in `playground/exp-skill-discovery.mjs`
against `playground/exp/tasks.mjs`; raw sessions land in `.tmp/exp/`.

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

## Decision this supports

The vehicle the original request proposed — an agent preset — is right, but the mechanism is not a
router or an index: it is **a preset that mounts a second skill provider over a generated tree of a few
entry skills with `disable-model-invocation` stripped**, leaving the long tail behind `pstack_skill`.

`src/skill-index.ts` is the experiment's arm-c/d row. It is built and exported, mounted by no preset,
and the numbers above argue against shipping it.