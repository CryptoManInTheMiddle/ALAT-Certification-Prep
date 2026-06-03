"use client";

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase is configured. When false, the app runs local-only. */
export const isSupabaseConfigured = Boolean(url && anon);

/**
 * Browser Supabase client (anon key only — RLS enforces per-user access).
 * Returns null when unconfigured so callers fall back to local storage.
 */
export function getSupabaseBrowser() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(url!, anon!);
}
