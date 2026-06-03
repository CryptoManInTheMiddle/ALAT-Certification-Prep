import { createEmptyCard, fsrs, Rating, State, type Card } from "ts-fsrs";
import type { AnswerGrade, ReviewState } from "@/lib/types";

// One shared scheduler instance. Defaults follow ts-fsrs recommendations.
const scheduler = fsrs();

const GRADE_TO_RATING: Record<AnswerGrade, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

/** Build a fresh FSRS card (new, never-reviewed item). */
function emptyReviewState(itemId: string, now = new Date()): ReviewState {
  const card = createEmptyCard(now);
  return cardToState(itemId, card, null);
}

function cardToState(itemId: string, card: Card, lastReview: Date | null): ReviewState {
  return {
    item_id: itemId,
    stability: card.stability,
    difficulty: card.difficulty,
    due_at: card.due.toISOString(),
    last_review: lastReview ? lastReview.toISOString() : null,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
  };
}

function stateToCard(rs: ReviewState): Card {
  return {
    due: new Date(rs.due_at),
    stability: rs.stability,
    difficulty: rs.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: rs.reps,
    lapses: rs.lapses,
    state: rs.state as State,
    last_review: rs.last_review ? new Date(rs.last_review) : undefined,
  };
}

/**
 * Apply a graded answer to an item's FSRS state, returning the updated state
 * with a freshly computed due date. If no prior state exists, starts fresh.
 */
export function reviewItem(
  itemId: string,
  prior: ReviewState | undefined,
  grade: AnswerGrade,
  now = new Date()
): ReviewState {
  const card = prior ? stateToCard(prior) : createEmptyCard(now);
  const rating = GRADE_TO_RATING[grade];
  const result = scheduler.next(card, now, rating);
  return cardToState(itemId, result.card, now);
}

/** True when an item is due for spaced review at `now`. */
export function isDue(rs: ReviewState | undefined, now = new Date()): boolean {
  if (!rs) return false; // unseen items are handled by the scheduler, not "due"
  return new Date(rs.due_at).getTime() <= now.getTime();
}

export { emptyReviewState };
