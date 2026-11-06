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
- Added Host approval for `pstack_script`; a missing or rejected answerer fails closed.
- Added `pstack_doctor` for local command, script, and role-file preflight.
- Added `scripts/smoke-install.mjs` for isolated DSH bundle installation checks.
- Added the persistent `pstack` agent preset so `/poteto-mode` can stay active for a whole session.
- Made `pstack_subagent` optional arguments default to null instead of requiring explicit nulls.
- Added DSH translation rules to every skill loaded through `pstack_skill`.
