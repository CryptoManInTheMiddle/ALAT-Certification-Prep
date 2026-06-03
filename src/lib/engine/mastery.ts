import type { Difficulty, ObjectiveMastery } from "@/lib/types";

// Difficulty weighting: getting a hard item right counts for more; getting an
// easy item wrong hurts more. Desirable-difficulty aware.
const DIFFICULTY_WEIGHT: Record<Difficulty, number> = {
  easy: 0.7,
  medium: 1.0,
  hard: 1.3,
};

// EWMA smoothing factor. Higher = more responsive to recent performance.
const ALPHA = 0.3;

/**
 * Update per-objective mastery as a difficulty-weighted EWMA of correctness
 * (CLAUDE.md §6 objective_mastery, §3 adaptive difficulty).
 *
 * Mastery stays in [0,1]. The objective's `due_at` advances on success and
 * pulls in on failure so weak objectives resurface sooner.
 */
export function updateMastery(
  prior: ObjectiveMastery | undefined,
  objective: string,
  opts: { correct: boolean; difficulty: Difficulty },
  now = new Date()
): ObjectiveMastery {
  const w = DIFFICULTY_WEIGHT[opts.difficulty];
  // Target this observation contributes toward.
  const target = opts.correct ? Math.min(1, 0.5 + 0.5 * w) : Math.max(0, 0.5 - 0.5 * w);

  const priorMastery = prior?.mastery ?? 0;
  const effAlpha = clamp(ALPHA * w, 0.05, 0.6);
  const mastery = clamp(priorMastery + effAlpha * (target - priorMastery), 0, 1);

  const attempts = (prior?.attempts ?? 0) + 1;

  // Schedule the objective: strong mastery → further out, weak → sooner.
  const days = opts.correct ? 1 + Math.round(mastery * 9) : 0; // 0–10 days
  const due = new Date(now.getTime() + days * 24 * 3600 * 1000);

  return { objective, mastery, attempts, due_at: due.toISOString() };
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** One difficulty step above current mastery — the item we should serve next. */
export function targetDifficulty(mastery: number): Difficulty {
  if (mastery < 0.4) return "easy";
  if (mastery < 0.75) return "medium";
  return "hard";
}
