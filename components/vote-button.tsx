"use client";

import { useState } from "react";

/**
 * One vote per design per browser. The button goes spent as soon as the server says the vote
 * counted - and the server is what decides, using the voter cookie and a unique key in the
 * database, so clicking twice quickly cannot count twice.
 */
export function VoteButton({
  id,
  initialCount,
  initiallyVoted,
  size = "normal",
}: {
  id: string;
  initialCount: number;
  initiallyVoted: boolean;
  size?: "normal" | "large";
}) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initiallyVoted);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function vote() {
    if (voted || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        voteCount?: number;
        counted?: boolean;
      };
      if (!response.ok) {
        // 409 means this browser already voted - which is not a failure, just a spent button.
        if (response.status === 409) {
          setVoted(true);
          if (typeof payload.voteCount === "number") setCount(payload.voteCount);
          return;
        }
        setFailed(true);
        return;
      }
      if (typeof payload.voteCount === "number") setCount(payload.voteCount);
      setVoted(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={`vote${size === "large" ? " vote-large" : ""}${voted ? " voted" : ""}`}
      type="button"
      onClick={vote}
      aria-label={
        voted ? `Voted. ${count} votes` : failed ? "Vote - that did not go through" : `Vote. ${count} votes`
      }
      disabled={voted || busy}
      title={
        failed
          ? "That did not go through - try again"
          : voted
            ? "You have voted for this one"
            : "Vote for this design"
      }
    >
      <span className="star" aria-hidden="true">{voted ? "★" : "☆"}</span>
      <span className="label">{voted ? "Voted" : "Vote"}</span>
      <span className="count">{count}</span>
    </button>
  );
}
