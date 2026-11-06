# Compatibility baseline

## Target

| Item | Value |
|---|---|
| Installed app | `D:\DeepSeek Harness\DeepSeek Harness.exe` |
| App / Electron | Electron `44.7.0` |
| DSH CLI | `D:\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd` |
| DSH version | `0.2.2-rc.1` |
| Bundled runtime Node | `v24.21.0` |
| Fork source | `l246804/dsh-pstack` `v0.3.0-beta.1` |
| Upstream pstack | `0.15.36` |

## Verified on 2026-11-06

- `dsh --version` returns `0.2.2-rc.1`.
- A temporary `DSH_HOME` installed the published baseline `dsh-pstack@0.2.1`.
- `dsh --profile web --dump-config` showed all six `dsh-pstack` rows:
  `pstack`, `pstack-models`, `pstack-roles`, `pstack-role-catalog`, `pstack-subagent`,
  `pstack-script`, plus the two agent presets.

This proves the DSH 0.2.2-rc.1 plugin installation path and bundle layer are compatible with
the upstream package. It does not yet prove the fork build, because the fork has not been
built in this environment.

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
