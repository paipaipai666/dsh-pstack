/** Locale keys for the display name and scenario of every pstack role. */

import { isRoleKey, type RoleKey } from "../role-manifest.ts";
import type { RolesKey, Translate } from "./locales/index.ts";

export interface RoleCopy {
  readonly nameKey: RolesKey;
  readonly descriptionKey: RolesKey;
}

export const ROLE_COPY: Record<RoleKey, RoleCopy> = {
  "feature, refactoring": {
    nameKey: "roleFeatureName",
    descriptionKey: "roleFeatureDescription",
  },
  "bug-fix": { nameKey: "roleBugFixName", descriptionKey: "roleBugFixDescription" },
  "perf-issue": { nameKey: "rolePerfName", descriptionKey: "rolePerfDescription" },
  hillclimb: { nameKey: "roleHillclimbName", descriptionKey: "roleHillclimbDescription" },
  "judgment and prose": {
    nameKey: "roleJudgmentName",
    descriptionKey: "roleJudgmentDescription",
  },
  "hardest tasks": { nameKey: "roleHardestName", descriptionKey: "roleHardestDescription" },
  "how explorer": {
    nameKey: "roleHowExplorerName",
    descriptionKey: "roleHowExplorerDescription",
  },
  "how explainer": {
    nameKey: "roleHowExplainerName",
    descriptionKey: "roleHowExplainerDescription",
  },
  "why investigators": {
    nameKey: "roleWhyInvestigatorsName",
    descriptionKey: "roleWhyInvestigatorsDescription",
  },
  "why synthesizer": {
    nameKey: "roleWhySynthesizerName",
    descriptionKey: "roleWhySynthesizerDescription",
  },
  "reflect tooling": {
    nameKey: "roleReflectToolingName",
    descriptionKey: "roleReflectToolingDescription",
  },
  "reflect judgment, divergent, synthesizer": {
    nameKey: "roleReflectJudgmentName",
    descriptionKey: "roleReflectJudgmentDescription",
  },
  "arena runners": {
    nameKey: "roleArenaRunnersName",
    descriptionKey: "roleArenaRunnersDescription",
  },
  "arena cross-judge pool": {
    nameKey: "roleArenaJudgesName",
    descriptionKey: "roleArenaJudgesDescription",
  },
  "swarm workers": { nameKey: "roleSwarmName", descriptionKey: "roleSwarmDescription" },
  "architect runners": {
    nameKey: "roleArchitectName",
    descriptionKey: "roleArchitectDescription",
  },
  "interrogate reviewers": {
    nameKey: "roleInterrogateName",
    descriptionKey: "roleInterrogateDescription",
  },
};

/** User-facing role name for a manifest key, falling back to the raw key. */
export function roleLabel(key: string, t: Translate<RolesKey>): string {
  return isRoleKey(key) ? t(ROLE_COPY[key].nameKey) : key;
}
