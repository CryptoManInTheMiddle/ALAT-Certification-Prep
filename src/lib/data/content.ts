import objectivesJson from "../../../supabase/seed/objectives.json";
import itemsJson from "../../../supabase/seed/items.json";
import lessonsJson from "../../../supabase/seed/lessons.json";
import studyPlanJson from "../../../supabase/seed/study_plan.json";
import type { Item, Lesson, Objective, StudyPlanEntry } from "@/lib/types";

// Bundled, version-controlled content. This is the offline-capable source of
// truth for the item bank and lessons (cached by the service worker so Practice
// works without a network). When Supabase is configured, the same content is
// also loaded server-side via supabase/seed/seed.ts.

export const objectives = objectivesJson as Objective[];
export const items = (itemsJson as Item[]).filter((i) => i.active !== false);
export const lessons = lessonsJson as Lesson[];
export const studyPlan = studyPlanJson as StudyPlanEntry[];

export const objectiveByCode = new Map(objectives.map((o) => [o.code, o]));
export const itemById = new Map(items.map((i) => [i.id, i]));
export const lessonByObjective = new Map(lessons.map((l) => [l.objective, l]));

export function itemsForObjective(code: string): Item[] {
  return items.filter((i) => i.objective === code);
}
