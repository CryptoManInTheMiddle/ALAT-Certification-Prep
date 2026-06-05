"use client";

import Link from "next/link";
import { useProgress, reviewStateMap } from "@/lib/store/progress";
import { useReadiness } from "@/lib/store/readiness";
import { isDue } from "@/lib/engine/fsrs";
import { items } from "@/lib/data/content";
import ReadinessGauge from "./ReadinessGauge";

const TIPS = [
  "Active recall beats re-reading. Always try to answer before revealing.",
  "Interleaving topics — like this app does — improves exam-day transfer.",
  "A 'confident but wrong' answer is the most dangerous miss. Drill it.",
  "Spacing your reviews is what moves facts into long-term memory.",
  "Rabbits and rats can't vomit; rats have no gallbladder. Quick wins.",
  "AWA = USDA law (min 3 IACUC); PHS Policy = OLAW (min 5).",
];

export default function Dashboard() {
  const readiness = useReadiness();
  const reviewState = useProgress((s) => s.reviewState);
  const attempts = useProgress((s) => s.attempts);
  const streakDays = useProgress((s) => s.streakDays);

  const now = new Date();
  const rsMap = reviewStateMap({ reviewState });
  const dueCount = items.filter((it) => isDue(rsMap.get(it.id), now)).length;
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const started = attempts.length > 0;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">LabReady</h1>
          <p className="text-sm text-muted">Your path to ALAT certification</p>
        </div>
        <Link
          href="/account"
          aria-label="Account and sync"
          className="rounded-full border border-ink-line bg-ink-raised p-2 text-clinical-300"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0114 0" />
          </svg>
        </Link>
      </header>

      <ReadinessGauge readiness={readiness} />

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Due for review" value={dueCount} accent={dueCount > 0 ? "text-signal-warn" : "text-clinical-300"} />
        <Stat label="Day streak" value={streakDays} accent="text-clinical-300" suffix={streakDays === 1 ? " day" : " days"} />
      </div>

      <Link href={dueCount > 0 ? "/review" : "/practice"} className="btn-primary block text-center">
        {dueCount > 0 ? `Review ${dueCount} due item${dueCount === 1 ? "" : "s"}` : started ? "Continue practicing" : "Start practicing"}
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/learn" className="card text-center text-sm font-medium hover:border-clinical-500">📘 Learn a concept</Link>
        <Link href="/drill" className="card text-center text-sm font-medium hover:border-clinical-500">🎯 Drill weak spots</Link>
        <Link href="/simulate" className="card text-center text-sm font-medium hover:border-clinical-500">⏱️ Exam simulator</Link>
        <Link href="/progress" className="card text-center text-sm font-medium hover:border-clinical-500">📊 Progress</Link>
      </div>

      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-clinical-300">Daily tip</p>
        <p className="mt-1 text-sm text-slate-200">{tip}</p>
      </div>
    </div>
  );
}

function Stat({ label, value, accent, suffix }: { label: string; value: number; accent: string; suffix?: string }) {
  return (
    <div className="card text-center">
      <p className={`text-3xl font-bold ${accent}`}>
        {value}
        {suffix && <span className="text-base font-medium text-muted">{suffix}</span>}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
