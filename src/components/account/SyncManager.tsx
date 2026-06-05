"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/store/auth";
import { startSync, stopSync } from "@/lib/store/sync";

/**
 * Headless component (mounted once in the layout) that initializes auth and
 * drives the sync lifecycle. When Supabase isn't configured it does nothing, so
 * the offline app is unaffected.
 */
export default function SyncManager() {
  useEffect(() => {
    useAuth.getState().init();
    const unsub = useAuth.subscribe((state) => {
      if (state.status === "signed-in" && state.user) startSync(state.user.id);
      else if (state.status === "signed-out") stopSync();
    });
    // Handle the case where we're already signed in at mount.
    const s = useAuth.getState();
    if (s.status === "signed-in" && s.user) startSync(s.user.id);
    return () => unsub();
  }, []);
  return null;
}
