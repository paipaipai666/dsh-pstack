# Fork status

Updated 2026-11-10.

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
| FIX-05 native skill text | Done | Custom Mode rewrites shipped; the skill provider, `pstack_skill` resources, and delegate bootstrap translate Cursor names at load time. A test scans every shipped Markdown file in the generated tree, not only the 58 skill bodies, and asserts no Cursor-only name or model slug survives translation |
| FIX-06 Windows compatibility | Done | Windows CI now runs the full test suite, not only the script smoke; CRLF handling is normalized in the generator, harness-doc checker, and tests |
| FIX-07 subagent argument schema | Done | `description`/`prompt`/`agent` are required; `role`/`roleIndex`/`reasoningEffort`/`cwd`/`maxDepth` are optional and default to null; test added |
| FIX-08 real DSH integration tests | Done | `Install smoke (Linux)` CI job installs `@deepseek-ai/dsh@0.2.2-rc.1`, installs the built tarball into an isolated `DSH_HOME`, and asserts every bundle row; model-backed session coverage remains future work |
| FIX-09 docs and release | Partial | Scoped package rename and README are done; npm `publish --dry-run` passes. Real publish is blocked: the account has 2FA disabled (`npm profile get --json` → `tfa: false`), so there is no authenticator and no OTP to supply; an earlier attempt returned E403 asking for 2FA or a granular token with bypass 2FA, and a later one returned E404 |
| ADD-01 `pstack_doctor` | Done | Commands, scripts, role file, and optional-plugin state; unit tests and CI green |

## Quality pass (2026-11-10)

Four gaps found while comparing the shipped skills with upstream pstack, plus a repository map.

| Item | Status | Evidence |
|---|---|---|
| QP-01 user-level skill path | Done | `~/.cursor/skills/<name>/` now maps to `$DSH_HOME/skills/<name>/` instead of a hardcoded `~/.dsh/skills/`, which was only right when `DSH_HOME` kept its default. Six sites covered: `automate-me`, `reflect`, and three reflect references |
| QP-02 dead translation rules | Done | `environment: "cloud"` and `environment: "local"` ended in `\b` after a quote, so neither ever matched. Both fixed, plus new rules for bare `generalPurpose`, unquoted `subagent_type: generalPurpose`, `readonly: false`, and `readonly/Ask mode` |
| QP-03 stale rewrite guard | Done | `generate-pstack-harness-tree.mjs` now counts hits per `TEXT_REWRITES` entry and fails when an entry matches nothing, so an upstream edit cannot silently leave a Cursor-only instruction in the tree |
| QP-04 declared sources vs shipped tree | Done | Removed the `npm:agent-browser` skill declaration and its lock entry: `skills experimental_sync` only reads `skills/package.json`, so that skill could never be vendored. Added `tests/skill-sources.test.ts` for both directions, and completed the root lock with the `writing-for-agents` entry |
| QP-05 repository map | Done | `README.md` and `README.zh.md` gained a layout table covering the nested generated tree, the override layer, the vendored and authored skills, `dist`, and both submodules |
| QP-06 empty submodules | Done | `FORK.md` states that the two submodules start empty and that only regeneration or the upstream checks need them, with the `git submodule update --init --depth 1` commands |

## Quality audit

- Upstream parity: 58 skills, 23 playbooks, 24 principles, 2 agent definitions, 11 guide pages.
- Test suite: 22 files under `tests/` (141 cases) plus 7 script tests under `pstack/runtime/` (52 cases); CI runs Linux build/test with a V8 coverage gate, full Windows test, and a real DSH install smoke.
- Translation coverage: one test translates all 158 Markdown files in `pstack/pstack` and fails on any surviving Cursor tool, field, path, or model name.
- Coverage gate: lines 50%, functions 45%, branches 40%, statements 50%; CI run [42177056672](https://github.com/paipaipai666/dsh-pstack/actions/runs/42177056672) is green.
- Upstream drift: the submodule commit and checked-out tree hash are pinned in `tests/upstream-drift.test.ts`.
- Full audit: [AUDIT.md](AUDIT.md).

## Still open

- Finish the npm publish. The `~/.npmrc` token is valid: with `npm_config_cache` pointing at a writable directory, `npm whoami` returns `paipaipai666` and `npm ping` returns PONG. The earlier E401 was a sandbox EPERM artifact from the default cache `D:\nodejs\node_cache`. `npm profile get --json` reports `tfa: false`, so the account has no bound authenticator and no OTP exists to supply; the earlier `--otp=<6-digit code>` advice is therefore invalid until 2FA is enabled. npm requires 2FA (or a granular/automation token with bypass 2FA) for publishing: one attempt returned E403 "Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages.", and a later one returned E404 (npm hides permission failures behind 404). Pick one of three paths: enable 2FA with `npm profile enable-2fa auth-and-writes`, bind a TOTP authenticator app, and publish with `--otp=<6-digit code>`; create a Granular Access Token with "Bypass two-factor authentication" and Read/Write on the `@paipaipai666` scope; or use GitHub Actions OIDC Trusted Publishing (npm CLI 11.5.1 or newer, Node 22.14.0 or newer).
- Run `/poteto-mode` with a real model session end to end; install smoke only proves bundle loading.
- Local developer environment: this machine's sandbox blocks pnpm store locks, so local install/build is not yet run outside CI. CI is the authoritative build signal for now.
