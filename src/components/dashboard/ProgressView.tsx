"use client";

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import Link from "next/link";
import { objectives } from "@/lib/data/content";
import { useProgress, masteryMap, confidentButWrongCount } from "@/lib/store/progress";
import MasteryRadar from "./MasteryRadar";

export default function ProgressView() {
  const mastery = useProgress((s) => s.mastery);
  const attempts = useProgress((s) => s.attempts);
  const sessions = useProgress((s) => s.sessions);
  const m = masteryMap({ mastery });

  const trend = sessions
    .filter((s) => s.mode === "exam" || s.total >= 5)
    .map((s, idx) => ({ n: idx + 1, score: Math.round(s.score), readiness: Math.round(s.readiness) }));

  const cbw = confidentButWrongCount({ attempts });

  // Calibration: accuracy at each confidence level (CLAUDE.md §3.8).
  const calib = ([1, 2, 3] as const).map((c) => {
    const subset = attempts.filter((a) => a.confidence === c);
    const correct = subset.filter((a) => a.correct).length;
    return { c, n: subset.length, acc: subset.length ? Math.round((correct / subset.length) * 100) : null };
  });

  const sortedObjectives = [...objectives].sort(
    (a, b) => (m.get(a.code)?.mastery ?? 0) - (m.get(b.code)?.mastery ?? 0)
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="text-sm text-muted">Mastery, trends, and calibration across the blueprint.</p>
      </header>

      {trend.length >= 2 ? (
        <div className="card">
          <p className="mb-2 text-sm font-semibold">Score & readiness trend</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="n" tick={{ fill: "#7c8b99", fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#7c8b99", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#111922", border: "1px solid #1f2c38", borderRadius: 12 }} />
                <ReferenceLine y={70} stroke="#fbbf24" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="score" stroke="#2fd0b2" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="readiness" stroke="#60a5fa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[11px] text-muted">Teal = session score · Blue = readiness · Dashed = ~70% pass line</p>
        </div>
      ) : (
        <div className="card text-sm text-muted">Complete a few practice sets or a simulation to see your trend.</div>
      )}

      <MasteryRadar />

      <div className="card">
        <p className="mb-2 text-sm font-semibold">Confidence calibration</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {calib.map((row) => (
            <div key={row.c} className="rounded-xl bg-ink-line/40 p-3">
              <p className="text-xs text-muted">{row.c === 1 ? "Guess" : row.c === 2 ? "Maybe" : "Sure"}</p>
              <p className="text-2xl font-bold text-clinical-300">{row.acc == null ? "—" : `${row.acc}%`}</p>
              <p className="text-[10px] text-muted">{row.n} answered</p>
            </div>
          ))}
        </div>
        {cbw > 0 && (
          <p className="mt-3 rounded-lg bg-signal-warn/10 p-2 text-xs text-signal-warn">
            {cbw} “confident but wrong” item{cbw === 1 ? "" : "s"} flagged for priority drilling.
          </p>
        )}
      </div>

      <div className="card">
        <p className="mb-2 text-sm font-semibold">Mastery & coverage by objective</p>
        <div className="space-y-2">
          {sortedObjectives.map((o) => {
            const data = m.get(o.code);
            const pct = Math.round((data?.mastery ?? 0) * 100);
            const attemptsN = data?.attempts ?? 0;
            return (
              <div key={o.code} className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-xs font-medium text-muted">{o.code}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-line">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: pct >= 75 ? "#34d399" : pct >= 50 ? "#2fd0b2" : pct > 0 ? "#fbbf24" : "#374151",
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs text-slate-300">{pct}%</span>
                <span className="w-12 shrink-0 text-right text-[10px] text-muted">{attemptsN} att</span>
              </div>
            );
          })}
        </div>
      </div>

      <Link href="/drill" className="btn-primary block text-center">Drill my weakest objectives</Link>
    </div>
  );
}
