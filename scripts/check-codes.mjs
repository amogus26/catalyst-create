#!/usr/bin/env node
/**
 * `npm run check:codes` - makes sure codes made on /admin/codes redeem in the launcher.
 *
 * The launcher and this site each work out a code's fingerprint on their own, so they must agree to
 * the byte. The vector below is the one the launcher's CodesTest pins; if either side changes how it
 * tidies or hashes a code, one of the two checks fails before any code is handed out.
 */

import assert from "node:assert/strict";
import { fingerprint, generateCodes, looksLikeCode, normalize } from "../lib/codes.ts";
import { parseReward } from "../lib/rewards.ts";

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

assert.deepEqual(parseReward("coins:500"), { kind: "coins", amount: 500 });
assert.deepEqual(parseReward("sale:20:7"), { kind: "sale", percentOff: 20, days: 7 });
assert.deepEqual(parseReward("item:Moth Wings"), { kind: "item", name: "Moth Wings" });
assert.deepEqual(parseReward("special:Creator Cape"), { kind: "special", name: "Creator Cape" });
for (const bad of ["coins:-5", "coins", "sale:95:7", "sale:20", "item:", "item:Nope Wings", "hat:1"]) {
  assert.equal(parseReward(bad), null, bad);
}

console.log("codes: fingerprints match the launcher, rewards read the launcher's way");
