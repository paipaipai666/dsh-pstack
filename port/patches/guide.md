# Guide patches

Find/Replace pairs applied to the generated guide. Each `##` section names a file
in the generated tree; every **Find** must match the upstream text exactly.

## `docs/guide/02-poteto-mode.md`

**Find**

```text
a Custom Mode keeps `/poteto-mode` in context on every turn
```

**Replace**

```text
the `poteto-mode` preset keeps `/poteto-mode` in context on every turn
```

## `docs/guide/05-build-and-clean.md`

**Find**

```text
`/deslop` ships in the `cursor-team-kit` plugin, not in pstack. If you don't have it, ask for the same outcome in plain words
```

**Replace**

```text
`/deslop` is vendored in dsh-pstack and ships with this plugin. If it is unavailable, ask for the same outcome in plain words
```
