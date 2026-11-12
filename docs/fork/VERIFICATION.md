# Verification matrix

This page records what is verified automatically, what needs a real model, and what needs a human
at the Desktop.

## Ordinary CI

`pnpm run ci` runs these steps on Linux:

| area | command | what it proves |
| --- | --- | --- |
| lint and types | `vp check`, `vp run typecheck` | source and test type checking |
| unit and integration | `vp test` | 30 test files, including the fake-host subagent, remote worker, script policy, catalog translation, and playground case definitions |
| generated tree | `vp run generate:check` | `pstack/` matches `port/generate.mjs` byte for byte |
| audit lock | `vpx port/scan.mjs --check-lock` | every audited upstream line still matches its source digest |
| audit references | `vpx port/scan.mjs --check port/audit.md` | every `path:line` reference in the audit still resolves |
| compatibility | `vp run compatibility:check` | README metadata matches `port/audit.lock.json` |
| build | `vp run build` | pack, runtime script replacement, and skill catalog translation |

The unit suite uses a fake DSH runtime. It does not prove that the real Host starts a real child
agent, mounts the real skill catalog, or opens the Desktop approval dialog.

## Desktop E2E

`pnpm run test:desktop` runs `scripts/desktop-e2e.mjs`. It starts the local Desktop Electron with
`ELECTRON_RUN_AS_NODE=1`, imports `dist/script.mjs`, and checks that all five `pstack_script` ids
start under the Desktop runtime. It is Windows only and needs `D:\DeepSeek Harness\DeepSeek
Harness.exe`. It does not use a model.

## Optional real-model playground

`.github/workflows/e2e.yml` is `workflow_dispatch` only. Set these repository secrets:

- `PLAYGROUND_CONFIG_JSON`: the `playground/config.json` provider and API key map.
- `PLAYGROUND_HOME_PATCH_YAML`: the full `llm-pi-ai` plus `agent-default-model` patch that
  `playground/cases-run.mjs` reads from `playground/.dsh/cordis.patch.yml`.

The workflow runs `vp run playground:prepare`, `vp run cases:check`, and `vp run cases`. It runs
18 cases, including `CASE-PSTACK-SCRIPT-LOG-01`, which calls `pstack_script` with `id: "log"` and
checks the TSV file it writes. It costs real model tokens and is skipped unless the secrets are set.

## Optional plugin load

`pnpm run test:optional-plugins` creates a throwaway headless profile, installs
`@deepseek-ai/dsh-experimental-session-search`, and checks that its rows appear in `dsh --dump-config`.
It proves the bundle is on the host's load path, not that a model used its tools. Pass `--plugin` to
check another bundle.

## Manual Desktop checks

These are not automated because they depend on a human decision or a local UI:

- The approval dialog for a `pstack_script` call with `mode: ask`.
- The plugin configuration page and its enable, disable, and reinstall actions.
- The role settings page after `/setup-pstack` writes `$DSH_HOME/pstack-models.mdc`.
- A real subagent delegation in the Desktop, checking that the parent gets a completion notice
  rather than a blocking return.

## Remote worker

`tests/remote.test.ts` starts a local `http` worker and checks `POST /jobs`, NDJSON streaming,
`x-remote-job-id`, and token handling. `docs/remote-worker.md` contains the minimal worker used
as the contract reference.
