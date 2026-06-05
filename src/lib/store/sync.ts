"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useProgress, exportSlice, type ProgressSlice } from "./progress";

const TABLE = "lr_progress";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeStore: (() => void) | null = null;
let activeUserId: string | null = null;
const listeners = new Set<(s: SyncStatus) => void>();
let lastStatus: SyncStatus = "idle";

function emit(s: SyncStatus) {
  lastStatus = s;
  listeners.forEach((fn) => fn(s));
}

export function onSyncStatus(fn: (s: SyncStatus) => void): () => void {
  listeners.add(fn);
  fn(lastStatus);
  return () => listeners.delete(fn);
}

/**
 * Begin syncing for a signed-in user: pull their remote snapshot, merge it into
 * local state (non-destructive), push the merged result, then keep pushing on
 * every local change (debounced). Idempotent per user.
 */
export async function startSync(userId: string) {
  const sb = getSupabaseBrowser();
  if (!sb || activeUserId === userId) return;
  activeUserId = userId;
  emit("syncing");

  try {
    const { data, error } = await sb.from(TABLE).select("data").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (data?.data) {
      useProgress.getState().applyRemote(data.data as ProgressSlice);
    }
    await push(userId);
    emit("synced");
  } catch {
    emit("error");
  }

  // Push subsequent local changes (debounced).
  unsubscribeStore?.();
  unsubscribeStore = useProgress.subscribe(() => schedulePush(userId));
}

export function stopSync() {
  unsubscribeStore?.();
  unsubscribeStore = null;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  activeUserId = null;
  emit("idle");
}

function schedulePush(userId: string) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void push(userId), 1500);
}

async function push(userId: string) {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  emit("syncing");
  const slice = exportSlice(useProgress.getState());
  const { error } = await sb
    .from(TABLE)
    .upsert({ user_id: userId, data: slice, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  emit(error ? "error" : "synced");
}
