import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * The admin gates: a password in an environment variable each, and a signed cookie for the session it
 * opens.
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

/**
 * Two gates, each its own password and its own signed cookie:
 *
 * - **reviewer** (`ADMIN_PASSWORD`): the review queue on /admin - whoever helps check designs.
 * - **owner** (`CODES_PASSWORD`): making and cancelling redeem codes on /admin/codes - the owner alone.
 *   A code is worth coins and items, so a reviewer's password must not make them. It must differ from
 *   the reviewer password, or the gate stays shut (two equal passwords would be one gate).
 *
 * Each cookie is signed with its own gate's password and names its gate, so neither can stand in for
 * the other, and changing a password signs that gate's sessions out.
 */
export type Gate = "reviewer" | "owner";

const GATES: Record<Gate, { env: "ADMIN_PASSWORD" | "CODES_PASSWORD"; cookie: string; label: string }> = {
  reviewer: { env: "ADMIN_PASSWORD", cookie: ADMIN_COOKIE, label: "admin" },
  owner: { env: "CODES_PASSWORD", cookie: "catalyst_owner", label: "owner" },
};

const SESSION_SECONDS = 12 * 60 * 60;

function gatePassword(gate: Gate): string {
  const value = process.env[GATES[gate].env];
  if (!value || value.trim().length < 8) {
    throw new Error(`${GATES[gate].env} is missing or too short (8 characters minimum). That page cannot open without it.`);
  }
  if (gate === "owner" && value === process.env.ADMIN_PASSWORD) {
    throw new Error("CODES_PASSWORD is the same as ADMIN_PASSWORD - it must be the owner's own.");
  }
  return value;
}

/** Is the gate's password configured (and, for the owner, different from the reviewers')? */
export function passwordConfigured(gate: Gate): boolean {
  try {
    gatePassword(gate);
    return true;
  } catch {
    return false;
  }
}

/** The reviewer gate's password is configured - kept for the review pages. */
export function adminPasswordConfigured(): boolean {
  return passwordConfigured("reviewer");
}

export function passwordMatches(gate: Gate, candidate: string): boolean {
  const expected = Buffer.from(gatePassword(gate), "utf8");
  const given = Buffer.from(candidate ?? "", "utf8");
  if (expected.length !== given.length) {
    // timingSafeEqual throws on a length mismatch, so do an equal-length comparison anyway and
    // then fail: a wrong-length guess should not be measurably faster than a wrong-content one.
    timingSafeEqual(expected, expected);
    return false;
  }
  return timingSafeEqual(expected, given);
}

function sign(gate: Gate, expiresAt: number): string {
  return createHmac("sha256", gatePassword(gate)).update(`${GATES[gate].label}:${expiresAt}`).digest("hex");
}

export function issueSession(gate: Gate): { name: string; value: string; maxAge: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return {
    name: GATES[gate].cookie,
    value: `${expiresAt}.${sign(gate, expiresAt)}`,
    maxAge: SESSION_SECONDS,
  };
}

export function sessionIsValid(gate: Gate, token: string | undefined): boolean {
  if (!token) return false;
  const [rawExpiry, signature] = token.split(".");
  const expiresAt = Number(rawExpiry);
  if (!Number.isFinite(expiresAt) || !signature) return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;

  let expected: string;
  try {
    expected = sign(gate, expiresAt);
  } catch {
    return false; // no password configured: nobody is through this gate
  }
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Whether the current request carries a valid reviewer session. */
export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return sessionIsValid("reviewer", jar.get(ADMIN_COOKIE)?.value);
}

/** Whether the current request carries a valid owner session - the only one that may make codes. */
export async function isOwner(): Promise<boolean> {
  const jar = await cookies();
  return sessionIsValid("owner", jar.get(GATES.owner.cookie)?.value);
}

/** Every gate's cookie name, for signing out of all of them. */
export const SESSION_COOKIES = Object.values(GATES).map((g) => g.cookie);

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;
