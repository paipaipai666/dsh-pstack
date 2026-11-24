# Compatibility baseline

## Target

| Item | Value |
|---|---|
| Installed app | `D:\DeepSeek Harness\DeepSeek Harness.exe` |
| App / Electron | Electron `44.7.0` |
| DSH CLI | `D:\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd` |
| DSH version | `0.2.2-rc.5` |
| Bundled runtime Node | `v24.21.0` |
| Fork source | `l246804/dsh-pstack` `v0.3.0-beta.1` |
| Upstream pstack | `0.15.46` |

## Verified on 2026-11-22

- `@deepseek-ai/dsh` `0.2.2-rc.5` is the newest published host; the Desktop build on this
  machine is still `0.2.2-rc.3`.
- Every `@deepseek-ai/*` package this plugin imports was compared rc.3 → rc.5. The only type
  change anywhere is `CONTENT_REFUSED` in `@deepseek-ai/dsh-llm`'s `LLM_FAILURE_CODES`;
  `dsh-api-remotes` ships a regenerated client bundle with no exported type change. No package
  pstack imports moved a signature, so rc.5 needs no migration.
- `presets/standard.patch.yml` and `presets/cordis.patch.yml` are byte-identical between rc.3
  and rc.5. They had already drifted from the rc.1 fixture: `tool-office`, a
  `skill-filesystem` `config.customSkillDirs`, and `tool-subagent-control`
  `config.interrupt: false`. The fork now mirrors all three and tests against an rc.5 fixture.
- rc.5 changes behavior rather than contracts: official DeepSeek requests carry
  `safety_check { level: high }`, and a refusal arrives as `CONTENT_REFUSED`, billed and never
  retried. `pstack_subagent` names that code instead of passing the provider message through,
  and the poteto-mode brief says not to retry the same brief.
- `engines.dsh` stays `>=0.2.2-rc.2`: nothing pstack calls is new in rc.5, so the compatibility
  key `dsh-0.2.2-rc.2+port-v1` does not move. The audit baseline does move: `port/audit.md` and
  `port/audit.lock.json` are re-stamped to `dsh-0.2.2-rc.5@pstack-0b46ec3...` as a `normal`
  transition, because the per-capability `sourceDigest`s and all 217 references are unchanged and
  only the DSH-side facts were re-verified.
- The 0.15.47 sync request targets the same upstream commit (`0b46ec3`), so the bundled tree stays
  at `0.15.46`: the re-scan keeps all 67 capability digests and all 217 references, and the lock is
  unchanged. Upstream's 0.15.47 itself is `2dd5c0cc`, which adds `/reframe` and lands after the
  target commit, so `/reframe` belongs to the next sync.

`pnpm preset:drift` compares the vendored fixtures with the shipped presets and exits non-zero on
drift. Pass `--source=<dir>` to point at an extracted `@deepseek-ai/dsh-web-app` package; CI runs
`--fetch`, which downloads the tarball for the fixture's version from npm and checks that copy.

## Verified on 2026-11-06 (rc.1, superseded)

- `dsh --version` returns `0.2.2-rc.1`.
- A temporary `DSH_HOME` installed the published baseline `dsh-pstack@0.2.1`.
- `dsh --profile web --dump-config` showed all six `dsh-pstack` rows:
  `pstack`, `pstack-models`, `pstack-roles`, `pstack-role-catalog`, `pstack-subagent`,
  `pstack-script`, plus the two agent presets.

This proves the DSH 0.2.2-rc.1 plugin installation path and bundle layer are compatible with
the upstream package.

The fork's own `Build` and `Test` steps also pass on Linux and Windows in GitHub Actions run
[42153283637](https://github.com/paipaipai666/dsh-pstack/actions/runs/42153283637), which
includes the generated-tree check and a packaged tarball artifact.

The artifact `dsh-pstack-0.3.0-beta.1.tgz` installed into a throwaway `DSH_HOME` with
`dsh plugin --profile web add`, and `dsh --profile web --dump-config` showed all six
`dsh-pstack` rows plus the two presets.

## Version constraints

- The fork declares `engines.node >=24.21.0` so it matches the installed Desktop runtime.
- The installed app bundles Node `v24.21.0`; the upstream package's `>=24.21.1` declaration
  was one patch above what the app actually ships.
- CI uses Node `24.22.1`; the fork still tests a newer runtime, so the lower bound is not
  the only runtime exercised.
- `pstack_script` must still be smoke-tested on Node `24.21.0` before release.

## Repro

```powershell
$env:DSH_HOME = "D:\code\dsh\dsh-pstack\.tmp\dsh-home"
& "D:\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile web add dsh-pstack@0.2.1
& "D:\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" --profile web --dump-config
```
