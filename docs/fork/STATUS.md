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

## Still open

- Publish the fork as a scoped npm package; package name rename is a release task.
- Install the built fork into an isolated `DSH_HOME` and run `/poteto-mode` end to end.
- Local developer environment: this machine's sandbox blocks pnpm store locks, so local install/build is not yet run outside CI. CI is the authoritative build signal for now.
