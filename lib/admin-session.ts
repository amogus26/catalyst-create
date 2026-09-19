import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * The admin gate: one shared password in an environment variable, and a signed cookie for the
 * session it opens.
 *
 * This is not a user-account system and is not pretending to be one - it is the smallest gate that
 * keeps the review queue away from the public, which is all this version needs. What it does get
 * right:
 *
 * - The password is compared in constant time, so the comparison cannot be timed to guess it.
 * - The cookie is not the password. It is `expiry.hmac(expiry)`, signed with the password as the
 *   key, so it cannot be forged without knowing the password - and **changing the password signs
 *   every existing session out**, which is what you want the moment it leaks.
 * - httpOnly, so no script can read it; sameSite=lax, so another site cannot post as you; secure
 *   in production.
 *
 * What it does not do: rate-limit guesses. Pick a long random password and the arithmetic is on
 * your side; a login attempt limiter is a sensible follow-up, not something this version has.
 */

export const ADMIN_COOKIE = "catalyst_admin";

const SESSION_SECONDS = 12 * 60 * 60;

function adminPassword(): string {
  const value = process.env.ADMIN_PASSWORD;
  if (!value || value.trim().length < 8) {
    throw new Error(
      "ADMIN_PASSWORD is missing or too short (8 characters minimum). The admin page cannot open without it.",
    );
  }
  return value;
}

/** Is the admin password configured at all? Lets the page say so instead of throwing at a visitor. */
export function adminPasswordConfigured(): boolean {
  try {
    adminPassword();
    return true;
  } catch {
    return false;
  }
}

export function passwordMatches(candidate: string): boolean {
  const expected = Buffer.from(adminPassword(), "utf8");
  const given = Buffer.from(candidate ?? "", "utf8");
  if (expected.length !== given.length) {
    // timingSafeEqual throws on a length mismatch, so do an equal-length comparison anyway and
    // then fail: a wrong-length guess should not be measurably faster than a wrong-content one.
    timingSafeEqual(expected, expected);
    return false;
  }
  return timingSafeEqual(expected, given);
}

function sign(expiresAt: number): string {
  return createHmac("sha256", adminPassword()).update(`admin:${expiresAt}`).digest("hex");
}

export function issueSession(): { name: string; value: string; maxAge: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return {
    name: ADMIN_COOKIE,
    value: `${expiresAt}.${sign(expiresAt)}`,
    maxAge: SESSION_SECONDS,
  };
}

export function sessionIsValid(token: string | undefined): boolean {
  if (!token) return false;
  const [rawExpiry, signature] = token.split(".");
  const expiresAt = Number(rawExpiry);
  if (!Number.isFinite(expiresAt) || !signature) return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;

  let expected: string;
  try {
    expected = sign(expiresAt);
  } catch {
    return false; // no password configured: nobody is an admin
  }
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Whether the current request carries a valid admin session. */
export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return sessionIsValid(jar.get(ADMIN_COOKIE)?.value);
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;
