export interface VersionBumpOptions {
  readFile?: (path: string) => string;
  gitShow?: (root: string, revision: string, path: string) => string;
}

export interface VersionBumpResult {
  base: string;
  current: string;
}

export function compareVersions(left: string, right: string): number;
export function checkVersionBump(
  root: string,
  baseRevision: string,
  options?: VersionBumpOptions,
): VersionBumpResult;
