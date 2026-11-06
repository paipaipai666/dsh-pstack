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
