/** Shared modal focus trap and Escape handling for the pstack dialogs. */

import { useEffect } from "react";

/** Selector for the elements a modal may focus with Tab. */
export const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface FocusTrapOptions {
  /** Skip trapping while another overlay owns the keyboard. */
  readonly suspended?: () => boolean;
  /** Lock page scroll while the modal is open. */
  readonly lockScroll?: boolean;
  /** Stop Escape from reaching an outer dialog. */
  readonly stopEscapePropagation?: boolean;
  /** Ignore focusable elements inside a hidden subtree. */
  readonly skipHidden?: boolean;
  /** Handle keydown in the capture phase so a nested modal wins over its parent. */
  readonly capture?: boolean;
}

/** Trap Tab focus inside `ref`, and handle Escape through `onEscape`, while `active`. */
export function useFocusTrap(
  ref: { readonly current: HTMLElement | null },
  onEscape: () => void,
  active: boolean,
  options: FocusTrapOptions = {},
): void {
  const { suspended, lockScroll, stopEscapePropagation, skipHidden, capture } = options;
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (stopEscapePropagation === true) event.stopPropagation();
        onEscape();
        return;
      }
      if (event.key !== "Tab") return;
      if (suspended?.() === true) return;
      const panel = ref.current;
      if (panel === null) return;
      const candidates = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const focusables =
        skipHidden === true
          ? candidates.filter((element) => element.closest("[hidden]") === null)
          : candidates;
      if (focusables.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const current = document.activeElement;
      const outside = current === null || !panel.contains(current);
      if (event.shiftKey) {
        if (current === first || outside) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (current === last || outside) {
        event.preventDefault();
        first.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    if (lockScroll === true) document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown, capture === true);
    return () => {
      if (lockScroll === true) document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown, capture === true);
    };
  }, [ref, active, onEscape, suspended, lockScroll, stopEscapePropagation, skipHidden, capture]);
}
