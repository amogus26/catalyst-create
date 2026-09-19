import { cookies } from "next/headers";
import { cookieOptions } from "./admin-session";

/**
 * Who is voting, as far as this version can tell: a random id in a cookie, minted on the first
 * vote. The `votes` table has a unique key on (submission, voter), so the same browser cannot vote
 * twice on the same design however many times the button is clicked.
 *
 * **This is a speed bump, not an anti-abuse system, and it should not be mistaken for one.**
 * Anyone willing to clear their cookies, open a private window, or pick up another device or phone
 * can vote again, as many times as they care to. That is an accepted limitation of a first
 * version: the votes are a rough popularity signal for a human picking winners by eye, not a
 * count anything is awarded on automatically. Making them trustworthy means identity of some kind
 * - accounts, or the launcher's own sign-in - and that is a later piece of work.
 */

export const VOTER_COOKIE = "catalyst_voter";

const VOTER_COOKIE_SECONDS = 365 * 24 * 60 * 60;

/** The voter id on this request, or null if this browser has never voted. */
export async function currentVoterId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(VOTER_COOKIE)?.value ?? null;
}

export function newVoterCookie(): { name: string; value: string; maxAge: number } {
  return { name: VOTER_COOKIE, value: crypto.randomUUID(), maxAge: VOTER_COOKIE_SECONDS };
}

export { cookieOptions };
