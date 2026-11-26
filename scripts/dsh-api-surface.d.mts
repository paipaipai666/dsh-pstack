export interface SurfacePackage {
  version: string;
  imported: string[];
  exports: string[];
}

export interface Surface {
  packages: Record<string, SurfacePackage>;
}

export function sourceFiles(root: string): string[];
export function collectImportedSymbols(root: string): Map<string, Set<string>>;
export function packageDir(root: string, name: string): string;
export function resolveTypesEntry(root: string, name: string): string | undefined;
export function extractExports(text: string): string[];
export function extractSurfaceExports(
  entry: string | undefined,
  depth?: number,
  seen?: Set<string>,
): string[];
export function surfaceOf(root: string): Surface;
export function compareSurfaces(before: Surface, after: Surface): { ok: boolean; reason: string };
export function readSnapshot(root: string, path?: string): Surface;
