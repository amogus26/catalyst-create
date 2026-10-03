import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { serviceRoleKey } from "./store";

/**
 * Who is asking: Catalyst accounts are Minecraft accounts, proven the way a Minecraft server proves them.
 *
 * 1. The launcher asks for a challenge (`challenge()`): a random server id and a ticket that says this
 *    site made it, and when.
 * 2. It tells Mojang's session server it is joining that server id, with the player's own access token -
 *    which never leaves the player's computer for us.
 * 3. It sends us the player's name and the ticket; we ask Mojang whether that player joined that id
 *    (`verifyJoin`). Mojang answers with the profile - the id is the account.
 *
 * Then the launcher (and the game, through ~/.visuals-launcher) carries a token we sign (`issueToken`):
 * the player's id and when it runs out. Nothing about it is stored, so there is nothing to look up or leak.
 */

const TOKEN_DAYS = 90;
const CHALLENGE_SECONDS = 5 * 60;

/** The signing key: ACCOUNT_SECRET if set, else one derived from the service role key (as secret as it gets). */
function key(): Buffer {
  const own = process.env.ACCOUNT_SECRET?.trim();
  if (own && own.length >= 32) return Buffer.from(own, "utf8");
  const service = serviceRoleKey();
  if (!service) throw new Error("No key to sign accounts with: set SUPABASE_SERVICE_ROLE_KEY.");
  return createHmac("sha256", service).update("catalyst-account-v1").digest();
}

function mac(text: string): string {
  return createHmac("sha256", key()).update(text).digest("hex");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const PLAYER_NAME = /^[A-Za-z0-9_]{1,16}$/;

/** "0123...cdef" (Mojang's form) as "01234567-89ab-...". */
export function dashed(id: string): string {
  const hex = id.replace(/-/g, "").toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function issueToken(player: string, now = Date.now()): { token: string; expiresAt: number } {
  const expiresAt = Math.floor(now / 1000) + TOKEN_DAYS * 24 * 60 * 60;
  return { token: `${player}.${expiresAt}.${mac(`account:${player}:${expiresAt}`)}`, expiresAt };
}

/** The player a token names, if it is ours and still good. */
export function verifyToken(token: string | null | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [player, rawExpiry, signature] = token.split(".");
  const expiresAt = Number(rawExpiry);
  if (!player || !UUID.test(player) || !Number.isInteger(expiresAt) || !signature) return null;
  if (expiresAt < Math.floor(now / 1000)) return null;
  return same(signature, mac(`account:${player}:${expiresAt}`)) ? player : null;
}

/** The player behind a request's `Authorization: Bearer <token>`, or null. */
export function playerOf(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  return verifyToken(header.startsWith("Bearer ") ? header.slice(7).trim() : null);
}

/** A fresh challenge: the server id to join, and the ticket to come back with. */
export function challenge(now = Date.now()): { serverId: string; ticket: string } {
  const issued = Math.floor(now / 1000);
  const nonce = randomBytes(12).toString("hex");
  return { serverId: serverIdOf(issued, nonce), ticket: `${issued}.${nonce}.${mac(`challenge:${issued}:${nonce}`).slice(0, 32)}` };
}

function serverIdOf(issued: number, nonce: string): string {
  return mac(`server-id:${issued}:${nonce}`).slice(0, 40);
}

/** The server id a ticket stands for, if we made the ticket in the last five minutes. */
export function serverIdFor(ticket: string, now = Date.now()): string | null {
  const [rawIssued, nonce, signature] = ticket.split(".");
  const issued = Number(rawIssued);
  if (!Number.isInteger(issued) || !nonce || !/^[0-9a-f]{24}$/.test(nonce) || !signature) return null;
  const age = Math.floor(now / 1000) - issued;
  if (age < 0 || age > CHALLENGE_SECONDS) return null;
  if (!same(signature, mac(`challenge:${issued}:${nonce}`).slice(0, 32))) return null;
  return serverIdOf(issued, nonce);
}

/**
 * Asks Mojang whether [name] joined [serverId]: the profile (id dashed, name as Mojang spells it) if so.
 * Throws when Mojang cannot be asked, so a Mojang outage is not mistaken for a wrong answer.
 */
export async function verifyJoin(name: string, serverId: string): Promise<{ id: string; name: string } | null> {
  const url =
    "https://sessionserver.mojang.com/session/minecraft/hasJoined" +
    `?username=${encodeURIComponent(name)}&serverId=${encodeURIComponent(serverId)}`;
  const response = await fetch(url, { headers: { "user-agent": "CatalystClient/1.0 (catalystclient.net)" }, cache: "no-store" });
  if (response.status === 204 || response.status === 404) return null;
  if (!response.ok) throw new Error(`Mojang answered ${response.status}`);
  const profile = (await response.json()) as { id?: string; name?: string };
  if (!profile.id || !profile.name || !/^[0-9a-f]{32}$/i.test(profile.id) || !PLAYER_NAME.test(profile.name)) return null;
  return { id: dashed(profile.id), name: profile.name };
}
