import { describe, expect, it } from "vite-plus/test";

import {
  budgetLineFor,
  budgetTierFromLabel,
  isBudgetRowBlocked,
  parseBudgetApplyRequest,
  planBudget,
  updateBudgetText,
  type BudgetRoleInput,
} from "../src/budget.ts";
import type { CatalogueResult } from "../src/catalogue.ts";

const catalogue: CatalogueResult = {
  truncated: false,
  providers: [
    {
      provider: "p",
      name: "P",
      models: [
        {
          route: "p/full",
          id: "full",
          name: "Full",
          efforts: ["off", "low", "medium", "high", "xhigh", "max"],
        },
        { route: "p/flat", id: "flat", name: "Flat", efforts: ["low", "high"] },
        {
          route: "p/custom",
          id: "custom",
          name: "Custom",
          efforts: ["adaptive"],
          defaultEffort: "adaptive",
        },
        { route: "p/none", id: "none", name: "None", efforts: [] },
      ],
    },
  ],
};

function role(overrides: Partial<BudgetRoleInput>): BudgetRoleInput {
  return {
    key: "bug-fix",
    shape: "single",
    autoPanel: false,
    configured: true,
    routes: [{ kind: "route", provider: "p", model: "full", effort: "low" }],
    ...overrides,
  };
}

describe("budget planning", () => {
  it("maps exact, fallback, custom, unsupported, and inherit cases", () => {
    const plan = planBudget(
      [
        role({ key: "exact", routes: [{ kind: "route", provider: "p", model: "full" }] }),
        role({ key: "fallback", routes: [{ kind: "route", provider: "p", model: "flat" }] }),
        role({
          key: "custom",
          routes: [{ kind: "route", provider: "p", model: "custom", effort: "my-custom" }],
        }),
        role({
          key: "none",
          routes: [{ kind: "route", provider: "p", model: "none", effort: "old" }],
        }),
        role({ key: "inherit", configured: true, routes: [{ kind: "inherit", alias: "auto" }] }),
      ],
      catalogue,
      { tier: "unlimited", scope: "concrete" },
    );
    expect(plan.rows.map((row) => [row.key, row.status])).toEqual([
      ["exact", "changed"],
      ["fallback", "fallback"],
      ["custom", "custom"],
      ["none", "unsupported"],
      ["inherit", "skipped"],
    ]);
    expect(plan.rows[0]?.routes).toEqual([
      { kind: "route", provider: "p", model: "full", effort: "max" },
    ]);
    expect(plan.rows[1]?.routes).toEqual([
      { kind: "route", provider: "p", model: "flat", effort: "high" },
    ]);
    expect(plan.rows[1]?.detail).toEqual({ kind: "fallback", effort: "high" });
    expect(plan.rows[2]?.routes).toEqual([
      { kind: "route", provider: "p", model: "custom", effort: "my-custom" },
    ]);
    expect(plan.rows[3]?.routes).toEqual([
      { kind: "route", provider: "p", model: "none", effort: "old" },
    ]);
  });

  it("fills unconfigured roles with the default model only in the unconfigured scope", () => {
    const roles = [
      role({
        key: "bug-fix",
        configured: false,
        routes: [{ kind: "inherit", alias: "inherit-parent" }],
      }),
      role({
        key: "feature, refactoring",
        configured: false,
        routes: [{ kind: "inherit", alias: "inherit-parent" }],
      }),
    ];
    const concrete = planBudget(roles, catalogue, { tier: "large", scope: "concrete" });
    expect(concrete.rows.every((row) => row.status === "skipped")).toBe(true);
    const fill = planBudget(roles, catalogue, {
      tier: "large",
      scope: "unconfigured",
      defaultModel: { provider: "p", model: "full" },
    });
    expect(fill.rows[0]?.routes).toEqual([
      { kind: "route", provider: "p", model: "full", effort: "xhigh" },
    ]);
  });

  it("warns when filling a single entry for an automatic panel", () => {
    const fill = planBudget(
      [
        role({
          key: "arena runners",
          shape: "list",
          autoPanel: true,
          configured: false,
          routes: [{ kind: "inherit", alias: "inherit-parent" }],
        }),
      ],
      catalogue,
      { tier: "large", scope: "unconfigured", defaultModel: { provider: "p", model: "full" } },
    );
    expect(fill.warnings[0]).toEqual({ kind: "auto-panel", role: "arena runners" });
  });

  it("fills a custom-effort model without inventing an effort", () => {
    const fill = planBudget(
      [role({ key: "custom role", configured: false, routes: [] })],
      catalogue,
      { tier: "large", scope: "unconfigured", defaultModel: { provider: "p", model: "custom" } },
    );
    expect(fill.rows[0]).toEqual({
      key: "custom role",
      status: "custom",
      previous: [],
      routes: [{ kind: "route", provider: "p", model: "custom" }],
      detail: { kind: "custom" },
    });
  });

  it("keeps the missing-model detail when another route falls back", () => {
    const plan = planBudget(
      [
        role({
          key: "mixed",
          shape: "list",
          routes: [
            { kind: "route", provider: "p", model: "flat" },
            { kind: "route", provider: "ghost", model: "model" },
          ],
        }),
      ],
      catalogue,
      { tier: "large", scope: "concrete" },
    );
    expect(plan.rows[0]?.status).toBe("custom");
    expect(plan.rows[0]?.detail).toEqual({
      kind: "missing-model",
      provider: "ghost",
      model: "model",
    });
    expect(isBudgetRowBlocked(plan.rows[0]!)).toBe(true);
  });

  it("parses, renders, and replaces the budget line", () => {
    expect(parseBudgetApplyRequest({ tier: "small", scope: "concrete" })).toEqual({
      tier: "small",
      scope: "concrete",
    });
    expect(() => parseBudgetApplyRequest({ tier: "large", scope: "unconfigured" })).toThrow(
      "defaultModel",
    );
    expect(budgetTierFromLabel("large (xhigh)")).toBe("large");
    expect(budgetLineFor("medium")).toBe("# budget: medium (high)");
    expect(
      updateBudgetText(
        "# keep\n# budget: large (xhigh)\nbug-fix: p/a\n",
        "# budget: small (medium)",
      ),
    ).toBe("# keep\n# budget: small (medium)\nbug-fix: p/a\n");
    expect(updateBudgetText("bug-fix: p/a\n", "# budget: large (xhigh)")).toBe(
      "# budget: large (xhigh)\nbug-fix: p/a\n",
    );
    expect(
      updateBudgetText(
        "# budget: small (medium)\nbug-fix: p/a\n# budget: unlimited (max)\n",
        budgetLineFor("large"),
      ),
    ).toBe("# budget: large (xhigh)\nbug-fix: p/a\n");
    expect(
      updateBudgetText("  # budget: small (medium)\nbug-fix: p/a\n", budgetLineFor("large")),
    ).toBe("# budget: large (xhigh)\nbug-fix: p/a\n");
    expect(
      updateBudgetText("\uFEFF# budget: small (medium)\nbug-fix: p/a\n", budgetLineFor("large")),
    ).toBe("\uFEFF# budget: large (xhigh)\nbug-fix: p/a\n");
  });

  it("does not re-tier configured concrete routes in the unconfigured scope", () => {
    const plan = planBudget(
      [role({ key: "bug-fix", routes: [{ kind: "route", provider: "p", model: "full" }] })],
      catalogue,
      { tier: "large", scope: "unconfigured", defaultModel: { provider: "p", model: "full" } },
    );
    expect(plan.rows[0]?.status).toBe("skipped");
    expect(plan.rows[0]?.routes).toEqual([{ kind: "route", provider: "p", model: "full" }]);
  });

  it("skips a role line that carries parse issues", () => {
    const plan = planBudget([role({ key: "bug-fix", hasIssues: true })], catalogue, {
      tier: "large",
      scope: "concrete",
    });
    expect(plan.rows[0]?.status).toBe("skipped");
  });
});
