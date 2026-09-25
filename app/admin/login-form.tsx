"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
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
        body: JSON.stringify({ password }),
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
        <h1>Reviewers</h1>
        <p className="muted">For whoever reviews designs and makes redeem codes.</p>
        <form className="form-card stack" onSubmit={submit}>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
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
