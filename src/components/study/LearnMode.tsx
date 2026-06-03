"use client";

import { useMemo, useState } from "react";
import type { Item } from "@/lib/types";
import { objectives, lessonByObjective, itemsForObjective } from "@/lib/data/content";
import { useProgress, masteryMap } from "@/lib/store/progress";
import { shuffle } from "@/lib/engine/shuffle";
import QuestionCard from "./QuestionCard";

// Walk objectives in blueprint-weighted order (heaviest first).
const ordered = [...objectives].sort((a, b) => b.blueprint_wt - a.blueprint_wt);

export default function LearnMode() {
  const [selected, setSelected] = useState<string | null>(null);
  const mastery = useProgress((s) => s.mastery);
  const m = masteryMap({ mastery });

  if (selected) {
    return <LearnObjective code={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Learn</h1>
        <p className="text-sm text-muted">A tight concept, then immediate recall. Heaviest exam topics first.</p>
      </header>
      <div className="space-y-2">
        {ordered.map((o) => {
          const pct = Math.round((m.get(o.code)?.mastery ?? 0) * 100);
          return (
            <button
              key={o.code}
              className="card flex items-center gap-3 text-left hover:border-clinical-500"
              onClick={() => setSelected(o.code)}
            >
              <div className="flex-1">
                <p className="text-sm font-semibold">{o.title}</p>
                <p className="text-xs text-muted">Domain {o.domain} · weight {o.blueprint_wt}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-clinical-300">{pct}%</p>
                <p className="text-[10px] text-muted">mastery</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LearnObjective({ code, onBack }: { code: string; onBack: () => void }) {
  const lesson = lessonByObjective.get(code);
  const objective = objectives.find((o) => o.code === code)!;
  const checks = useMemo<Item[]>(() => shuffle(itemsForObjective(code)).slice(0, 2), [code]);
  const [phase, setPhase] = useState<"lesson" | "check">("lesson");
  const [i, setI] = useState(0);

  return (
    <div className="space-y-4">
      <button className="text-sm text-clinical-300" onClick={onBack}>← All topics</button>
      <h1 className="text-xl font-bold">{objective.title}</h1>

      {phase === "lesson" && (
        <>
          <div className="card text-[15px] leading-relaxed text-slate-200">
            {lesson?.body ?? "Lesson coming soon for this objective."}
          </div>
          {checks.length > 0 ? (
            <button className="btn-primary w-full" onClick={() => setPhase("check")}>
              Check your recall ({checks.length})
            </button>
          ) : (
            <button className="btn-ghost w-full" onClick={onBack}>Back to topics</button>
          )}
        </>
      )}

      {phase === "check" && i < checks.length && (
        <>
          <p className="text-xs text-muted">Retrieval check {i + 1} of {checks.length}</p>
          <QuestionCard
            item={checks[i]}
            mode="learn"
            index={i}
            total={checks.length}
            onNext={() => setI((n) => n + 1)}
          />
        </>
      )}

      {phase === "check" && i >= checks.length && (
        <div className="card space-y-3 text-center">
          <p className="text-lg font-semibold text-clinical-300">Nice — scheduled for spaced review.</p>
          <p className="text-sm text-muted">This concept is now in your FSRS queue and will resurface at the right time.</p>
          <button className="btn-primary w-full" onClick={onBack}>Learn another topic</button>
        </div>
      )}
    </div>
  );
}
