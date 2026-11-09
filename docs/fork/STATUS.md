# Fork status

Updated 2026-11-06.

## A. Fork foundation

| Item | Status | Evidence |
|---|---|---|
| FND-01 GitHub fork and remotes | Done | `origin` = `https://github.com/paipaipai666/dsh-pstack.git`, `upstream` = `https://github.com/l246804/dsh-pstack.git`; `fork/main` pushed |
| FND-01 package rename | Done | Package, bundle rows, Client IDs, Remote package, playground profile, and README now use `@paipaipai666/dsh-pstack`; CI run [42173606674](https://github.com/paipaipai666/dsh-pstack/actions/runs/42173606674) is green |
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
| FIX-01 `pstack_script` approval | Done | `pstack-script-policy` returns `{ kind: "ask" }` from `tools/pre-execute`; DSH owns approval and fails closed without an answerer. Config supports `ask`/`allow`/`deny`; tests cover all modes |
| FIX-02 root `pstack` preset | Done | Added `pstack` agent preset with persistent poteto-mode persona and full tool composition; installed tarball boots a temp DSH web host with the preset in `--dump-config` |
| FIX-05 native skill text | Done | Custom Mode rewrites shipped; the skill provider, `pstack_skill` resources, and delegate bootstrap translate Cursor names at load time. A test scans all 58 generated skill bodies and asserts no Cursor-only names reach the model |
| FIX-06 Windows compatibility | Done | Windows CI now runs the full test suite, not only the script smoke; CRLF handling is normalized in the generator, harness-doc checker, and tests |
| FIX-07 subagent argument schema | Done | `description`/`prompt`/`agent` are required; `role`/`roleIndex`/`reasoningEffort`/`cwd`/`maxDepth` are optional and default to null; test added |
| FIX-08 real DSH integration tests | Done | `Install smoke (Linux)` CI job installs `@deepseek-ai/dsh@0.2.2-rc.1`, installs the built tarball into an isolated `DSH_HOME`, and asserts every bundle row; model-backed session coverage remains future work |
| FIX-09 docs and release | Partial | Scoped package rename and README are done; npm `publish --dry-run` passes. Real publish is blocked by an invalid local auth token (`npm whoami` returns E401), which the registry reports as E404 for the not-yet-created package |
| ADD-01 `pstack_doctor` | Done | Commands, scripts, role file, and optional-plugin state; unit tests and CI green |

## Quality audit

- Upstream parity: 58 skills, 23 playbooks, 24 principles, 2 agent definitions, 11 guide pages.
- Test suite: 24 files, about 150 cases; CI runs Linux build/test with a V8 coverage gate, full Windows test, and a real DSH install smoke.
- Coverage gate: lines 50%, functions 45%, branches 40%, statements 50%; CI run [42177056672](https://github.com/paipaipai666/dsh-pstack/actions/runs/42177056672) is green.
- Upstream drift: the submodule commit and checked-out tree hash are pinned in `tests/upstream-drift.test.ts`.
- Full audit: [AUDIT.md](AUDIT.md).

## Still open

- Finish the npm publish. The `~/.npmrc` token (`npm_…`, granular) currently fails `npm whoami` with E401; an unauthenticated `PUT` for a package that does not exist yet returns E404. Fix by re-running `npm login` until `npm whoami` prints `paipaipai666`, then publish with `--otp=<6-digit code>`, or replace the token with a granular token that has Read/Write on the `@paipaipai666` scope and "bypass 2FA" enabled. An earlier attempt with a still-valid token returned E403: "Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages."
- Run `/poteto-mode` with a real model session end to end; install smoke only proves bundle loading.
- Local developer environment: this machine's sandbox blocks pnpm store locks, so local install/build is not yet run outside CI. CI is the authoritative build signal for now.
