import type {
  Attempt,
  Item,
  Objective,
  ObjectiveMastery,
  ReviewState,
} from "@/lib/types";
import { isDue } from "./fsrs";
import { shuffle } from "./shuffle";

export interface SchedulerInputs {
  items: Item[];
  objectives: Objective[];
  reviewState: Map<string, ReviewState>;
  mastery: Map<string, ObjectiveMastery>;
  attempts: Attempt[];
  now?: Date;
}

interface Scored {
  item: Item;
  score: number;
  reason: "overdue" | "weak" | "confident-wrong" | "coverage" | "fresh";
}

/**
 * Assemble the next study set, following the priority order in CLAUDE.md §7a:
 *   1. Overdue (FSRS due_at < now), weighted by lapses
 *   2. Weak objectives (low mastery), at difficulty = mastery + one step
 *   3. Confident-but-wrong items (priority remediation)
 *   4. Coverage gaps (few attempts), weighted by blueprint_wt
 *   5. Interleave: never serve >2 consecutive items from the same objective
 */
export function buildStudySet(inputs: SchedulerInputs, count = 12): Item[] {
  const now = inputs.now ?? new Date();
  const masteryByObj = inputs.mastery;
  const objByCode = new Map(inputs.objectives.map((o) => [o.code, o]));

  const attemptsByItem = new Map<string, Attempt[]>();
  for (const a of inputs.attempts) {
    const list = attemptsByItem.get(a.item_id) ?? [];
    list.push(a);
    attemptsByItem.set(a.item_id, list);
  }

  // Set of items where the most recent attempt was confident-but-wrong.
  const confidentWrong = new Set<string>();
  for (const [itemId, list] of attemptsByItem) {
    const last = list[list.length - 1];
    if (last && !last.correct && last.confidence === 3) confidentWrong.add(itemId);
  }

  const candidates: Scored[] = [];
  for (const item of inputs.items) {
    if (item.active === false) continue;
    const rs = inputs.reviewState.get(item.id);
    const om = masteryByObj.get(item.objective);
    const objWt = objByCode.get(item.objective)?.blueprint_wt ?? 1;
    const seen = attemptsByItem.has(item.id);

    let score = 0;
    let reason: Scored["reason"] = "fresh";

    if (isDue(rs, now)) {
      // 1. Overdue — highest priority, more overdue & more lapses = higher.
      const overdueDays = rs ? (now.getTime() - new Date(rs.due_at).getTime()) / 86400000 : 0;
      score = 1000 + overdueDays * 5 + (rs?.lapses ?? 0) * 20;
      reason = "overdue";
    } else if (confidentWrong.has(item.id)) {
      // 3. Confident-but-wrong — dangerous misses.
      score = 800;
      reason = "confident-wrong";
    } else if (om && om.mastery < 0.6 && om.attempts > 0) {
      // 2. Weak objective — favor items at the desirable difficulty step.
      const weakness = 1 - om.mastery;
      const diffFit = difficultyFit(item.difficulty, om.mastery);
      score = 500 + weakness * 200 + diffFit * 50 + (seen ? 0 : 30);
      reason = "weak";
    } else {
      // 4. Coverage gap — fewer attempts on this objective + higher blueprint
      //    weight = more important to cover. Unseen items preferred.
      const objAttempts = om?.attempts ?? 0;
      score = 100 + objWt * 4 - objAttempts * 3 + (seen ? -20 : 25);
      reason = "coverage";
    }

    // Light jitter keeps sets feeling dynamic between renders (CLAUDE.md §1).
    score += Math.random() * 8;
    candidates.push({ item, score, reason });
  }

  candidates.sort((a, b) => b.score - a.score);

  // 5. Interleave — pull in score order but never >2 in a row from one objective.
  return interleave(candidates, count);
}

function interleave(scored: Scored[], count: number): Item[] {
  const out: Item[] = [];
  const pool = scored.slice();
  let lastObj: string | null = null;
  let runLen = 0;

  while (out.length < count && pool.length > 0) {
    let idx = pool.findIndex((s) => !(s.item.objective === lastObj && runLen >= 2));
    if (idx === -1) idx = 0; // exhausted alternatives; allow the repeat
    const [picked] = pool.splice(idx, 1);
    if (picked.item.objective === lastObj) runLen += 1;
    else {
      lastObj = picked.item.objective;
      runLen = 1;
    }
    out.push(picked.item);
  }
  return out;
}

/** 1.0 when the item's difficulty matches the desirable step above mastery. */
function difficultyFit(difficulty: Item["difficulty"], mastery: number): number {
  const want = mastery < 0.4 ? "easy" : mastery < 0.75 ? "medium" : "hard";
  if (difficulty === want) return 1;
  // adjacent difficulty is a partial fit
  const order = ["easy", "medium", "hard"];
  return Math.abs(order.indexOf(difficulty) - order.indexOf(want)) === 1 ? 0.4 : 0;
}

/** Review mode: only items that are FSRS-due, soonest/most-overdue first. */
export function buildReviewSet(inputs: SchedulerInputs, count = 20): Item[] {
  const now = inputs.now ?? new Date();
  const due = inputs.items.filter((it) => it.active !== false && isDue(inputs.reviewState.get(it.id), now));
  due.sort((a, b) => {
    const da = new Date(inputs.reviewState.get(a.id)!.due_at).getTime();
    const db = new Date(inputs.reviewState.get(b.id)!.due_at).getTime();
    return da - db;
  });
  return interleave(due.map((item) => ({ item, score: 0, reason: "overdue" as const })), count);
}

/** Drill mode: lowest-mastery objectives + confident-but-wrong + recent misses. */
export function buildDrillSet(inputs: SchedulerInputs, count = 15): Item[] {
  const attemptsByItem = new Map<string, Attempt[]>();
  for (const a of inputs.attempts) {
    const list = attemptsByItem.get(a.item_id) ?? [];
    list.push(a);
    attemptsByItem.set(a.item_id, list);
  }

  const weakObjectives = new Set(
    [...inputs.mastery.values()]
      .filter((m) => m.attempts > 0 && m.mastery < 0.6)
      .sort((a, b) => a.mastery - b.mastery)
      .map((m) => m.objective)
  );

  const scored: Scored[] = [];
  for (const item of inputs.items) {
    if (item.active === false) continue;
    const list = attemptsByItem.get(item.id);
    const last = list?.[list.length - 1];
    let score = 0;
    if (last && !last.correct && last.confidence === 3) score = 900; // confident-wrong
    else if (last && !last.correct) score = 600; // recent miss
    else if (weakObjectives.has(item.objective)) score = 300;
    else continue; // drill only targets trouble spots
    score += Math.random() * 10;
    scored.push({ item, score, reason: "weak" });
  }
  scored.sort((a, b) => b.score - a.score);
  return interleave(scored, count);
}

/** Exam mode: blueprint-weighted sample across all objectives (CLAUDE.md §5). */
export function buildExamSet(items: Item[], objectives: Objective[], total = 120): Item[] {
  const active = items.filter((i) => i.active !== false);
  const byObjective = new Map<string, Item[]>();
  for (const it of active) {
    const list = byObjective.get(it.objective) ?? [];
    list.push(it);
    byObjective.set(it.objective, list);
  }

  const totalWt = objectives.reduce((s, o) => s + o.blueprint_wt, 0);
  const picked: Item[] = [];

  for (const obj of objectives) {
    const pool = shuffle(byObjective.get(obj.code) ?? []);
    if (pool.length === 0) continue;
    const target = Math.round((obj.blueprint_wt / totalWt) * total);
    for (let i = 0; i < target; i++) {
      picked.push(pool[i % pool.length]); // allow reuse if the pool is thin
    }
  }

  // Trim/pad to exactly `total`, then interleave so domains are mixed.
  const trimmed = picked.slice(0, total);
  const scored = trimmed.map((item) => ({ item, score: Math.random(), reason: "coverage" as const }));
  scored.sort((a, b) => b.score - a.score);
  return interleave(scored, Math.min(total, trimmed.length));
}
