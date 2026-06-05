"use client";

import { useEffect } from "react";
import Link from "next/link";

// Route-level error boundary. Keeps a crash from white-screening the app and
// surfaces the real error text (helpful for diagnosing on a phone).
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("LabReady route error:", error);
  }, [error]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-signal-bad">Something went wrong</h1>
      <p className="text-sm text-slate-300">
        Your study progress is safe on this device. Try reloading — if it keeps happening, screenshot the
        details below.
      </p>
      <div className="card overflow-auto text-xs text-muted">
        <p className="font-mono break-words">{error?.message || "Unknown error"}</p>
        {error?.digest && <p className="mt-1 font-mono">digest: {error.digest}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-ghost" onClick={() => reset()}>Try again</button>
        <button className="btn-primary" onClick={() => location.reload()}>Reload</button>
      </div>
      <Link href="/" className="block text-center text-sm text-clinical-300">Go to dashboard</Link>
    </div>
  );
}
