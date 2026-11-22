export interface PresetDrift {
  equal: boolean;
  additions: string[];
  removals: string[];
}

export function presetLines(text: string): string[];
export function findPresetDrift(expected: string, actual: string): PresetDrift;
export function latestPresetFixture(names: readonly string[]): string | undefined;
export function presetsFromTarball(tarball: Uint8Array): Record<string, string>;
export function fetchPresetTarball(
  spec: string,
  fetchImpl?: (url: string) => Promise<Response>,
): Promise<Uint8Array>;
