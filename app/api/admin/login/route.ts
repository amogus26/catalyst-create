import { NextResponse } from "next/server";
import { cookieOptions, issueSession, passwordConfigured, passwordMatches, SESSION_COOKIES, type Gate } from "@/lib/admin-session";

/** Signing in: `{password, gate}` - "reviewer" (the default) for the review queue, "owner" for redeem codes. */
export async function POST(request: Request) {
  let password: unknown;
  let gate: unknown;
  try {
    ({ password, gate } = (await request.json()) as { password?: unknown; gate?: unknown });
  } catch {
    return NextResponse.json({ error: "That request could not be read." }, { status: 400 });
  }
  const which: Gate = gate === "owner" ? "owner" : "reviewer";

  if (!passwordConfigured(which)) {
    return NextResponse.json({ error: "No password is configured for that on this server." }, { status: 503 });
  }

  if (typeof password !== "string" || !passwordMatches(which, password)) {
    // Deliberately vague, and the same answer for a missing password as a wrong one.
    return NextResponse.json({ error: "Not right." }, { status: 401 });
  }

  const session = issueSession(which);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(session.name, session.value, { ...cookieOptions, maxAge: session.maxAge });
  return response;
}

/** Signing out: drop every gate's cookie. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  for (const name of SESSION_COOKIES) response.cookies.set(name, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
