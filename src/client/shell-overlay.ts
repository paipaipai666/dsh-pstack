/**
 * Slot declaration for `shell.overlay`.
 *
 * `shell.overlay` belongs to `@deepseek-ai/dsh-client-ui-layout`, which assembles
 * the app frame. This package renders a frame-wide dialog without depending on
 * that package, so it declares the seat locally with the same shape the layout
 * package declares: a root-scoped list slot rendered over the whole frame.
 */

import type {} from "@deepseek-ai/dsh-client-ui-slots";

declare module "@deepseek-ai/dsh-client-ui-slots" {
  interface SlotMap {
    "shell.overlay": {
      kind: "list";
      scope: "root";
      owner: ShellOverlayOwnerProps;
    };
  }
}

/** The frame supplies nothing to its overlay entries. */
export interface ShellOverlayOwnerProps {
  children?: never;
}
