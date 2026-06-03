import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(url && anon);

/** Request-scoped server client honoring the user's auth cookie (RLS applies). */
export function getSupabaseServer() {
  if (!isSupabaseConfigured) return null;
  const cookieStore = cookies();
  return createServerClient(url!, anon!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* called from a Server Component — safe to ignore */
        }
      },
    },
  });
}

/**
 * Service-role client — bypasses RLS. SERVER ONLY. Used by the seed loader and
 * the generation pipeline to write content tables. Never import into a client
 * component; the key must never reach the browser bundle.
 */
export function getSupabaseAdmin() {
  if (!url || !serviceRole) return null;
  return createServerClient(url, serviceRole, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
