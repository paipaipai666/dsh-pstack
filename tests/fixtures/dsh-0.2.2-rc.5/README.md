These files are copied from `@deepseek-ai/dsh-web-app` 0.2.2-rc.5 (`presets/standard.patch.yml`
and `presets/cordis.patch.yml`).

The only edit applied on copy is spelling: `name:` values are written with double quotes so
the fixture and `cordis.patch.yml` compare line for line. Everything else — row order, config
blocks, block scalars and comments — is untouched.

`tests/preset-parity.test.ts` diffs pstack's two root presets against these files. To refresh
after a DSH update, copy the new `presets/*.patch.yml` verbatim, normalise `name:` quoting, and
run that test.