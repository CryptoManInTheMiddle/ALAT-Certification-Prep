"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GradedAnswer, Item, StudyMode } from "@/lib/types";
import { shuffledOptions } from "@/lib/engine/shuffle";
import { objectiveByCode } from "@/lib/data/content";
import { useProgress } from "@/lib/store/progress";

interface Props {
  item: Item;
  mode: StudyMode;
  /** Capture a confidence rating before reveal (calibration). Default on. */
  captureConfidence?: boolean;
  onNext: (graded: GradedAnswer) => void;
  index?: number;
  total?: number;
}

export default function QuestionCard({ item, mode, captureConfidence = true, onNext, index, total }: Props) {
  const recordAnswer = useProgress((s) => s.recordAnswer);

  // Reshuffle on each new presentation of the item (correctness lives on id).
  const options = useMemo(() => shuffledOptions(item), [item.id]);
  const objTitle = objectiveByCode.get(item.objective)?.title ?? item.objective;

  const [selected, setSelected] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<1 | 2 | 3 | undefined>(undefined);
  const [graded, setGraded] = useState<GradedAnswer | null>(null);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    // Reset for the next item.
    setSelected(null);
    setConfidence(undefined);
    setGraded(null);
    startedAt.current = Date.now();
  }, [item.id]);

  const submitted = graded !== null;

  function submit() {
    if (!selected || submitted) return;
    const result = recordAnswer(item, selected, {
      mode,
      confidence,
      latencyMs: Date.now() - startedAt.current,
    });
    setGraded(result);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="rounded-full bg-ink-line/60 px-2 py-1 font-medium text-clinical-300">{objTitle}</span>
        <span className="capitalize">
          {item.difficulty}
          {index != null && total != null ? ` · ${index + 1}/${total}` : ""}
        </span>
      </div>

      <h2 className="text-lg font-semibold leading-snug">{item.stem}</h2>

      <div className="space-y-2.5">
        {options.map((o) => {
          const isSelected = selected === o.id;
          let cls = "option";
          if (submitted) {
            if (o.is_correct) cls += " border-signal-good/70 bg-signal-good/10";
            else if (isSelected) cls += " border-signal-bad/70 bg-signal-bad/10";
            else cls += " opacity-60";
          } else if (isSelected) {
            cls += " border-clinical-400 bg-clinical-500/10";
          }
          return (
            <button
              key={o.id}
              className={cls}
              disabled={submitted}
              onClick={() => setSelected(o.id)}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                    isSelected ? "border-clinical-400 text-clinical-300" : "border-ink-line text-muted"
                  }`}
                >
                  {submitted && o.is_correct ? "✓" : submitted && isSelected ? "✕" : ""}
                </span>
                <span className="flex-1">
                  {o.text}
                  {submitted && !o.is_correct && o.distractor_note && (
                    <span className="mt-1 block text-[13px] text-signal-bad/90">{o.distractor_note}</span>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {captureConfidence && !submitted && selected && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">How sure?</span>
          {([1, 2, 3] as const).map((c) => (
            <button
              key={c}
              onClick={() => setConfidence(c)}
              className={`rounded-lg px-3 py-1.5 text-xs ${
                confidence === c ? "bg-clinical-500 text-ink" : "bg-ink-line/50 text-slate-300"
              }`}
            >
              {c === 1 ? "Guess" : c === 2 ? "Maybe" : "Sure"}
            </button>
          ))}
        </div>
      )}

      {!submitted ? (
        <button className="btn-primary w-full disabled:opacity-40" disabled={!selected} onClick={submit}>
          Check answer
        </button>
      ) : (
        <Feedback item={item} graded={graded!} onNext={() => onNext(graded!)} />
      )}
    </div>
  );
}

function Feedback({ item, graded, onNext }: { item: Item; graded: GradedAnswer; onNext: () => void }) {
  return (
    <div className="space-y-3">
      <div
        className={`rounded-xl px-4 py-3 text-sm font-semibold ${
          graded.correct ? "bg-signal-good/15 text-signal-good" : "bg-signal-bad/15 text-signal-bad"
        }`}
      >
        {graded.correct ? "Correct" : "Not quite"}
        {!graded.correct && graded.confidence === 3 && (
          <span className="ml-2 font-normal text-signal-warn">— confident but wrong: re-queued for priority review</span>
        )}
      </div>

      <div className="card space-y-3 text-sm">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-clinical-300">Why</p>
          <p className="leading-relaxed text-slate-200">{item.explanation}</p>
        </div>
        {item.hook && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-clinical-300">Memory hook</p>
            <p className="leading-relaxed text-slate-200">{item.hook}</p>
          </div>
        )}
        {item.source && <p className="text-xs text-muted">Source: {item.source}</p>}
      </div>

      <button className="btn-primary w-full" onClick={onNext}>
        Next
      </button>
    </div>
  );
}
