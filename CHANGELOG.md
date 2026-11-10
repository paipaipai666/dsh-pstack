# Changelog

## 0.4.0-beta.2

Fixes the Desktop boot failure introduced by the 0.3.1 rebase. Published to npm as
`@paipaipai666/dsh-pstack@0.4.0-beta.2`; both `latest` and `beta` point at it.

### Fixed

- The client bundle registered its factory as `dsh-pstack` while the composition mounts
  `@paipaipai666/dsh-pstack`. The Desktop client loader keyed the row by the package name, found no
  factory, loaded the bundle a second time, and aborted the boot with
  `client-modules: duplicate factory registration for "dsh-pstack"`. The banner id now comes from
  `package.json#name` at build time, and `tests/package-name.test.ts` asserts that the built
  `dist/client.js` carries it.
- The plugin-detail Configure action and the remote role descriptors still compared against the bare
  name, so the dialog never appeared and the Host rejected the descriptors. Both now share
  `src/package-name.ts` with the rest of the package identity.
- `ci.yml` install smoke matches `./*dsh-pstack-*.tgz` instead of a hardcoded beta version.

## 0.4.0-beta.1

Rebased on upstream `dsh-pstack 0.3.1`, which replaced `pstack/scripts/` with `port/`, flattened
`src/internal/` into `src/`, and moved the generated tree from `pstack/pstack/` to `pstack/`.
Everything the fork added is carried forward on the new base.

### Added

- `pstack_script` now runs the five bundled scripts from `runtime/`, compiled by a third pack and
  copied into the shipped tree by `scripts/replace-runtime-scripts.mjs`. The runner uses the host's
  own Node, which is what makes the scripts work in a desktop install where `node` is not on `PATH`.
- `pstack_doctor` reports the host prerequisites for those scripts plus the optional-plugin install
  state read from the profile manifest.
- `src/native-text.ts` translates the Cursor vocabulary that survives inside the vendored skills:
  `Task`, `subagent_type` (quoted and bare), `generalPurpose`, `readonly: true|false`,
  `readonly/Ask mode`, `environment: "cloud"|"local"`, `cloud_base_branch`, `AskQuestion`,
  `TodoWrite`, `~/.cursor/skills/` (now `$DSH_HOME/skills/`), the remaining `~/.cursor/` paths, and
  the Cursor model slugs.
- `tests/patch-name.ts` renders `cordis.patch.yml` with the package name the upstream tests expect,
  because the scoped name needs YAML quotes that the upstream assertions do not use.
- `tests/skill-sources.test.ts` keeps the three skill trees, their manifests, and both lock files in
  agreement.
- READMEs gained a repository-layout table, a fork note, the two fork-only tools, and the new
  install command; `FORK.md` documents the fork additions, the submodule state, and the upstream
  sync procedure.

### Changed

- `pstack-subagent` keeps upstream's `maxDepth: 2`; the fork no longer raises it to 3.
- The bundle now inserts three skill rows (`pstack-skills`, `pstack-vendored-skills`,
  `pstack-authored-skills`) and five presets, following upstream's layout.
- `pstack-script-policy` asks by default and still supports `allow` and `deny`.
- `port/generate.mjs` and `port/scan.mjs` normalize line endings and build paths with `/`, and treat
  a shebang file without an extension as an entry, so both work on Windows.
- `scripts/smoke-install.mjs` asserts the new rows and resolves the tarball to an absolute path,
  because `dsh plugin add` resolves a relative one against the profile directory.

### Removed

- The fork's own `src/internal/` layer, `src/remote.ts`, `src/roles.ts`, the bundle config dialog,
  and the optional-plugin page: upstream rewrote the client, the role remote, and the skill
  providers, and keeping the old client would have meant two implementations of one surface.
- `tests/upstream-parity.test.ts`, `tests/upstream-drift.test.ts`, and `pstack/scripts/`: `port/`
  now owns the generated tree, and `port/scan.mjs --check-lock` plus `port/audit.md` own the audit.

### Known gaps

- Four runtime tests spawn `sh` or create a directory symlink; they are skipped on Windows.
- `0.4.0-beta.1` was never published; `0.4.0-beta.2` is the first version on npm.