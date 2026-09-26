"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Mounts a 3D scene only once the browser is idle after the page has loaded, so the scene's code never
 * competes with the page's first paint. Until then - and for anyone the scene can't run for - [poster]
 * holds its place at the same size.
 */
export function DeferredScene({ children, poster }: { children: ReactNode; poster: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) {
      const id = idle(() => setReady(true), { timeout: 1500 });
      return () => (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(t);
  }, []);
  return <>{ready ? children : poster}</>;
}
