"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function cancel(body: object): Promise<string | null> {
  try {
    const response = await fetch("/api/admin/codes/revoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return null;
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    return payload.error ?? "That did not go through.";
  } catch {
    return "Could not reach the server.";
  }
}

/** Cancels a whole batch, after asking once - there is no undo. */
export function CancelBatch({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        className="reject small"
        disabled={busy}
        title={error ?? "Stop every code in this batch from working"}
        onClick={async () => {
          if (!window.confirm("Cancel every code in this batch? Codes already redeemed stay redeemed.")) return;
          setBusy(true);
          const problem = await cancel({ batchId });
          setBusy(false);
          setError(problem);
          if (!problem) router.refresh();
        }}
      >
        {busy ? "Cancelling..." : "Cancel"}
      </button>
      {error && <div className="tiny" style={{ color: "var(--red)", marginTop: 4 }}>{error}</div>}
    </>
  );
}

/** Cancels one code that has leaked, typed or pasted in. */
export function CancelOne() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="stack"
      style={{ gap: 10 }}
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        const problem = await cancel({ code });
        setBusy(false);
        setResult(problem ? { ok: false, text: problem } : { ok: true, text: "Cancelled - it no longer works." });
        if (!problem) {
          setCode("");
          router.refresh();
        }
      }}
    >
      <label htmlFor="leaked">Cancel one code</label>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input
          id="leaked"
          type="text"
          placeholder="CATL-XXXX-XXXX-XXXX"
          value={code}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            setResult(null);
          }}
        />
        <button type="submit" className="reject" disabled={busy || code.trim().length < 12}>
          {busy ? "..." : "Cancel"}
        </button>
      </div>
      {result && <div className={`notice ${result.ok ? "ok" : "error"} tiny`}>{result.text}</div>}
    </form>
  );
}
