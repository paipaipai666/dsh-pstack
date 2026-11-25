/** Rules for the experimental notice that `pstack-auto` selects trigger. */

/** The preset whose selection this plugin announces as experimental. */
export const EXPERIMENTAL_PRESET_ID = "pstack-auto";

/** Browser storage key holding the Session ids already dismissed. */
export const DISMISSED_STORAGE_KEY = "pstack:auto-notice-dismissed";

/** How many dismissed Session ids the storage keeps, newest first. */
export const MAX_DISMISSED = 50;

/** The part of the Sessions store this notice reads. */
export interface SessionsSnapshot {
  readonly byId: Readonly<Record<string, { readonly projectionValues?: unknown } | undefined>>;
}

/** Read the preset a Session records, ignoring anything that is not a name. */
export function presetOf(
  value: { readonly projectionValues?: unknown } | undefined,
): string | undefined {
  const projection = value?.projectionValues;
  if (typeof projection !== "object" || projection === null) return undefined;
  const preset = (projection as { readonly agentPreset?: unknown }).agentPreset;
  return typeof preset === "string" && preset !== "" ? preset : undefined;
}

/**
 * The Session that should announce the experimental preset, if any.
 *
 * Session ids sort by creation order, so the newest matching Session wins: a
 * user who starts several `pstack-auto` Sessions sees one notice per Session,
 * each dismissed on its own.
 */
export function announceableSession(
  state: SessionsSnapshot,
  dismissed: ReadonlySet<string>,
): string | undefined {
  let newest: string | undefined;
  for (const [sessionId, summary] of Object.entries(state.byId ?? {})) {
    if (presetOf(summary) !== EXPERIMENTAL_PRESET_ID) continue;
    if (dismissed.has(sessionId)) continue;
    if (newest === undefined || sessionId > newest) newest = sessionId;
  }
  return newest;
}

/** Parse the stored dismissal list, tolerating absent or damaged values. */
export function parseDismissed(raw: string | null | undefined): ReadonlySet<string> {
  if (raw === null || raw === undefined || raw === "") return new Set();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Set();
  }
  if (!Array.isArray(parsed)) return new Set();
  return new Set(parsed.filter((value): value is string => typeof value === "string"));
}

/** Append one Session id to the dismissal list, keeping only the newest entries. */
export function withDismissed(
  dismissed: ReadonlySet<string>,
  sessionId: string,
  limit = MAX_DISMISSED,
): readonly string[] {
  const next = [...dismissed].filter((value) => value !== sessionId);
  next.push(sessionId);
  return next.slice(Math.max(0, next.length - limit));
}
