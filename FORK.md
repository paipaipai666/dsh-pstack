# dsh-pstack fork

This repository is a fork of [l246804/dsh-pstack](https://github.com/l246804/dsh-pstack), which
ports [pstack](https://github.com/cursor/plugins/tree/main/pstack) to
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

## Relationship to upstream

- `upstream` remote: `https://github.com/l246804/dsh-pstack.git`
- `origin` remote: `https://github.com/paipaipai666/dsh-pstack.git`
- The original code and documentation are MIT licensed, copyright leiwang.
- pstack itself is MIT licensed, copyright Lauren Tan and the Cursor team.
- This fork is not affiliated with or endorsed by the original author or Cursor.

## Current status

- GitHub fork created on 2026-11-06: `paipaipai666/dsh-pstack`.
- `fork/main` is pushed and tracks `origin/fork/main`.
- The package name is still `dsh-pstack` in this working tree. Publish the fork as
  `@paipaipai666/dsh-pstack` after the build and install smoke pass.

## Branch strategy

| Branch | Purpose |
|---|---|
| `main` | Fork baseline, kept close to upstream |
| `fork/main` | Working integration branch for this fork |
| `compat/dsh-0.2.2` | DSH 0.2.2 compatibility fixes only |
| `feat/*` | Scoped features or experiments |

## Local development

Requirements:

- Node.js `>=24.21.0` (the installed DSH app bundles Node `24.21.0`)
- pnpm `12.15.0` (see `devEngines`)
- git submodules for `upstream/cursor-plugins` and `upstream/deepseek-harness`

```bash
pnpm fork:check
pnpm fork:bootstrap
pnpm exec vp run typecheck
pnpm exec vp test
pnpm exec vp run build
```

The real-plugin playground uses a local DSH build:

```bash
pnpm exec vp run playground
```

## Syncing upstream

```bash
git fetch upstream
git checkout main
git merge --ff-only upstream/main
git checkout fork/main
git rebase main
```

Keep fork-only commits small and grouped by concern so they can be proposed upstream as PRs.

## Installing this fork

The fork is distributed as a built tarball until the scoped npm package is published:

```bash
dsh plugin --profile <profile> add /path/to/dsh-pstack-0.3.0-beta.1.tgz
```

Do not use the upstream `dsh-pstack` npm package for this fork. It is a different build.

## Releasing this fork

Use a scoped package name so the upstream npm package is not shadowed:

```json
{
  "name": "@your-scope/dsh-pstack"
}
```

Before publishing, update `package.json`, `README.md`, and `README.zh.md`, then:

```bash
pnpm install --frozen-lockfile
pnpm exec vp run build
pnpm exec vp test
pnpm publish --access public
```

## Planned work

See [docs/fork/BACKLOG.md](docs/fork/BACKLOG.md).
