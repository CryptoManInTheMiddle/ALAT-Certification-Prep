import type { AnswerGrade } from "@/lib/types";

const FAST_MS = 6000;
const SLOW_MS = 20000;

/**
 * Map an answer outcome to an FSRS grade (Again/Hard/Good/Easy).
 * Derived from correctness + latency + confidence, per CLAUDE.md §7b.
 *
 * - Wrong  → always "again".
 * - Right  → "good" by default; "easy" when fast AND highly confident;
 *            "hard" when slow OR low confidence (a shaky correct answer).
 */
export function deriveGrade(opts: {
  correct: boolean;
  latencyMs?: number;
  confidence?: 1 | 2 | 3;
}): AnswerGrade {
  if (!opts.correct) return "again";

  const fast = opts.latencyMs != null && opts.latencyMs <= FAST_MS;
  const slow = opts.latencyMs != null && opts.latencyMs >= SLOW_MS;
  const confident = opts.confidence === 3;
  const unsure = opts.confidence === 1;

  if (confident && fast) return "easy";
  if (unsure || slow) return "hard";
  return "good";
}

/**
 * "Confident but wrong" — the dangerous miss that learning science says to
 * prioritize for remediation (CLAUDE.md §3.8).
 */
export function isConfidentButWrong(opts: {
  correct: boolean;
  confidence?: 1 | 2 | 3;
}): boolean {
  return !opts.correct && opts.confidence === 3;
}
