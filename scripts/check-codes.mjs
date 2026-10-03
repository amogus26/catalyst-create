#!/usr/bin/env node
/**
 * `npm run check:codes` - makes sure codes made on /admin/codes redeem in the launcher.
 *
 * The launcher and this site each work out a code's fingerprint on their own, so they must agree to
 * the byte. The vector below is the one the launcher's CodesTest pins; if either side changes how it
 * tidies or hashes a code, one of the two checks fails before any code is handed out.
 */

import assert from "node:assert/strict";
import { fingerprint, generateCodes, looksLikeCode, looksLikeCustomCode, normalize } from "../lib/codes.ts";
import { parseReward } from "../lib/rewards.ts";
import { totp, totpMatches } from "../lib/totp.ts";
import { dailyReward, luckyDays, monthMaxCoins } from "../lib/daily.ts";
import { CATALOG, priceFor } from "../lib/catalog.ts";
import { FLAGS, LEFT_OUT } from "../lib/flags.ts";

assert.equal(normalize("catl 2345 6789 abcd"), "CATL-2345-6789-ABCD");
assert.equal(
  fingerprint("catl 2345 6789 abcd"),
  "5b20767289b315a81680bef394cc4b71582b27e5036f8c498dc185807dcca495",
);

const codes = generateCodes(500);
assert.equal(new Set(codes).size, 500);
for (const code of codes) assert.ok(looksLikeCode(code), code);
assert.ok(looksLikeCode(codes[0].toLowerCase().replaceAll("-", " ")));
assert.ok(!looksLikeCode("CATL-0000-1111-OOOO"), "look-alike characters are never in a code");
assert.equal(normalize("2345 6789 abcd"), "CATL-2345-6789-ABCD", "a generated code typed without its prefix");

// Custom codes the owner types: kept as typed, in capitals. The launcher's CodesTest pins the same.
assert.equal(normalize("summer 2026!"), "SUMMER2026");
assert.equal(fingerprint("summer-2026"), "33ef49129b05f8a905f5aa34fdce8585feec9f2b4ef45dfe35f31ad4adb35dfa");
assert.ok(looksLikeCode("Summer2026") && looksLikeCustomCode("Summer2026"));
for (const bad of ["short", "CATLWINGS", "x".repeat(25), "!!!"]) assert.ok(!looksLikeCustomCode(bad), bad);

assert.deepEqual(parseReward("coins:500"), { kind: "coins", amount: 500 });
assert.deepEqual(parseReward("sale:20:7"), { kind: "sale", percentOff: 20, days: 7 });
assert.deepEqual(parseReward("item:Raven Wings"), { kind: "item", name: "Raven Wings" });
assert.deepEqual(parseReward("special:Creator Cape"), { kind: "special", name: "Creator Cape" });
for (const bad of ["coins:-5", "coins", "sale:95:7", "sale:20", "item:", "item:Nope Wings", "hat:1"]) {
  assert.equal(parseReward(bad), null, bad);
}

// The codes page's six-digit sign-in codes: RFC 6238's own SHA-1 vectors ("12345678901234567890" in base32).
const rfcKey = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
assert.equal(totp(rfcKey, 59, 8), "94287082");
assert.equal(totp(rfcKey, 1111111109, 8), "07081804");
assert.equal(totp(rfcKey, 20000000000, 8), "65353130");
assert.ok(totpMatches(rfcKey, totp(rfcKey, 1000), 1000 + 25), "a code from the last 30 seconds still works");
assert.ok(!totpMatches(rfcKey, totp(rfcKey, 1000), 1000 + 95), "a code from 90 seconds ago does not");
assert.ok(!totpMatches(rfcKey, "", 1000));

// Daily rewards, pinned to the launcher's DailyRewardsTest: the same vectors on both sides.
assert.deepEqual([...luckyDays("2026-10")], [6, 18, 26]);
assert.deepEqual([...luckyDays("2027-02")], [8, 12, 25]);
assert.deepEqual(dailyReward("2026-10", 7), { day: 7, coins: 20, item: "Straw Hat", kind: "hat", lucky: false });
assert.deepEqual(dailyReward("2026-10", 26), { day: 26, coins: 70, item: null, kind: "coins", lucky: true });
assert.deepEqual(dailyReward("2026-10", 31), { day: 31, coins: 90, item: "Golden Hamster", kind: "pet", lucky: false });
assert.deepEqual(dailyReward("2027-02", 28), { day: 28, coins: 90, item: "Snowball Hamster", kind: "pet", lucky: false });
assert.equal(dailyReward("2026-11", 21).item, "Baseball Cap");
// A perfect month stays under 1,000 coins - Economy.DAILY_MONTH_MAX - however the lucky days fall.
for (let year = 2026; year < 2030; year++)
  for (let month = 1; month <= 12; month++) assert.ok(monthMaxCoins(`${year}-${String(month).padStart(2, "0")}`) <= 1000);

// The price list: every name once, flags for every country but the ones left out, sales only on wings.
assert.equal(new Set(CATALOG.map((i) => i.name)).size, CATALOG.length);
assert.equal(FLAGS.length + Object.keys(LEFT_OUT).length, 193, "every UN member is either sold or left out with a reason");
assert.equal(priceFor("Raven Wings", 20), 1760);
assert.equal(priceFor("Party Hat", 20), 300);

console.log("codes: fingerprints match the launcher, rewards read the launcher's way");
