# dsh-pstack fork

This repository is a fork of [l246804/dsh-pstack](https://github.com/l246804/dsh-pstack), which
ports [pstack](https://github.com/cursor/plugins/tree/main/pstack) to
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

## Relationship to upstream

- `upstream` remote: `https://github.com/l246804/dsh-pstack.git`
- `origin` remote: this fork (set after the GitHub fork is created)
- The original code and documentation are MIT licensed, copyright leiwang.
- pstack itself is MIT licensed, copyright Lauren Tan and the Cursor team.
- This fork is not affiliated with or endorsed by the original author or Cursor.

## Branch strategy

| Branch | Purpose |
|---|---|
| `main` | Fork baseline, kept close to upstream |
| `fork/main` | Working integration branch for this fork |
| `compat/dsh-0.2.2` | DSH 0.2.2 compatibility fixes only |
| `feat/*` | Scoped features or experiments |

## Local development

Requirements:

- Node.js `>=24.21.1`
- pnpm `12.15.0` (see `devEngines`)
- git submodules for `upstream/cursor-plugins` and `upstream/deepseek-harness`

```bash
git submodule update --init --recursive
pnpm install
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
