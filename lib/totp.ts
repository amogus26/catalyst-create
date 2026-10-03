import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Six-digit sign-in codes (TOTP, RFC 6238: SHA-1, 30 seconds) - the ones the Passwords app, Google
 * Authenticator and the like make from a setup key. The key is base32, as those apps take it.
 *
 * No `@/` imports, so `npm run check:codes` can run this file with plain `node`.
 */

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Bytes(key: string): Buffer {
  let bits = "";
  for (const char of key.toUpperCase().replace(/[\s=-]/g, "")) {
    const value = BASE32.indexOf(char);
    if (value < 0) throw new Error("The setup key is not base32.");
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = bits.match(/.{8}/g) ?? [];
  return Buffer.from(bytes.map((byte) => parseInt(byte, 2)));
}

/** The code [key] makes at [seconds] (Unix time), [digits] long. */
export function totp(key: string, seconds: number, digits = 6): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(seconds / 30)));
  const mac = createHmac("sha1", base32Bytes(key)).update(counter).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const number = (mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return String(number).padStart(digits, "0");
}

/**
 * Whether [typed] is [key]'s code now, or 30 seconds either side (a clock a little off, a slow typist).
 * ponytail: a code can be reused inside its 90 seconds; remember used ones if that ever matters.
 */
export function totpMatches(key: string, typed: string, now = Date.now() / 1000): boolean {
  const given = Buffer.from(typed.replace(/\s/g, ""), "utf8");
  return [-30, 0, 30].some((shift) => {
    const expected = Buffer.from(totp(key, now + shift), "utf8");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
