# dsh-pstack fork

This repository is a fork of [l246804/dsh-pstack](https://github.com/l246804/dsh-pstack), which
ports [pstack](https://github.com/cursor/plugins/tree/main/pstack) to
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

## Relationship to upstream

- `upstream` remote: `https://github.com/l246804/dsh-pstack.git`
- `origin` remote: `https://github.com/paipaipai666/dsh-pstack.git`
- The fork is rebased on upstream `0.3.1` (`d9f6590..2d577b1`), which replaced `pstack/scripts/`
  with `port/` and flattened `src/internal/` into `src/`.
- The original code and documentation are MIT licensed, copyright leiwang.
- pstack itself is MIT licensed, copyright Lauren Tan and the Cursor team.
- This fork is not affiliated with or endorsed by the original author or Cursor.

## What this fork adds

Everything upstream ships is kept. On top of it the fork carries five additions:

| Addition | Entry | Why |
|---|---|---|
| Bundled script runner | `src/script.ts` → `pstack_script` | Runs the five scripts that ship inside the generated tree with the host's own Node. A desktop install has no `node` on `PATH`, and the extensionless `watch-pr` entry cannot be spawned directly on Windows. The tool exposes a fixed id list, never a free-form command. |
| Script approval row | `src/script-policy.ts` → `pstack-script-policy` | A `tools/pre-execute` row asks before every `pstack_script` call, so the approval stays a normal DSH decision instead of something the tool implements. `mode: allow` exists for trusted headless profiles only. |
| Doctor | `src/doctor.ts` → `pstack_doctor` | Reports the host prerequisites the scripts depend on (`git`, `gh`, `node`, `bun`, `ffmpeg`, `mise`, `java`, `jq`), the resolved role file, the install state of the optional plugins listed in `port/dsh.md`, and any `.cursor/rules/*.mdc` files the workspace carries that DSH never loads. |
| Runtime translation | `src/native-text.ts`, `src/skill.ts`, `src/poteto-mode.ts` | Rewrites the Cursor vocabulary that survives inside the vendored skill text (`Task`, `subagent_type`, `~/.cursor/...`, model slugs) when a skill is read. The generated tree keeps the upstream bytes so `port/generate.mjs --check` still proves what changed. |
| Remote dispatch | `src/remote.ts` -> `pstack_remote`, row `pstack-remote` | Dispatches one headless DSH run to a machine the user registers (an SSH host with `dsh` on `PATH`, or an HTTP worker that streams NDJSON) and records its event stream. The package supplies no machine, no cloud SDK, and no dashboard; `docs/remote-worker.md` is the whole contract. |

`runtime/` holds the TypeScript sources for those five scripts. `vite.config.ts` builds them into
`runtime/dist/`, and `scripts/replace-runtime-scripts.mjs` copies the compiled `.mjs` into the
shipped tree under `dist/pstack/skills/<skill>/scripts/`, dropping the compiled tests.

## Current status

- GitHub fork created on 2026-11-06: `paipaipai666/dsh-pstack`.
- `fork/upstream-0.3.1` carries the rebase onto upstream `0.3.1`; `fork/main` is the integration
  branch that gets pushed.
- The package is named `@paipaipai666/dsh-pstack` and reports version `0.5.0-beta.3`.
- The generated tree is committed at `pstack/` and is rewritten as a whole by
  `vpx port/generate.mjs`. It is generated from `upstream/cursor-plugins` plus the adapter source
  `port/dsh.md`, so the 58 skills are reviewable in the repository instead of being generated during
  install.
- `upstream/cursor-plugins` is a gitlink. A fresh clone shows it empty until initialized; the
  committed skills do not depend on it. Only regenerating the tree or running the port audit needs
  the submodule.
- `docs/fork/` records the fork's own status, backlog, audit and review; `docs/decisions/` records
  architectural decisions in the upstream format.

## Branch strategy

| Branch | Purpose |
|---|---|
| `main` | Fork baseline, kept close to upstream |
| `fork/main` | Working integration branch for this fork |
| `fork/upstream-0.3.1` | Rebase of the fork onto upstream 0.3.1, merged back into `fork/main` |
| `feat/*` | Scoped features or experiments |

## Local development

Requirements:

- Node.js `>=24.21.0` (the installed DSH app bundles Node `24.21.0`)
- pnpm `12.15.0` (see `devEngines`)
- the `upstream/cursor-plugins` submodule for regenerating the tree or running `port/scan.mjs`

```bash
pnpm install --frozen-lockfile
pnpm exec vp run typecheck
pnpm exec vp test
pnpm exec vp run build
pnpm exec vp run test:runtime
```

`vp run build` regenerates `pstack/`, builds the three packs (host, client, runtime), and replaces
the shipped scripts. The port audit gates are separate:

```bash
pnpm exec vp run generate:check
pnpm exec vpx port/scan.mjs --check-lock
pnpm exec vpx port/scan.mjs --check port/audit.md
pnpm exec vp run compatibility:check
```

Four runtime tests spawn a POSIX shell (`sh`) or create a directory symlink. They are skipped on
Windows and run on the Linux job.

The real-plugin playground uses a local DSH build:

```bash
pnpm exec vp run playground
```

## Syncing upstream

```bash
git fetch upstream main --tags
git switch -c fork/upstream-<version>
git merge upstream/main
# resolve conflicts, keeping the four fork additions above
pnpm install
pnpm exec vp run typecheck && pnpm exec vp test && pnpm exec vp run build
```

Upstream rewrites `port/`, `src/` and the generated tree between minor releases, so expect the merge
to touch the adapter source, the cordis rows and every test that reads them. `tests/patch-name.ts`
exists for that reason: the fork's scoped package name needs quotes in YAML, while the upstream
tests and fixtures spell the package name bare.

## Installing this fork

The fork is published on npm under its scoped name:

```bash
dsh plugin --profile <profile> add @paipaipai666/dsh-pstack
```

`latest` and `beta` both point at the current beta. A locally built tarball still works when you need
to test a change before publishing:

```bash
dsh plugin --profile <profile> add /path/to/paipaipai666-dsh-pstack-<version>.tgz
```

Do not use the upstream `dsh-pstack` npm package for this fork. It is a different build.

## Releasing this fork

The package name is already scoped:

```json
{
  "name": "@paipaipai666/dsh-pstack"
}
```

Before publishing, update `package.json`, run `pnpm exec vp run release` (which syncs the
compatibility tables in both READMEs), then:

```bash
pnpm install --frozen-lockfile
pnpm exec vp run build
pnpm exec vp test
```

The account authenticates with a passkey rather than a TOTP app, so `npm publish --otp` cannot work.
Publish through staging instead:

```bash
node "$DSH_PNPM" pack --pack-destination artifacts
npm stage publish artifacts/paipaipai666-dsh-pstack-<version>.tgz --tag beta --access public --force
```

`--force` is only there to get past `devEngines.packageManager`, which pins pnpm 12.15.0. Approve the
staged version on the package page, which completes the passkey check, then move the tags from an
interactive terminal so npm can open the browser approval flow:

```bash
npm dist-tag add @paipaipai666/dsh-pstack@<version> latest
```

`.github/workflows/release.yml` is set up for OIDC trusted publishing instead, which is the route to
prefer once the package owner configures it. Full details: [docs/fork/STATUS.md](docs/fork/STATUS.md#publishing).

## Planned work

See [docs/fork/BACKLOG.md](docs/fork/BACKLOG.md).