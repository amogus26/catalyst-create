"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Puts an approved design into the current voting round, or takes it out. Reviewers only - the
 * route behind it checks the admin session itself.
 */
export function FeatureToggle({
  id,
  featured,
  roundIsFull,
}: {
  id: string;
  featured: boolean;
  /** True when five designs are already in the round, so adding a sixth would push one off. */
  roundIsFull: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/feature", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, featured: !featured }),
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
      setBusy(false);
    }
  }

  return (
    <>
      {error && (
        <div className="notice error tiny" role="alert" style={{ margin: 0, padding: "8px 10px" }}>
          {error}
        </div>
      )}
      <button
        type="button"
        className={featured ? "featured-on" : ""}
        disabled={busy}
        onClick={toggle}
        title={
          featured
            ? "Take this out of the current round"
            : roundIsFull
              ? "The round already holds five - the lowest-voted one will drop off the page"
              : "Put this in the current round"
        }
      >
        {busy ? "Saving..." : featured ? "★ In the round" : "☆ Add to round"}
      </button>
    </>
  );
}
