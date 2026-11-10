import { resolve } from "node:path";

import { defineConfig } from "bumpp";

import { releaseMetadata, syncCompatibility } from "./port/release-compatibility.ts";

/** Update the bilingual compatibility tables after the version bump and before the release commit. */
export default defineConfig({
  files: ["package.json"],
  execute: (operation) => {
    const metadata = releaseMetadata();
    const result = syncCompatibility(metadata);
    const updatedFiles = new Set(operation.state.updatedFiles);
    for (const file of ["README.md", "README.zh.md"]) updatedFiles.add(resolve(file));
    operation.update({ updatedFiles: [...updatedFiles] });
    console.log(
      `${result.addedRow ? "Added" : "Updated"} compatibility row for ${metadata.compatibilityKey}: ${result.releases.join("、")}.`,
    );
  },
});
