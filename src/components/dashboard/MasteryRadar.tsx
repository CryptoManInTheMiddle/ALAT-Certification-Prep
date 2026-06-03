"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { objectives } from "@/lib/data/content";
import { useProgress, masteryMap } from "@/lib/store/progress";

// Per-objective mastery radar — the "coverage map" view (CLAUDE.md §10).
export default function MasteryRadar() {
  const mastery = useProgress((s) => s.mastery);
  const m = masteryMap({ mastery });
  const data = objectives.map((o) => ({
    objective: o.code,
    mastery: Math.round((m.get(o.code)?.mastery ?? 0) * 100),
  }));

  return (
    <div className="card">
      <p className="mb-1 text-sm font-semibold">Mastery by objective</p>
      <p className="mb-2 text-xs text-muted">Each spoke is one ALAT exam objective (0–100%).</p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="#1f2c38" />
            <PolarAngleAxis dataKey="objective" tick={{ fill: "#7c8b99", fontSize: 9 }} />
            <Radar dataKey="mastery" stroke="#2fd0b2" fill="#13b89a" fillOpacity={0.45} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
