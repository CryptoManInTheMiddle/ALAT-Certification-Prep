"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Item, ItemOption } from "@/lib/types";
import { items as allItems, objectives, objectiveByCode } from "@/lib/data/content";
import { buildExamSet } from "@/lib/engine/scheduler";
import { shuffledOptions } from "@/lib/engine/shuffle";
import { useProgress } from "@/lib/store/progress";
import { currentReadiness } from "@/lib/store/readiness";

const EXAM_SECONDS = 2 * 60 * 60; // 2 hours
const TARGET = 120;

type Phase = "setup" | "running" | "done";

export default function ExamRunner() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [set, setSet] = useState<Item[]>([]);
  const [optionMap, setOptionMap] = useState<Map<string, ItemOption[]>>(new Map());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [cur, setCur] = useState(0);
  const [remaining, setRemaining] = useState(EXAM_SECONDS);
  const [showGrid, setShowGrid] = useState(false);
  const startedAt = useRef<string>("");
  const submittedResult = useRef<ExamResult | null>(null);

  const recordAnswer = useProgress((s) => s.recordAnswer);
  const recordSession = useProgress((s) => s.recordSession);

  function start() {
    const built = buildExamSet(allItems, objectives, TARGET);
    const om = new Map<string, ItemOption[]>();
    built.forEach((it) => om.set(it.id, shuffledOptions(it)));
    setSet(built);
    setOptionMap(om);
    setAnswers({});
    setMarked(new Set());
    setCur(0);
    setRemaining(EXAM_SECONDS);
    startedAt.current = new Date().toISOString();
    setPhase("running");
  }

  // Countdown.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          finish();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function finish() {
    if (submittedResult.current) return;
    let correct = 0;
    const byObjCorrect: Record<string, { c: number; n: number }> = {};
    for (const it of set) {
      const sel = answers[it.id];
      const bucket = (byObjCorrect[it.objective] ??= { c: 0, n: 0 });
      bucket.n += 1;
      if (sel) {
        const g = recordAnswer(it, sel, { mode: "exam" });
        if (g.correct) {
          correct += 1;
          bucket.c += 1;
        }
      }
    }
    const readiness = currentReadiness();
    const score = set.length ? (correct / set.length) * 100 : 0;
    recordSession({
      mode: "exam",
      total: set.length,
      correct,
      score,
      readiness: readiness.overall,
      started_at: startedAt.current,
      ended_at: new Date().toISOString(),
    });
    submittedResult.current = {
      total: set.length,
      correct,
      score,
      readiness: readiness.overall,
      domainI: domainPct(byObjCorrect, "I"),
      domainII: domainPct(byObjCorrect, "II"),
    };
    setPhase("done");
  }

  if (phase === "setup") return <Setup onStart={start} />;
  if (phase === "done") return <Results result={submittedResult.current!} />;

  const item = set[cur];
  const opts = optionMap.get(item.id) ?? item.options;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Timer remaining={remaining} />
        <button className="text-sm text-clinical-300" onClick={() => setShowGrid((v) => !v)}>
          {answeredCount}/{set.length} answered
        </button>
      </div>

      {showGrid ? (
        <Grid
          set={set}
          answers={answers}
          marked={marked}
          onJump={(i) => {
            setCur(i);
            setShowGrid(false);
          }}
          onSubmit={finish}
        />
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="rounded-full bg-ink-line/60 px-2 py-1 text-clinical-300">
              {objectiveByCode.get(item.objective)?.title ?? item.objective}
            </span>
            <span>Q {cur + 1} / {set.length}</span>
          </div>

          <h2 className="text-lg font-semibold leading-snug">{item.stem}</h2>

          <div className="space-y-2.5">
            {opts.map((o) => {
              const selected = answers[item.id] === o.id;
              return (
                <button
                  key={o.id}
                  className={`option ${selected ? "border-clinical-400 bg-clinical-500/10" : ""}`}
                  onClick={() => setAnswers((a) => ({ ...a, [item.id]: o.id }))}
                >
                  {o.text}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              className={`btn-ghost flex-1 text-sm ${marked.has(item.id) ? "text-signal-warn" : ""}`}
              onClick={() =>
                setMarked((m) => {
                  const next = new Set(m);
                  next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                  return next;
                })
              }
            >
              {marked.has(item.id) ? "★ Marked" : "☆ Mark"}
            </button>
            <button className="btn-ghost flex-1 text-sm disabled:opacity-40" disabled={cur === 0} onClick={() => setCur((c) => c - 1)}>
              Prev
            </button>
            {cur < set.length - 1 ? (
              <button className="btn-primary flex-1 text-sm" onClick={() => setCur((c) => c + 1)}>
                Next
              </button>
            ) : (
              <button className="btn-primary flex-1 text-sm" onClick={() => setShowGrid(true)}>
                Finish
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface ExamResult {
  total: number;
  correct: number;
  score: number;
  readiness: number;
  domainI: number;
  domainII: number;
}

function domainPct(by: Record<string, { c: number; n: number }>, domain: "I" | "II"): number {
  let c = 0, n = 0;
  for (const [code, v] of Object.entries(by)) {
    if (objectiveByCode.get(code)?.domain === domain) {
      c += v.c;
      n += v.n;
    }
  }
  return n ? (c / n) * 100 : 0;
}

function Timer({ remaining }: { remaining: number }) {
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const low = remaining < 300;
  return (
    <span className={`font-mono text-lg font-semibold ${low ? "text-signal-bad" : "text-slate-200"}`}>
      {h}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

function Grid({
  set, answers, marked, onJump, onSubmit,
}: {
  set: Item[];
  answers: Record<string, string>;
  marked: Set<string>;
  onJump: (i: number) => void;
  onSubmit: () => void;
}) {
  const unanswered = set.filter((it) => !answers[it.id]).length;
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold">Question map</p>
      <div className="grid grid-cols-6 gap-2">
        {set.map((it, i) => {
          const answered = !!answers[it.id];
          const mk = marked.has(it.id);
          return (
            <button
              key={it.id + i}
              onClick={() => onJump(i)}
              className={`relative aspect-square rounded-lg text-xs font-medium ${
                answered ? "bg-clinical-600 text-ink" : "bg-ink-line/50 text-muted"
              }`}
            >
              {i + 1}
              {mk && <span className="absolute -right-0.5 -top-1 text-signal-warn">★</span>}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        {unanswered === 0 ? "All questions answered." : `${unanswered} unanswered — they will be scored as incorrect.`}
      </p>
      <button className="btn-primary w-full" onClick={onSubmit}>
        Submit exam
      </button>
    </div>
  );
}

function Setup({ onStart }: { onStart: () => void }) {
  const available = allItems.length;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Exam Simulator</h1>
      <div className="card space-y-2 text-sm text-slate-200">
        <p>Mirrors the real Prometric ALAT format:</p>
        <ul className="ml-4 list-disc space-y-1 text-slate-300">
          <li>Up to <strong>120 questions</strong>, blueprint-weighted (~75% Domain I / 25% Domain II)</li>
          <li><strong>2-hour</strong> countdown timer</li>
          <li>Mark-for-review and a question map</li>
          <li><strong>No feedback</strong> until you submit</li>
        </ul>
        {available < TARGET && (
          <p className="rounded-lg bg-signal-warn/10 p-2 text-xs text-signal-warn">
            The verified bank currently holds {available} items, so this simulation uses {available} unique
            questions. It grows toward 120 as the item bank expands.
          </p>
        )}
      </div>
      <button className="btn-primary w-full" onClick={onStart}>
        Begin simulation
      </button>
    </div>
  );
}

function Results({ result }: { result: ExamResult }) {
  const pct = Math.round(result.score);
  const pass = pct >= 70;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Exam Results</h1>
      <div className="card text-center">
        <p className={`text-6xl font-bold ${pass ? "text-signal-good" : "text-signal-bad"}`}>{pct}%</p>
        <p className="mt-1 text-sm text-muted">{result.correct} / {result.total} correct</p>
        <p className={`mt-2 text-sm font-semibold ${pass ? "text-signal-good" : "text-signal-warn"}`}>
          {pass ? "Above the ~70% pass line" : "Below the ~70% pass line"}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DomainCard label="Domain I" value={result.domainI} />
        <DomainCard label="Domain II" value={result.domainII} />
      </div>
      <div className="card text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-clinical-300">Readiness snapshot</p>
        <p className="mt-1 text-slate-200">Logged at {Math.round(result.readiness)}% — view the trend in Progress.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/drill" className="btn-ghost text-center">Drill weak spots</Link>
        <Link href="/progress" className="btn-primary text-center">View progress</Link>
      </div>
    </div>
  );
}

function DomainCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card text-center">
      <p className="text-3xl font-bold text-clinical-300">{Math.round(value)}%</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
