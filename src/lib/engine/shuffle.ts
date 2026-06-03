import type { Item, ItemOption } from "@/lib/types";

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Shuffle an item's options for display. Correctness is carried by option.id,
 * never by position — so no position-memorization is possible (CLAUDE.md §3.6).
 */
export function shuffledOptions(item: Item, rng: () => number = Math.random): ItemOption[] {
  return shuffle(item.options, rng);
}
