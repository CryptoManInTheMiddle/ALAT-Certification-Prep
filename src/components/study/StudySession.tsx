"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { GradedAnswer, Item, StudyMode } from "@/lib/types";
import QuestionCard from "./QuestionCard";
import { useProgress } from "@/lib/store/progress";
import { currentReadiness } from "@/lib/store/readiness";
import { reviewStateMap, masteryMap } from "@/lib/store/progress";
import { buildStudySet, buildReviewSet, buildDrillSet, type SchedulerInputs } from "@/lib/engine/scheduler";
import { items as allItems, objectives } from "@/lib/data/content";

type Kind = "practice" | "review" | "drill";

const TITLES: Record<Kind, string> = {
  practice: "Practice",
  review: "Spaced Review",
  drill: "Weak-Spot Drill",
};

export default function StudySession({ kind, count = 12 }: { kind: Kind; count?: number }) {
  const mode: StudyMode = kind === "drill" ? "drill" : kind === "review" ? "review" : "practice";
  const [ready, setReady] = useState(false);
  const [set, setSet] = useState<Item[]>([]);
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const startedAt = useRef<string>(new Date().toISOString());
  const recordSession = useProgress((s) => s.recordSession);

  // Build the set once, after the persisted store has hydrated on the client.
  useEffect(() => {
    const s = useProgress.getState();
    const inputs: SchedulerInputs = {
      items: allItems,
      objectives,
      reviewState: reviewStateMap(s),
      mastery: masteryMap(s),
      attempts: s.attempts,
    };
    const built =
      kind === "review" ? buildReviewSet(inputs, count)
      : kind === "drill" ? buildDrillSet(inputs, count)
      : buildStudySet(inputs, count);
    setSet(built);
    setReady(true);
    startedAt.current = new Date().toISOString();
  }, [kind, count]);

  const done = ready && (set.length === 0 || i >= set.length);

  // Record the session once when finished.
  const recorded = useRef(false);
  useEffect(() => {
    if (done && set.length > 0 && !recorded.current) {
      recorded.current = true;
      const readiness = currentReadiness().overall;
      recordSession({
        mode,
        total: set.length,
        correct,
        score: set.length ? (correct / set.length) * 100 : 0,
        readiness,
        started_at: startedAt.current,
        ended_at: new Date().toISOString(),
      });
    }
  }, [done, set.length, correct, mode, recordSession]);

  function handleNext(g: GradedAnswer) {
    if (g.correct) setCorrect((c) => c + 1);
    setI((n) => n + 1);
  }

  if (!ready) return <LoadingBlock title={TITLES[kind]} />;

  if (set.length === 0) {
    return (
      <Empty kind={kind} />
    );
  }

  if (done) {
    return <Summary kind={kind} total={set.length} correct={correct} />;
  }

  return (
    <div className="space-y-4">
      <Progress i={i} total={set.length} title={TITLES[kind]} />
      <QuestionCard item={set[i]} mode={mode} index={i} total={set.length} onNext={handleNext} />
    </div>
  );
}

function Progress({ i, total, title }: { i: number; total: number; title: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">{title}</span>
        <span className="text-muted">{i}/{total}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-line">
        <div className="h-full bg-clinical-500 transition-all" style={{ width: `${(i / total) * 100}%` }} />
      </div>
    </div>
  );
}

function LoadingBlock({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="card animate-pulse text-muted">Assembling your set…</div>
    </div>
  );
}

function Empty({ kind }: { kind: Kind }) {
  const msg =
    kind === "review"
      ? "Nothing is due for review right now. Come back later, or run a Practice set to schedule new items."
      : kind === "drill"
      ? "No weak spots yet — answer some Practice questions first so the engine can find what to drill."
      : "No items available.";
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{TITLES[kind]}</h1>
      <div className="card text-sm text-slate-300">{msg}</div>
      <Link href="/practice" className="btn-primary block text-center">
        Go to Practice
      </Link>
    </div>
  );
}

function Summary({ kind, total, correct }: { kind: Kind; total: number; correct: number }) {
  const pct = Math.round((correct / total) * 100);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{TITLES[kind]} complete</h1>
      <div className="card text-center">
        <p className="text-5xl font-bold text-clinical-400">{pct}%</p>
        <p className="mt-1 text-sm text-muted">
          {correct} of {total} correct
        </p>
      </div>
      <p className="text-sm text-slate-300">
        Your spaced-repetition schedule and objective mastery have been updated. Items you missed —
        especially confident misses — will resurface sooner.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/" className="btn-ghost text-center">
          Home
        </Link>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Another set
        </button>
      </div>
    </div>
  );
}
