import { NextResponse } from "next/server";
import { adminPasswordConfigured, cookieOptions, issueSession, passwordMatches } from "@/lib/admin-session";

export async function POST(request: Request) {
  if (!adminPasswordConfigured()) {
    return NextResponse.json(
      { error: "No admin password is configured on this server." },
      { status: 503 },
    );
  }

  let password: unknown;
  try {
    ({ password } = (await request.json()) as { password?: unknown });
  } catch {
    return NextResponse.json({ error: "That request could not be read." }, { status: 400 });
  }

  if (typeof password !== "string" || !passwordMatches(password)) {
    // Deliberately vague, and the same answer for a missing password as a wrong one.
    return NextResponse.json({ error: "Not right." }, { status: 401 });
  }

  const session = issueSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(session.name, session.value, { ...cookieOptions, maxAge: session.maxAge });
  return response;
}

/** Signing out: drop the cookie. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("catalyst_admin", "", { ...cookieOptions, maxAge: 0 });
  return response;
}
