"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Attempt,
  GradedAnswer,
  Item,
  ObjectiveMastery,
  ReviewState,
  SessionRecord,
  StudyMode,
} from "@/lib/types";
import { deriveGrade, isConfidentButWrong } from "@/lib/engine/grade";
import { reviewItem } from "@/lib/engine/fsrs";
import { updateMastery } from "@/lib/engine/mastery";

/**
 * Local-first progress store. Persists all user state to localStorage so the
 * PWA works fully offline. When Supabase is configured, the same shape syncs to
 * the user-scoped tables (see src/lib/data/README + provider seam). Records use
 * plain objects (not Maps) so they serialize cleanly.
 */

interface ProgressState {
  reviewState: Record<string, ReviewState>;
  mastery: Record<string, ObjectiveMastery>;
  attempts: Attempt[];
  sessions: SessionRecord[];
  notes: string;
  streakDays: number;
  lastStudyDay: string | null; // YYYY-MM-DD

  recordAnswer: (
    item: Item,
    selectedOptionId: string,
    opts: { mode: StudyMode; confidence?: 1 | 2 | 3; latencyMs?: number }
  ) => GradedAnswer;
  recordSession: (s: Omit<SessionRecord, "id">) => void;
  setNotes: (body: string) => void;
  reset: () => void;
}

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function bumpStreak(state: ProgressState): Partial<ProgressState> {
  const today = todayKey();
  if (state.lastStudyDay === today) return {};
  const yesterday = todayKey(new Date(Date.now() - 86400000));
  const streakDays = state.lastStudyDay === yesterday ? state.streakDays + 1 : 1;
  return { streakDays, lastStudyDay: today };
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      reviewState: {},
      mastery: {},
      attempts: [],
      sessions: [],
      notes: "",
      streakDays: 0,
      lastStudyDay: null,

      recordAnswer: (item, selectedOptionId, opts) => {
        const now = new Date();
        const correct = item.options.find((o) => o.id === selectedOptionId)?.is_correct === true;
        const grade = deriveGrade({ correct, latencyMs: opts.latencyMs, confidence: opts.confidence });

        const state = get();

        // 1. FSRS review_state for this item.
        const nextReview = reviewItem(item.id, state.reviewState[item.id], grade, now);

        // 2. EWMA objective mastery.
        const nextMastery = updateMastery(
          state.mastery[item.objective],
          item.objective,
          { correct, difficulty: item.difficulty },
          now
        );

        // 3. Append the attempt (analytics, calibration, mistake bank).
        const attempt: Attempt = {
          id: crypto.randomUUID(),
          item_id: item.id,
          selected_option: selectedOptionId,
          correct,
          confidence: opts.confidence,
          mode: opts.mode,
          latency_ms: opts.latencyMs,
          created_at: now.toISOString(),
        };

        set((s) => ({
          reviewState: { ...s.reviewState, [item.id]: nextReview },
          mastery: { ...s.mastery, [item.objective]: nextMastery },
          attempts: [...s.attempts, attempt],
          ...bumpStreak(s),
        }));

        return {
          itemId: item.id,
          objective: item.objective,
          optionId: selectedOptionId,
          correct,
          grade,
          confidence: opts.confidence,
          latencyMs: opts.latencyMs,
          mode: opts.mode,
        };
      },

      recordSession: (s) =>
        set((prev) => ({
          sessions: [...prev.sessions, { ...s, id: crypto.randomUUID() }],
          ...bumpStreak(prev),
        })),

      setNotes: (body) => set({ notes: body }),

      reset: () =>
        set({
          reviewState: {},
          mastery: {},
          attempts: [],
          sessions: [],
          notes: "",
          streakDays: 0,
          lastStudyDay: null,
        }),
    }),
    { name: "labready-progress-v1" }
  )
);

// --- Derived selectors (used by dashboard / scheduler bridges) ---

export function masteryMap(state: Pick<ProgressState, "mastery">): Map<string, ObjectiveMastery> {
  return new Map(Object.entries(state.mastery));
}

export function reviewStateMap(state: Pick<ProgressState, "reviewState">): Map<string, ReviewState> {
  return new Map(Object.entries(state.reviewState));
}

export function confidentButWrongCount(state: Pick<ProgressState, "attempts">): number {
  const lastByItem = new Map<string, Attempt>();
  for (const a of state.attempts) lastByItem.set(a.item_id, a);
  let n = 0;
  for (const a of lastByItem.values()) {
    if (isConfidentButWrong({ correct: a.correct, confidence: a.confidence })) n++;
  }
  return n;
}
