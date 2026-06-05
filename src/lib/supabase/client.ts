"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase is configured. When false, the app runs local-only. */
export const isSupabaseConfigured = Boolean(url && anon);

let client: SupabaseClient | null = null;

/**
 * Memoized browser Supabase client (anon key only — RLS enforces per-user
 * access). Returns null when unconfigured so callers fall back to local
 * storage. PKCE + detectSessionInUrl handles the magic-link redirect.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (client) return client;
  client = createClient(url!, anon!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storageKey: "labready-auth",
    },
  });
  return client;
}
