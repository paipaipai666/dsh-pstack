import { readFileSync } from "node:fs";

/**
 * Read a patch file with this package's name collapsed to upstream `dsh-pstack`.
 *
 * The published package is scoped, while the upstream tests and the preset
 * fixtures were written against the unscoped name. Normalising the name keeps
 * those assertions readable instead of hard-coding the fork's scope everywhere.
 */
export function readPatch(path = "cordis.patch.yml"): string {
  const manifest = JSON.parse(readFileSync("package.json", "utf8")) as { name: string };
  return (
    readFileSync(path, "utf8")
      .replace(/\r\n/g, "\n")
      .replaceAll(`"${manifest.name}"`, '"dsh-pstack"')
      .replaceAll(`${manifest.name}/`, "dsh-pstack/")
      // A scoped name starts with `@`, which YAML only accepts quoted, so the fork
      // quotes every row. The upstream tests and fixtures spell the two non-preset
      // rows unquoted; collapse those back to the upstream form.
      .replaceAll('name: "dsh-pstack/poteto-mode"', "name: dsh-pstack/poteto-mode")
      .replaceAll('name: "dsh-pstack"', "name: dsh-pstack")
  );
}
