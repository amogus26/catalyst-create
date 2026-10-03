import { NextResponse } from "next/server";
import { cookieOptions, issueSession, gateCodeKey, passwordConfigured, passwordMatches, SESSION_COOKIES, type Gate } from "@/lib/admin-session";
import { totpMatches } from "@/lib/totp";

/**
 * Signing in: `{password, gate, code}` - "reviewer" (the default) for the review queue, "owner" for redeem
 * codes. Each also gives the six-digit `code` once its key is set (ADMIN_TOTP_SECRET, CODES_TOTP_SECRET).
 */
export async function POST(request: Request) {
  let password: unknown;
  let gate: unknown;
  let code: unknown;
  try {
    ({ password, gate, code } = (await request.json()) as { password?: unknown; gate?: unknown; code?: unknown });
  } catch {
    return NextResponse.json({ error: "That request could not be read." }, { status: 400 });
  }
  const which: Gate = gate === "owner" ? "owner" : "reviewer";

  if (!passwordConfigured(which)) {
    return NextResponse.json({ error: "No password is configured for that on this server." }, { status: 503 });
  }

  const codeKey = gateCodeKey(which);
  const passwordRight = typeof password === "string" && passwordMatches(which, password);
  const codeRight = codeKey === null || (typeof code === "string" && totpMatches(codeKey, code));
  if (!passwordRight || !codeRight) {
    // Deliberately vague: the same answer whichever of the two was wrong, or missing.
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
