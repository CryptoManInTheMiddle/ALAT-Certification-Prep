"use client";

import { useEffect } from "react";

// Root-level error boundary (replaces the layout, so it renders its own
// html/body). Catches errors that escape the layout itself.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("LabReady global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0a0f14", color: "#e6edf3", fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div style={{ maxWidth: 440, margin: "0 auto", padding: "2rem 1.25rem" }}>
          <h1 style={{ color: "#f87171", fontSize: 20 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#cbd5e1" }}>
            Your study progress is saved on this device. Reload to continue — if it persists, screenshot the
            details below.
          </p>
          <pre
            style={{
              background: "#111922", border: "1px solid #1f2c38", borderRadius: 12, padding: 12,
              fontSize: 12, color: "#7c8b99", whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}
          >
            {error?.message || "Unknown error"}
            {error?.digest ? `\ndigest: ${error.digest}` : ""}
          </pre>
          <button
            onClick={() => reset()}
            style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "#13b89a", color: "#0a0f14", fontWeight: 600 }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
