"use client";

import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthStatus = "loading" | "signed-out" | "signed-in" | "unconfigured";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  initialized: boolean;
  /** Wire up auth state; safe to call repeatedly. */
  init: () => void;
  /** Send a magic link + 6-digit code to the given email. */
  signIn: (email: string) => Promise<{ error: string | null }>;
  /** Verify a typed 6-digit code (works inside an installed PWA). */
  verifyCode: (email: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: isSupabaseConfigured ? "loading" : "unconfigured",
  user: null,
  session: null,
  initialized: false,

  init: () => {
    if (get().initialized) return;
    try {
      const sb = getSupabaseBrowser();
      if (!sb) {
        set({ status: "unconfigured", initialized: true });
        return;
      }
      set({ initialized: true });

      sb.auth
        .getSession()
        .then(({ data }) => {
          set({
            session: data.session,
            user: data.session?.user ?? null,
            status: data.session ? "signed-in" : "signed-out",
          });
        })
        .catch(() => set({ status: "signed-out" }));

      sb.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
          status: session ? "signed-in" : "signed-out",
        });
      });
    } catch {
      // If anything in auth setup fails, degrade gracefully to offline mode.
      set({ status: "unconfigured", initialized: true });
    }
  },

  signIn: async (email) => {
    const sb = getSupabaseBrowser();
    if (!sb) return { error: "Sync is not configured." };
    try {
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not send the email." };
    }
  },

  verifyCode: async (email, token) => {
    const sb = getSupabaseBrowser();
    if (!sb) return { error: "Sync is not configured." };
    try {
      const { error } = await sb.auth.verifyOtp({ email, token: token.trim(), type: "email" });
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not verify the code." };
    }
  },

  signOut: async () => {
    const sb = getSupabaseBrowser();
    if (sb) await sb.auth.signOut();
    set({ user: null, session: null, status: "signed-out" });
  },
}));
