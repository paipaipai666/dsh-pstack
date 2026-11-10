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

Everything upstream ships is kept. On top of it the fork carries four additions:

| Addition | Entry | Why |
|---|---|---|
| Bundled script runner | `src/script.ts` → `pstack_script` | Runs the five scripts that ship inside the generated tree with the host's own Node. A desktop install has no `node` on `PATH`, and the extensionless `watch-pr` entry cannot be spawned directly on Windows. The tool exposes a fixed id list, never a free-form command. |
| Script approval row | `src/script-policy.ts` → `pstack-script-policy` | A `tools/pre-execute` row asks before every `pstack_script` call, so the approval stays a normal DSH decision instead of something the tool implements. `mode: allow` exists for trusted headless profiles only. |
| Doctor | `src/doctor.ts` → `pstack_doctor` | Reports the host prerequisites the scripts depend on (`git`, `gh`, `node`, `ffmpeg`, `mise`, `java`), the resolved role file, and the install state of the optional plugins listed in `port/dsh.md`. |
| Runtime translation | `src/native-text.ts`, `src/skill.ts`, `src/poteto-mode.ts` | Rewrites the Cursor vocabulary that survives inside the vendored skill text (`Task`, `subagent_type`, `~/.cursor/...`, model slugs) when a skill is read. The generated tree keeps the upstream bytes so `port/generate.mjs --check` still proves what changed. |

`runtime/` holds the TypeScript sources for those five scripts. `vite.config.ts` builds them into
`runtime/dist/`, and `scripts/replace-runtime-scripts.mjs` copies the compiled `.mjs` into the
shipped tree under `dist/pstack/skills/<skill>/scripts/`, dropping the compiled tests.

## Current status

- GitHub fork created on 2026-11-06: `paipaipai666/dsh-pstack`.
- `fork/upstream-0.3.1` carries the rebase onto upstream `0.3.1`; `fork/main` is the integration
  branch that gets pushed.
- The package is named `@paipaipai666/dsh-pstack` and reports version `0.4.0-beta.1`.
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

The fork is distributed as a built tarball until the scoped npm package is published:

```bash
dsh plugin --profile <profile> add /path/to/paipaipai666-dsh-pstack-0.4.0-beta.1.tgz
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
pnpm publish --access public --tag beta
```

`npm publish` needs either 2FA enabled on the account or a granular access token with
"bypass two-factor authentication"; `.github/workflows/release.yml` is set up for OIDC trusted
publishing instead.

## Planned work

See [docs/fork/BACKLOG.md](docs/fork/BACKLOG.md).