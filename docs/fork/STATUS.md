# Fork status

Updated 2026-11-06.

## A. Fork foundation

| Item | Status | Evidence |
|---|---|---|
| FND-01 GitHub fork and remotes | Done | `origin` = `https://github.com/paipaipai666/dsh-pstack.git`, `upstream` = `https://github.com/l246804/dsh-pstack.git`; `fork/main` pushed |
| FND-01 package rename | Pending | Package remains `dsh-pstack`; publish as `@paipaipai666/dsh-pstack` after release smoke |
| FND-02 DSH 0.2.2-rc.1 baseline | Done | `dsh --version` = `0.2.2-rc.1`; temp `DSH_HOME` installed published `dsh-pstack@0.2.1`; the fork tarball from CI run 42153283637 installed as `dsh-pstack@0.3.0-beta.1`; `--dump-config` showed all rows; CI build/test passed on Linux and Windows |
| FND-03 PR CI with Windows runner | Done | GitHub Actions run [42152714331](https://github.com/paipaipai666/dsh-pstack/actions/runs/42152714331) is green for both jobs |
| FND-04 upstream sync workflow | Done | `.github/workflows/upstream-sync.yml` |
| FND-05 fork docs and notice | Done | `FORK.md`, `NOTICE`, `CHANGELOG.md` |
| FND-06 environment check | Done | `pnpm fork:check` / `scripts/fork-check.mjs` |

## Fixes found while making CI green

- `tests/optional-plugins.test.ts` hardcoded `0.2.1`; now matches the fork version.
- `tests/script.test.ts` assumed POSIX paths; now platform-aware.
- `pstack/scripts/generate-pstack-harness-tree.mjs` failed on Windows CRLF and backslash path separators; both fixed.
- CI originally ran tests before build; build-dependent tests now run after build.

## B. Fixes

| Item | Status | Evidence |
|---|---|---|
| FIX-03 default subagent depth | Done | `cordis.patch.yml` and generated `dsh.md` now use `maxDepth: 3`; CI run [42154085255](https://github.com/paipaipai666/dsh-pstack/actions/runs/42154085255) |
| FIX-04 Cursor Custom Mode docs | Done | Removed the false Option+Enter/Custom Mode instructions from `poteto-help`, setup guide, and poteto-mode guide; exact rewrites live in `pstack/scripts/generate-pstack-harness-tree.mjs` |
| FIX-01 `pstack_script` approval | Done | `pstack_script` now requests `ctx.approval.request` and fails closed without an answerer; unit tests cover missing/rejected approval; CI green |
| FIX-02 root `pstack` preset | Done | Added `pstack` agent preset with persistent poteto-mode persona and full tool composition; installed tarball boots a temp DSH web host with the preset in `--dump-config` |
| FIX-05 native skill text | Partial | Custom Mode rewrites shipped; remaining `Task`/`subagent_type`/model-slug text is still upstream |
| FIX-07 subagent argument schema | Pending | Optional delegation arguments still require explicit nulls |
| FIX-08 real DSH integration tests | Partial | `scripts/smoke-install.mjs` installs a built tarball into an isolated `DSH_HOME` and asserts every bundle row; not yet wired into CI or model-backed sessions |
| ADD-01 `pstack_doctor` | Done | New `pstack_doctor` tool; unit tests and CI green |

## Still open

- Publish the fork as a scoped npm package; package name rename is a release task.
- Install the built fork into an isolated `DSH_HOME` and run `/poteto-mode` end to end.
- Local developer environment: this machine's sandbox blocks pnpm store locks, so local install/build is not yet run outside CI. CI is the authoritative build signal for now.
