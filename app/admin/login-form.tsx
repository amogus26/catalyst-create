"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** A password form for one gate (lib/admin-session.ts): the reviewers' by default, or the owner's for codes. */
export function LoginForm({
  gate = "reviewer",
  title = "Reviewers",
  blurb = "For whoever reviews designs.",
}: {
  gate?: "reviewer" | "owner";
  title?: string;
  blurb?: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, gate }),
      });
      if (!response.ok) {
        setError("That password is not right.");
        return;
      }
      setPassword("");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <div className="login">
        <h1>{title}</h1>
        <p className="muted">{blurb}</p>
        <form className="form-card stack" onSubmit={submit}>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {/* Which login this is, for the browser's password manager: without it both of this site's saved
              passwords look alike, and the browser fills - or "updates" - the wrong one. */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={gate === "owner" ? "codespassword" : "admin"}
            readOnly
            hidden
          />
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div>
            <button className="primary" type="submit" disabled={busy || password.length === 0}>
              {busy ? "Checking..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
