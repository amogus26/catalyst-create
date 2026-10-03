/**
 * How a typed code is tidied and recognised - the launcher's `CodeFormat` (codes/Codes.kt), to the
 * byte. No imports, so the code maker in the browser can check a custom code as it is typed.
 */

export const PREFIX = "CATL";
export const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * What a player typed, tidied: capitals, letters and digits only. A generated code (one starting CATL, or
 * twelve characters of the alphabet typed without it) gets its prefix and dashes put back; anything
 * else is a custom code the owner typed (see [looksLikeCustomCode]) and stays as it is.
 */
export function normalize(typed: string): string {
  const raw = typed.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const generated = raw.startsWith(PREFIX) || new RegExp(`^[${ALPHABET}]{12}$`).test(raw);
  if (!generated) return raw;
  const rest = raw.slice(raw.startsWith(PREFIX) ? PREFIX.length : 0);
  return `${PREFIX}-${rest.match(/.{1,4}/g)?.join("-") ?? ""}`;
}

/** Custom codes: 6 to 24 letters and digits, not starting CATL - a word is easy to share, and easy to guess, so keep them for giveaways. */
export const CUSTOM_CODE = /^[A-Z0-9]{6,24}$/;

/** Whether [typed] is a custom code the owner may make. */
export function looksLikeCustomCode(typed: string): boolean {
  const code = normalize(typed);
  return !code.startsWith(PREFIX) && CUSTOM_CODE.test(code);
}

/** Whether [typed] could be a code at all - checked before the database is asked anything. */
export function looksLikeCode(typed: string): boolean {
  return new RegExp(`^${PREFIX}(-[${ALPHABET}]{4}){3}$`).test(normalize(typed)) || looksLikeCustomCode(typed);
}
