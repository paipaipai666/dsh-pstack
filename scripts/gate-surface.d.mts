export interface GateVerdict {
  ok: boolean;
  changed: string[];
  reason: string;
}

export interface GateOptions {
  versionOnlyManifest?: boolean;
}

export const PROTECTED_PATTERNS: RegExp[];
export const APPROVAL_LABEL: string;

export function isProtectedPath(path: string): boolean;
export function manifestBeyondVersion(before: string, after: string): boolean;
export function protectedChanges(files: string[], options?: GateOptions): string[];
export function decide(files: string[], labels: string[], options?: GateOptions): GateVerdict;
