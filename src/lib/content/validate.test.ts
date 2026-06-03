import { describe, it, expect } from "vitest";
import { validateBank } from "./validate";
import type { Item, Objective } from "@/lib/types";
import items from "../../../supabase/seed/items.json";
import objectives from "../../../supabase/seed/objectives.json";

describe("seed bank content contract", () => {
  const known = new Set((objectives as Objective[]).map((o) => o.code));

  it("every seed item passes the validation contract", () => {
    const issues = validateBank(items as Item[], known);
    if (issues.length) {
      console.error(issues.map((i) => `${i.itemId}: ${i.problem}`).join("\n"));
    }
    expect(issues).toHaveLength(0);
  });

  it("covers a broad set of objectives", () => {
    const covered = new Set((items as Item[]).map((i) => i.objective));
    // Each covered objective is a real ECO code.
    for (const code of covered) expect(known.has(code)).toBe(true);
    expect(covered.size).toBeGreaterThanOrEqual(18);
  });
});
