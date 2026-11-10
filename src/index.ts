/** Host entry for dsh-pstack: the trusted hidden-skill loader. */

import type { Context } from "@deepseek-ai/cordis";

import { apply as applySkill } from "./skill.ts";

export const name = "pstack";

export const inject = ["skills", "tools"];

export function apply(ctx: Context): void {
  applySkill(ctx);
}
