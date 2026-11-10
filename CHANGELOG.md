# Changelog

## Unreleased (fork baseline)

- Forked from l246804/dsh-pstack v0.3.0-beta.1 (pstack 0.15.36).
- Added fork documentation and a prioritized backlog.
- Added CI for typecheck, tests, build, generated-tree check, Windows smoke, and a packaged
  tarball artifact.
- Verified the packaged tarball installs into an isolated DSH 0.2.2-rc.1 profile.
- Fixed stale version assertions and Windows path/line-ending handling in the generator and
  script tests.
- Raised the default subagent depth cap from 2 to 3 for `/orchestrate`.
- Removed Cursor-only Custom Mode instructions from the shipped help and setup guides.
- Added `pstack-script-policy` for `pstack_script`; DSH owns approval, with `ask`, `allow`, and `deny` modes.
- Added `pstack_doctor` for local command, script, role-file, and optional-plugin preflight.
- Added `scripts/smoke-install.mjs` for isolated DSH bundle installation checks.
- Added the persistent `pstack` agent preset so `/poteto-mode` can stay active for a whole session.
- Made `pstack_subagent` optional arguments default to null instead of requiring explicit nulls.
- Added DSH translation rules to every skill loaded through `pstack_skill`.
- Added a CI install-smoke job that installs the real DSH CLI and the fork tarball into an isolated home.
- Added load-time translation of Cursor-only names in pstack skill content.
- Renamed the npm package to `@paipaipai666/dsh-pstack` and moved all bundle, Client, Remote, and playground references to the scoped name.
- Added a V8 coverage gate to the Linux CI job.
- Added an upstream pstack commit/tree drift check.
- Added full Windows test execution and CRLF normalization for the harness-doc checker.
- Mapped `~/.cursor/skills/<name>/` to `$DSH_HOME/skills/<name>/`; it previously became `~/.dsh/skills/`, which only worked with the default home.
- Fixed the `environment: "cloud"` and `environment: "local"` translation rules, which never matched because a word boundary followed a quote; added `generalPurpose`, unquoted `subagent_type: generalPurpose`, `readonly: false`, and `readonly/Ask mode`.
- Made the generated-tree script fail when a `TEXT_REWRITES` entry matches nothing, so an upstream edit cannot silently leave Cursor-only instructions behind.
- Removed the `npm:agent-browser` skill declaration and lock entry, which could never be vendored, and added `tests/skill-sources.test.ts` plus the missing `writing-for-agents` root lock entry.
- Added a repository layout table to both READMEs and documented the empty submodules and their init commands in `FORK.md`.
