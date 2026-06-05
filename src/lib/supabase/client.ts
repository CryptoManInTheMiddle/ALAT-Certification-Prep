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
  try {
    client = createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Implicit flow + a typed 6-digit code both work when the magic-link email
        // opens in a different browser context than an installed PWA.
        flowType: "implicit",
        storageKey: "labready-auth",
      },
    });
    return client;
  } catch {
    // Never let client construction crash the app — fall back to offline mode.
    return null;
  }
}
