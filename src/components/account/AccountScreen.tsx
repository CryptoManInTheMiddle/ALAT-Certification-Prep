"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/store/auth";
import { onSyncStatus, type SyncStatus } from "@/lib/store/sync";

export default function AccountScreen() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const signIn = useAuth((s) => s.signIn);
  const signOut = useAuth((s) => s.signOut);

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sync, setSync] = useState<SyncStatus>("idle");

  useEffect(() => onSyncStatus(setSync), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await signIn(email.trim());
    setBusy(false);
    if (error) setError(error);
    else setSent(true);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Account & Sync</h1>
        <p className="text-sm text-muted">Keep your progress across devices and reinstalls.</p>
      </header>

      {status === "unconfigured" && (
        <div className="card space-y-2 text-sm text-slate-300">
          <p className="font-semibold text-slate-100">Cloud sync isn’t switched on yet.</p>
          <p>
            The app is running in offline mode — everything works and your progress is saved on this
            device. Once Supabase keys are added in the deployment, sign-in will appear here.
          </p>
        </div>
      )}

      {status === "loading" && <div className="card animate-pulse text-muted">Checking sign-in…</div>}

      {status === "signed-out" && !sent && (
        <form onSubmit={submit} className="card space-y-3">
          <p className="text-sm text-slate-300">Enter your email and we’ll send a one-tap magic link — no password.</p>
          <input
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-ink-line bg-ink px-4 py-3 text-[15px] outline-none focus:border-clinical-500"
          />
          {error && <p className="text-sm text-signal-bad">{error}</p>}
          <button className="btn-primary w-full disabled:opacity-50" disabled={busy}>
            {busy ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}

      {status === "signed-out" && sent && (
        <div className="card space-y-2 text-sm">
          <p className="text-lg font-semibold text-clinical-300">Check your email 📧</p>
          <p className="text-slate-300">
            We sent a sign-in link to <span className="font-medium text-slate-100">{email}</span>. Tap it on
            this phone to finish signing in. Your current progress will merge into your account.
          </p>
          <button className="btn-ghost mt-2 text-sm" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </div>
      )}

      {status === "signed-in" && (
        <div className="space-y-4">
          <div className="card space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted">Signed in as</p>
            <p className="font-semibold">{user?.email}</p>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <SyncDot status={sync} />
              <span className="text-slate-300">{syncLabel(sync)}</span>
            </p>
          </div>
          <div className="card text-sm text-slate-300">
            Your readiness, mastery, spaced-repetition schedule, and notes now sync automatically to your
            account and will be here on any device you sign in to.
          </div>
          <button className="btn-ghost w-full" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      )}

      <Link href="/" className="block text-center text-sm text-clinical-300">
        ← Back to dashboard
      </Link>
    </div>
  );
}

function SyncDot({ status }: { status: SyncStatus }) {
  const color =
    status === "synced" ? "bg-signal-good" : status === "syncing" ? "bg-signal-warn" : status === "error" ? "bg-signal-bad" : "bg-muted";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color} ${status === "syncing" ? "animate-pulse" : ""}`} />;
}

function syncLabel(status: SyncStatus): string {
  switch (status) {
    case "syncing": return "Syncing…";
    case "synced": return "All changes synced";
    case "error": return "Sync error — will retry";
    default: return "Waiting to sync";
  }
}
