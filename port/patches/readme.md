## `README.md`

**Find**

```text
# pstack

i'm [poteto](https://x.com/poteto).
```

**Replace**

```text
# pstack

> This is the DeepSeek Harness port. Install it with `dsh plugin --profile web add @paipaipai666/dsh-pstack`; read the [DSH adapter](./docs/harness/dsh.md). The install section below describes the upstream Cursor edition.

i'm [poteto](https://x.com/poteto).
```

## `README.md`

**Find**

```text
pstack also ships a dormant [benny automation pack](./automations/benny/). benny triages slack issue reports, then reproduces and fixes confirmed bugs with real ui evidence. its files are not registered as slash skills.

to set it up, point cursor at [`FOR_AGENTS.md`](./automations/benny/FOR_AGENTS.md). setup copies the pack into the target repository at `.cursor/automations/benny/`, enables pstack there for shared skills, and keeps user configuration outside the copied pack. benny runs on cursor automations, so it is cursor-only.
```

**Replace**

```text
pstack upstream also ships a dormant benny automation pack. It is not included in this DSH package: the pack depends on Cursor Automations, which DeepSeek Harness does not provide. For event-driven automation in DeepSeek Harness, use the package's `docs/automations.md` with `schedule_create`, `create_goal`, or the webhook plugin.
```
