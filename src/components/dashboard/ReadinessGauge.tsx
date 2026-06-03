"use client";

import { BAND_COPY, type ReadinessResult } from "@/lib/engine/readiness";

const BAND_HEX: Record<string, string> = {
  "exam-ready": "#34d399",
  passing: "#2fd0b2",
  borderline: "#fbbf24",
  foundational: "#f87171",
};

export default function ReadinessGauge({ readiness }: { readiness: ReadinessResult }) {
  const pct = Math.round(readiness.overall);
  const color = BAND_HEX[readiness.band];
  const r = 70;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const band = BAND_COPY[readiness.band];

  return (
    <div className="card flex flex-col items-center">
      <div className="relative h-44 w-44">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          <circle cx="90" cy="90" r={r} fill="none" stroke="#1f2c38" strokeWidth="14" />
          <circle
            cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>{pct}</span>
          <span className="text-xs text-muted">readiness</span>
        </div>
      </div>
      <p className="mt-2 text-base font-semibold" style={{ color }}>{band.label}</p>
      <p className="mt-1 text-center text-xs text-muted">{band.blurb}</p>
      <div className="mt-4 grid w-full grid-cols-2 gap-3">
        <DomainStat label="Domain I" hint="Husbandry · Health · Welfare" value={readiness.byDomain.I} />
        <DomainStat label="Domain II" hint="Facility Admin · Mgmt" value={readiness.byDomain.II} />
      </div>
    </div>
  );
}

function DomainStat({ label, hint, value }: { label: string; hint: string; value: number }) {
  return (
    <div className="rounded-xl bg-ink-line/40 p-3 text-center">
      <p className="text-2xl font-bold text-clinical-300">{Math.round(value)}%</p>
      <p className="text-[11px] font-medium text-slate-300">{label}</p>
      <p className="text-[10px] text-muted">{hint}</p>
    </div>
  );
}
