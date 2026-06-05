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
  updatedAt: string | null; // ISO, bumped on every mutation (for sync merge)

  recordAnswer: (
    item: Item,
    selectedOptionId: string,
    opts: { mode: StudyMode; confidence?: 1 | 2 | 3; latencyMs?: number }
  ) => GradedAnswer;
  recordSession: (s: Omit<SessionRecord, "id">) => void;
  setNotes: (body: string) => void;
  /** Replace state with a merged (local + remote) snapshot — used by sync. */
  applyRemote: (remote: ProgressSlice) => void;
  reset: () => void;
}

/** The portion of state that syncs to Supabase (one JSONB blob per user). */
export interface ProgressSlice {
  reviewState: Record<string, ReviewState>;
  mastery: Record<string, ObjectiveMastery>;
  attempts: Attempt[];
  sessions: SessionRecord[];
  notes: string;
  streakDays: number;
  lastStudyDay: string | null;
  updatedAt: string | null;
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
      updatedAt: null,

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
          updatedAt: now.toISOString(),
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
          updatedAt: new Date().toISOString(),
          ...bumpStreak(prev),
        })),

      setNotes: (body) => set({ notes: body, updatedAt: new Date().toISOString() }),

      applyRemote: (remote) => set((local) => mergeSlices(local, remote)),

      reset: () =>
        set({
          reviewState: {},
          mastery: {},
          attempts: [],
          sessions: [],
          notes: "",
          streakDays: 0,
          lastStudyDay: null,
          updatedAt: null,
        }),
    }),
    { name: "labready-progress-v1" }
  )
);

// --- Sync helpers ---

export function exportSlice(state: ProgressState): ProgressSlice {
  return {
    reviewState: state.reviewState,
    mastery: state.mastery,
    attempts: state.attempts,
    sessions: state.sessions,
    notes: state.notes,
    streakDays: state.streakDays,
    lastStudyDay: state.lastStudyDay,
    updatedAt: state.updatedAt,
  };
}

/**
 * Non-destructive merge of a remote snapshot into local state. Designed so a
 * cross-device sign-in never loses history:
 *  - attempts/sessions: union by id
 *  - reviewState: per item, keep the most recently reviewed
 *  - mastery: per objective, keep the entry with more attempts
 *  - scalars (notes / streak / lastStudyDay): from whichever side is newer
 */
function mergeSlices(local: ProgressSlice, remote: ProgressSlice): Partial<ProgressState> {
  const unionById = <T extends { id: string }>(a: T[], b: T[]): T[] => {
    const m = new Map<string, T>();
    for (const x of a) m.set(x.id, x);
    for (const x of b) if (!m.has(x.id)) m.set(x.id, x);
    return [...m.values()];
  };

  const reviewState: Record<string, ReviewState> = { ...remote.reviewState };
  for (const [id, rs] of Object.entries(local.reviewState)) {
    const r = reviewState[id];
    reviewState[id] = r && reviewedAfter(r, rs) ? r : rs;
  }

  const mastery: Record<string, ObjectiveMastery> = { ...remote.mastery };
  for (const [code, m] of Object.entries(local.mastery)) {
    const r = mastery[code];
    mastery[code] = r && (r.attempts ?? 0) > (m.attempts ?? 0) ? r : m;
  }

  const remoteNewer = ts(remote.updatedAt) > ts(local.updatedAt);
  const scalarSrc = remoteNewer ? remote : local;

  return {
    reviewState,
    mastery,
    attempts: unionById(local.attempts ?? [], remote.attempts ?? []),
    sessions: unionById(local.sessions ?? [], remote.sessions ?? []),
    notes: scalarSrc.notes ?? local.notes,
    streakDays: Math.max(local.streakDays ?? 0, remote.streakDays ?? 0),
    lastStudyDay: scalarSrc.lastStudyDay ?? local.lastStudyDay,
    updatedAt: new Date().toISOString(),
  };
}

function reviewedAfter(a: ReviewState, b: ReviewState): boolean {
  return ts(a.last_review ?? a.due_at) > ts(b.last_review ?? b.due_at);
}

function ts(iso: string | null | undefined): number {
  return iso ? new Date(iso).getTime() : 0;
}

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
