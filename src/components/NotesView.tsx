"use client";

import { useState } from "react";
import { useProgress } from "@/lib/store/progress";

export default function NotesView() {
  const notes = useProgress((s) => s.notes);
  const setNotes = useProgress((s) => s.setNotes);
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Notes</h1>
        <p className="text-sm text-muted">Personal study notes — saved on this device (and synced when signed in).</p>
      </header>
      <textarea
        className="min-h-[50vh] w-full resize-none rounded-2xl border border-ink-line bg-ink-raised p-4 text-[15px] leading-relaxed text-slate-100 outline-none focus:border-clinical-500"
        placeholder="Jot mnemonics, tricky facts, anything you want to remember…"
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(true);
        }}
      />
      <p className="text-xs text-muted">{saved ? "Saved automatically." : "Start typing — notes save as you go."}</p>
    </div>
  );
}
