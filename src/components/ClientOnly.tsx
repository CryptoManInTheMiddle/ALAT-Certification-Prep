"use client";

import { useEffect, useState } from "react";

/**
 * Renders children only after mount. The progress store is hydrated from
 * localStorage on the client, so dashboard widgets that read it must wait to
 * avoid SSR/client hydration mismatches.
 */
export default function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
