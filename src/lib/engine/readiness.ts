import type { Domain, Objective, ObjectiveMastery } from "@/lib/types";

export interface ReadinessResult {
  overall: number; // 0..100
  byDomain: Record<Domain, number>; // 0..100 within each domain
  band: ReadinessBand;
  perObjective: Array<{ objective: string; mastery: number; coverage: number; contribution: number }>;
}

export type ReadinessBand = "exam-ready" | "passing" | "borderline" | "foundational";

/**
 * Coverage factor: a saturating function of attempts so we never credit an
 * untested objective for "mastery" we haven't actually measured (CLAUDE.md §7d).
 * Reaches ~1.0 around 6–8 attempts.
 */
export function coverageFactor(attempts: number): number {
  return 1 - Math.exp(-attempts / 4);
}

/**
 * readiness = Σ_objective ( blueprint_wt × min(mastery, coverage_factor) ) / Σ blueprint_wt × 100
 */
export function computeReadiness(
  objectives: Objective[],
  mastery: Map<string, ObjectiveMastery>
): ReadinessResult {
  let totalWt = 0;
  let weightedScore = 0;
  const domainWt: Record<Domain, number> = { I: 0, II: 0 };
  const domainScore: Record<Domain, number> = { I: 0, II: 0 };
  const perObjective: ReadinessResult["perObjective"] = [];

  for (const obj of objectives) {
    const m = mastery.get(obj.code);
    const masteryVal = m?.mastery ?? 0;
    const coverage = coverageFactor(m?.attempts ?? 0);
    const credited = Math.min(masteryVal, coverage);
    const contribution = obj.blueprint_wt * credited;

    totalWt += obj.blueprint_wt;
    weightedScore += contribution;
    domainWt[obj.domain] += obj.blueprint_wt;
    domainScore[obj.domain] += contribution;

    perObjective.push({ objective: obj.code, mastery: masteryVal, coverage, contribution });
  }

  const overall = totalWt > 0 ? (weightedScore / totalWt) * 100 : 0;
  const byDomain: Record<Domain, number> = {
    I: domainWt.I > 0 ? (domainScore.I / domainWt.I) * 100 : 0,
    II: domainWt.II > 0 ? (domainScore.II / domainWt.II) * 100 : 0,
  };

  return { overall, byDomain, band: bandFor(overall), perObjective };
}

export function bandFor(overall: number): ReadinessBand {
  if (overall >= 80) return "exam-ready";
  if (overall >= 70) return "passing";
  if (overall >= 55) return "borderline";
  return "foundational";
}

export const BAND_COPY: Record<ReadinessBand, { label: string; blurb: string; color: string }> = {
  "exam-ready": {
    label: "Exam-ready",
    blurb: "At or above the first-time pass rate. Keep reviewing due items to hold retention.",
    color: "signal-good",
  },
  passing: {
    label: "Passing range",
    blurb: "You're in the passing band — keep refining your weaker domains.",
    color: "clinical-400",
  },
  borderline: {
    label: "Borderline",
    blurb: "Targeted drilling needed before you sit the exam.",
    color: "signal-warn",
  },
  foundational: {
    label: "Foundational review",
    blurb: "Follow the study plan and build coverage across the blueprint.",
    color: "signal-bad",
  },
};
