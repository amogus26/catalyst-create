"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Which of the page's designs this browser has voted on. The page itself is cached and shared by every
 * visitor (app/designs/page.tsx), so it can't know - this asks /api/votes once, after the page shows,
 * and the vote buttons read it. A vote cast here is marked at once.
 */
const Voted = createContext<{ has: (id: string) => boolean; mark: (id: string) => void }>({
  has: () => false,
  mark: () => {},
});

export function VotedProvider({ ids, children }: { ids: string[]; children: ReactNode }) {
  const [voted, setVoted] = useState<Set<string>>(() => new Set());
  const key = ids.join(",");

  useEffect(() => {
    // Only a browser that has voted before has the cookie, and only then is there anything to ask.
    if (!key || !document.cookie.includes("catalyst_voted=1")) return;
    const controller = new AbortController();
    fetch(`/api/votes?ids=${encodeURIComponent(key)}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { voted: [] }))
      .then((payload: { voted?: string[] }) => setVoted((now) => new Set([...now, ...(payload.voted ?? [])])))
      .catch(() => {});
    return () => controller.abort();
  }, [key]);

  const mark = useCallback((id: string) => setVoted((now) => new Set(now).add(id)), []);
  const value = useMemo(() => ({ has: (id: string) => voted.has(id), mark }), [voted, mark]);
  return <Voted.Provider value={value}>{children}</Voted.Provider>;
}

export function useVoted() {
  return useContext(Voted);
}
