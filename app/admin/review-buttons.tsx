"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SubmissionStatus } from "@/lib/store/types";

/**
 * Approve, reject, or put something back in the queue. The buttons only ask; the route decides,
 * and it checks the admin session itself rather than trusting that this component was rendered.
 */
export function ReviewButtons({ id, status }: { id: string; status: SubmissionStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<SubmissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(next: SubmissionStatus) {
    setBusy(next);
    setError(null);
    try {
      const response = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "That did not go through.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {error && (
        <div className="notice error tiny" role="alert" style={{ margin: 0, padding: "8px 10px" }}>
          {error}
        </div>
      )}
      <div className="row" style={{ gap: 8 }}>
        {status === "pending" ? (
          <>
            <button
              className="approve"
              type="button"
              disabled={busy !== null}
              onClick={() => review("approved")}
            >
              {busy === "approved" ? "Approving..." : "Approve"}
            </button>
            <button
              className="reject"
              type="button"
              disabled={busy !== null}
              onClick={() => review("rejected")}
            >
              {busy === "rejected" ? "Rejecting..." : "Reject"}
            </button>
          </>
        ) : (
          <button type="button" disabled={busy !== null} onClick={() => review("pending")}>
            {busy === "pending" ? "Moving..." : "Back to pending"}
          </button>
        )}
      </div>
    </>
  );
}
