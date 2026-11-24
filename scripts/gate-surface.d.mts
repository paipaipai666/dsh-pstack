export interface GateVerdict {
  ok: boolean;
  changed: string[];
  reason: string;
}

export const PROTECTED_PATTERNS: RegExp[];
export const APPROVAL_LABEL: string;

export function isProtectedPath(path: string): boolean;
export function protectedChanges(files: string[]): string[];
export function decide(files: string[], labels: string[]): GateVerdict;
