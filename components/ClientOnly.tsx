'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Renders `children` only on the client (after mount). During SSR and the
 * initial hydration render it shows `fallback` (or nothing). This guarantees
 * server HTML and initial client render produce identical output — the only
 * reliable way to handle time / locale / window-dependent UI in Next.js
 * without hydration mismatches.
 *
 * Use for any subtree that calls Date, Math.random, localStorage, window, etc.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
