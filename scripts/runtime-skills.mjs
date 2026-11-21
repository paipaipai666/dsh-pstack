/** Skills whose runtime sources replace the generated scripts in the shipped tree. */
export const RUNTIME_REPLACED_SKILLS = ["poteto-mode", "show-me-your-work", "statechart"];

/**
 * Generated files that the runtime deliberately does not carry: upstream launchers,
 * package metadata, build-only typings, and the old shell implementations replaced by
 * TypeScript entry points. Anything else missing from `runtime/` fails the lint.
 */
export const RUNTIME_DROPPED_FILES = {
  "poteto-mode": new Set([
    "bootstrap.ts",
    "bun.lock",
    "watch-pr/types.compile.ts",
    "worktree-audit.sh",
  ]),
  "show-me-your-work": new Set(["log.sh"]),
  statechart: new Set(["statechart"]),
};
