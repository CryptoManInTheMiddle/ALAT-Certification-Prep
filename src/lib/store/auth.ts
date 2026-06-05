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
  /** Send a magic link to the given email. */
  signIn: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: isSupabaseConfigured ? "loading" : "unconfigured",
  user: null,
  session: null,
  initialized: false,

  init: () => {
    if (get().initialized) return;
    const sb = getSupabaseBrowser();
    if (!sb) {
      set({ status: "unconfigured", initialized: true });
      return;
    }
    set({ initialized: true });

    sb.auth.getSession().then(({ data }) => {
      set({
        session: data.session,
        user: data.session?.user ?? null,
        status: data.session ? "signed-in" : "signed-out",
      });
    });

    sb.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        status: session ? "signed-in" : "signed-out",
      });
    });
  },

  signIn: async (email) => {
    const sb = getSupabaseBrowser();
    if (!sb) return { error: "Sync is not configured." };
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    const sb = getSupabaseBrowser();
    if (sb) await sb.auth.signOut();
    set({ user: null, session: null, status: "signed-out" });
  },
}));
