// Shared domain types for LabReady.

export type Domain = "I" | "II";
export type Difficulty = "easy" | "medium" | "hard";
export type StudyMode = "learn" | "practice" | "drill" | "exam" | "review";

export interface Objective {
  code: string;
  domain: Domain;
  title: string;
  blueprint_wt: number;
  description?: string;
}

export interface ItemOption {
  id: string;
  text: string;
  is_correct: boolean;
  /** Why this distractor is wrong (omit on the correct option). */
  distractor_note?: string;
}

export interface Item {
  id: string;
  objective: string;
  difficulty: Difficulty;
  stem: string;
  explanation: string;
  hook?: string;
  source?: string;
  source_kind?: "seed" | "generated";
  variant_group?: string;
  active?: boolean;
  options: ItemOption[];
}

export interface Lesson {
  objective: string;
  body: string;
}

export interface StudyPlanEntry {
  id?: number;
  week: number;
  day: string;
  topic: string;
  chapter?: string;
}

/** Per-user, per-item FSRS state. */
export interface ReviewState {
  item_id: string;
  stability: number;
  difficulty: number;
  due_at: string; // ISO
  last_review: string | null;
  reps: number;
  lapses: number;
  state: number; // ts-fsrs State enum value
}

/** Per-user, per-objective mastery. */
export interface ObjectiveMastery {
  objective: string;
  mastery: number; // 0..1
  attempts: number;
  due_at: string | null;
}

export interface Attempt {
  id: string;
  item_id: string;
  selected_option: string | null;
  correct: boolean;
  confidence?: 1 | 2 | 3;
  mode: StudyMode;
  latency_ms?: number;
  created_at: string;
}

export interface SessionRecord {
  id: string;
  mode: StudyMode;
  total: number;
  correct: number;
  score: number;
  readiness: number;
  started_at: string;
  ended_at: string | null;
}

/** The grade we derive from correctness + latency + confidence. */
export type AnswerGrade = "again" | "hard" | "good" | "easy";

/** Result of grading one answer — feeds FSRS + mastery updates. */
export interface GradedAnswer {
  itemId: string;
  objective: string;
  optionId: string;
  correct: boolean;
  grade: AnswerGrade;
  confidence?: 1 | 2 | 3;
  latencyMs?: number;
  mode: StudyMode;
}
