"use client";

import { useProgress, masteryMap } from "./progress";
import { computeReadiness, type ReadinessResult } from "@/lib/engine/readiness";
import { objectives } from "@/lib/data/content";

/** Live readiness derived from the persisted mastery map. */
export function useReadiness(): ReadinessResult {
  const mastery = useProgress((s) => s.mastery);
  return computeReadiness(objectives, masteryMap({ mastery }));
}

export function currentReadiness(): ReadinessResult {
  const { mastery } = useProgress.getState();
  return computeReadiness(objectives, masteryMap({ mastery }));
}
