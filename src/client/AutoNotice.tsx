/**
 * Frame-wide notice for the experimental `pstack-auto` preset.
 *
 * The preset roster carries no experimental flag, and the preset picker belongs
 * to the harness, so the warning is attached to the Session instead: once a
 * Session records the preset, this dialog explains what the preset does and can
 * go wrong. Dismissal is per Session id, so each new `pstack-auto` Session says
 * it once.
 */

import { useCallback, useId, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";

import {
  announceableSession,
  DISMISSED_STORAGE_KEY,
  parseDismissed,
  withDismissed,
  type SessionsSnapshot,
} from "./auto-notice.ts";
import { useFocusTrap } from "./focus-trap.ts";
import { Button } from "./ui.tsx";
import type { CommonKey } from "./locales/common.ts";

export interface AutoNoticeProps {
  /** Namespace-bound translate for this surface. */
  readonly t: (key: CommonKey) => string;
  /** The shell's Sessions selector hook. */
  readonly useSessions: <T>(selector: (state: SessionsSnapshot) => T) => T;
}

function readDismissed(): ReadonlySet<string> {
  try {
    return parseDismissed(window.localStorage.getItem(DISMISSED_STORAGE_KEY));
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: readonly string[]): void {
  try {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage can be unavailable; the notice then simply shows again next load.
  }
}

export function AutoNotice(props: AutoNoticeProps): ReactElement | null {
  const { t, useSessions } = props;
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(readDismissed);
  const sessionId = useSessions((state) => announceableSession(state, dismissed));
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const dismiss = useCallback(() => {
    if (sessionId === undefined) return;
    setDismissed((current) => {
      const next = withDismissed(current, sessionId);
      writeDismissed(next);
      return new Set(next);
    });
  }, [sessionId]);

  useFocusTrap(panelRef, dismiss, sessionId !== undefined, {
    stopEscapePropagation: true,
    capture: true,
  });

  if (sessionId === undefined || typeof document === "undefined") return null;

  return createPortal(
    <div className="pstack-overlay" role="presentation">
      <div className="pstack-mask" aria-hidden="true" onClick={dismiss} />
      <div
        className="pstack-panel pstack-notice-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
      >
        <header className="pstack-header">
          <h2 className="pstack-title" id={titleId}>
            {t("experimentalTitle")}
          </h2>
        </header>
        <div className="pstack-body">
          <p className="pstack-notice">{t("experimentalBody")}</p>
        </div>
        <footer className="pstack-budget-footer">
          <div />
          <div className="pstack-role-save">
            <Button variant="primary" onClick={dismiss}>
              {t("experimentalAck")}
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
