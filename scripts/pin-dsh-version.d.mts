export function catalogVersions(text: string): string[];
export function rewriteCatalog(text: string, version: string): string;
export function distTagVersion(packument: unknown, tag: string): string;
export function fetchNextVersion(
  fetchImpl?: (url: string) => Promise<{ ok: boolean; status?: number; json(): Promise<unknown> }>,
): Promise<string>;
export function nextVersion(): Promise<string>;
