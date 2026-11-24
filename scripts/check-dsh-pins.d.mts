export interface PinVerdict {
  ok: boolean;
  problems: string[];
}

export function parseCatalogVersion(text: string): string;
export function parseCIInstallVersion(text: string): string;
export function parseAuditBaseline(lock: unknown): string;
export function parseEnginesFloor(pkg: unknown): string;
export function checkPins(input: {
  catalog: string;
  ci: string;
  audit: string;
  auditDoc: string;
  engines: string;
}): PinVerdict;
