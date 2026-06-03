import { describe, it, expect } from "vitest";
import { deriveGrade, isConfidentButWrong } from "./grade";
import { reviewItem, isDue } from "./fsrs";
import { updateMastery, targetDifficulty } from "./mastery";
import { computeReadiness, coverageFactor, bandFor } from "./readiness";
import { buildStudySet, buildExamSet } from "./scheduler";
import { shuffledOptions } from "./shuffle";
import type { Item, Objective, ObjectiveMastery } from "@/lib/types";

const objectives: Objective[] = [
  { code: "A", domain: "I", title: "A", blueprint_wt: 50 },
  { code: "B", domain: "II", title: "B", blueprint_wt: 50 },
];

function makeItem(id: string, objective: string, difficulty: Item["difficulty"] = "medium"): Item {
  return {
    id,
    objective,
    difficulty,
    stem: `stem ${id}`,
    explanation: "because",
    options: [
      { id: `${id}-1`, text: "correct", is_correct: true },
      { id: `${id}-2`, text: "wrong", is_correct: false, distractor_note: "no" },
      { id: `${id}-3`, text: "wrong", is_correct: false, distractor_note: "no" },
      { id: `${id}-4`, text: "wrong", is_correct: false, distractor_note: "no" },
    ],
  };
}

describe("grade derivation", () => {
  it("wrong is always again", () => {
    expect(deriveGrade({ correct: false, latencyMs: 1000, confidence: 3 })).toBe("again");
  });
  it("fast + confident is easy", () => {
    expect(deriveGrade({ correct: true, latencyMs: 2000, confidence: 3 })).toBe("easy");
  });
  it("slow correct is hard", () => {
    expect(deriveGrade({ correct: true, latencyMs: 25000 })).toBe("hard");
  });
  it("flags confident-but-wrong", () => {
    expect(isConfidentButWrong({ correct: false, confidence: 3 })).toBe(true);
    expect(isConfidentButWrong({ correct: true, confidence: 3 })).toBe(false);
  });
});

describe("FSRS", () => {
  it("schedules a future due date and marks new items not due until reviewed", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const after = reviewItem("x", undefined, "good", now);
    expect(new Date(after.due_at).getTime()).toBeGreaterThan(now.getTime());
    expect(after.reps).toBe(1);
  });
  it("an again grade still produces a valid state", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const after = reviewItem("x", undefined, "again", now);
    expect(after.lapses).toBeGreaterThanOrEqual(0);
    expect(isDue(after, new Date("2026-12-31"))).toBe(true);
  });
});

describe("mastery EWMA", () => {
  it("rises with correct answers and falls with wrong", () => {
    let m: ObjectiveMastery | undefined;
    for (let i = 0; i < 8; i++) m = updateMastery(m, "A", { correct: true, difficulty: "medium" });
    expect(m!.mastery).toBeGreaterThan(0.6);
    const dropped = updateMastery(m, "A", { correct: false, difficulty: "easy" });
    expect(dropped.mastery).toBeLessThan(m!.mastery);
  });
  it("targets difficulty above current mastery", () => {
    expect(targetDifficulty(0.1)).toBe("easy");
    expect(targetDifficulty(0.5)).toBe("medium");
    expect(targetDifficulty(0.9)).toBe("hard");
  });
});

describe("readiness", () => {
  it("does not credit untested objectives", () => {
    const r = computeReadiness(objectives, new Map());
    expect(r.overall).toBe(0);
    expect(r.band).toBe("foundational");
  });
  it("coverage saturates with attempts", () => {
    expect(coverageFactor(0)).toBe(0);
    expect(coverageFactor(20)).toBeGreaterThan(0.99);
  });
  it("weights domains by blueprint and bands correctly", () => {
    const mastery = new Map<string, ObjectiveMastery>([
      ["A", { objective: "A", mastery: 0.9, attempts: 20, due_at: null }],
      ["B", { objective: "B", mastery: 0.9, attempts: 20, due_at: null }],
    ]);
    const r = computeReadiness(objectives, mastery);
    expect(r.overall).toBeGreaterThan(80);
    expect(bandFor(r.overall)).toBe("exam-ready");
  });
});

describe("shuffle keeps correctness by id", () => {
  it("always retains exactly one correct option regardless of order", () => {
    const item = makeItem("q", "A");
    for (let i = 0; i < 50; i++) {
      const opts = shuffledOptions(item);
      expect(opts.filter((o) => o.is_correct)).toHaveLength(1);
      expect(opts).toHaveLength(4);
    }
  });
});

describe("scheduler interleaving", () => {
  it("never serves more than 2 consecutive items from the same objective", () => {
    const items: Item[] = [];
    for (let i = 0; i < 10; i++) items.push(makeItem(`a${i}`, "A"));
    for (let i = 0; i < 10; i++) items.push(makeItem(`b${i}`, "B"));
    const set = buildStudySet(
      { items, objectives, reviewState: new Map(), mastery: new Map(), attempts: [] },
      12
    );
    let run = 1;
    for (let i = 1; i < set.length; i++) {
      run = set[i].objective === set[i - 1].objective ? run + 1 : 1;
      expect(run).toBeLessThanOrEqual(2);
    }
  });

  it("exam set roughly honors blueprint weighting", () => {
    const items: Item[] = [];
    for (let i = 0; i < 60; i++) items.push(makeItem(`a${i}`, "A"));
    for (let i = 0; i < 60; i++) items.push(makeItem(`b${i}`, "B"));
    const exam = buildExamSet(items, objectives, 120);
    expect(exam.length).toBeGreaterThan(100);
    const aCount = exam.filter((i) => i.objective === "A").length;
    // 50/50 blueprint → roughly half from A (allow generous tolerance).
    expect(aCount).toBeGreaterThan(40);
    expect(aCount).toBeLessThan(80);
  });
});
