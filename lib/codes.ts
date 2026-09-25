import { createHash, randomInt } from "node:crypto";

/**
 * Redeem codes, the same way the launcher reads them (its `codes/Codes.kt`): `CATL-XXXX-XXXX-XXXX`,
 * twelve characters from an alphabet with no 0/O or 1/I/L, stored only as the SHA-256 of that tidy
 * form. If [normalize] or [fingerprint] ever drift from the launcher's, codes made here stop
 * redeeming - `scripts/check-codes.ts` pins both to the launcher's own test vector.
 *
 * No `@/` imports here, so the check script can run this file with plain `node`.
 */

export const PREFIX = "CATL";
export const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** What a player typed, as it was generated: capitals, no spaces, dashes put back. */
export function normalize(typed: string): string {
  const raw = typed
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^CATL/, "");
  return `${PREFIX}-${raw.match(/.{1,4}/g)?.join("-") ?? ""}`;
}

/** Whether [typed] could be a code at all - checked before the database is asked anything. */
export function looksLikeCode(typed: string): boolean {
  return new RegExp(`^${PREFIX}(-[${ALPHABET}]{4}){3}$`).test(normalize(typed));
}

/** The only form a code is ever stored in. */
export function fingerprint(code: string): string {
  return createHash("sha256").update(normalize(code), "utf8").digest("hex");
}

export function generateCode(): string {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${PREFIX}-${group()}-${group()}-${group()}`;
}

/** [count] fresh codes, none repeated. 31^12 makes a clash with an old one vanishingly unlikely. */
export function generateCodes(count: number): string[] {
  const codes = new Set<string>();
  while (codes.size < count) codes.add(generateCode());
  return [...codes];
}

/** What redeeming can come back with. The launcher has a sentence for each. */
export type RedeemOutcome = "redeemed" | "unknown" | "used" | "already" | "expired" | "revoked";

export interface RedeemResult {
  outcome: RedeemOutcome;
  /** Only on "redeemed": the spec the launcher applies. */
  reward?: string;
  /** On "expired": the last day it worked. */
  expiresOn?: string;
}

export interface CodeBatch {
  batchId: string;
  reward: string;
  note: string | null;
  codes: number;
  uses: number;
  maxUses: number;
  revoked: number;
  expiresOn: string | null;
  createdAt: string;
}

/** Launcher installs name themselves with a random UUID. */
export function isDeviceId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
