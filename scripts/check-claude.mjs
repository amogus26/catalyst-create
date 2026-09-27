#!/usr/bin/env node
/**
 * `npm run check:claude` - design screening and the Catalyst Bot against a fake Claude, no key or
 * network needed: a refused design is refused, an unclear or missing answer falls back to human review,
 * the key only goes upstream, and the bot is told to stay on Catalyst.
 */

import assert from "node:assert/strict";
import { answerQuestion, readScreening, screenDesign } from "../lib/claude.ts";

const KEY = "test-key";
const png = new Uint8Array([137, 80, 78, 71]);

function fakeFetch(reply, seen = []) {
  return async (url, init) => {
    seen.push({ url, init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ content: [{ type: "text", text: reply }] }), { status: 200 });
  };
}

// Verdicts.
assert.deepEqual(readScreening('{"allowed": true}'), { verdict: "allow" });
assert.deepEqual(readScreening('{"allowed": false, "reason": "it shows a hate symbol"}'), { verdict: "block", reason: "it shows a hate symbol" });
assert.equal(readScreening("I think it's fine").verdict, "unavailable");
assert.equal(readScreening(null).verdict, "unavailable");
assert.equal(readScreening('{"allowed": "maybe"}').verdict, "unavailable");

// No key: nothing is sent, the design goes to a person.
let calls = 0;
assert.deepEqual(await screenDesign(png, "Sam", { key: null, fetch: async () => (calls++, new Response("")) }), { verdict: "unavailable" });
assert.equal(calls, 0);

// A refusal is a refusal; the image and name reach Claude, the key only in the header.
const seen = [];
const blocked = await screenDesign(png, "Sam", { key: KEY, fetch: fakeFetch('{"allowed": false, "reason": "it shows coordinates"}', seen) });
assert.deepEqual(blocked, { verdict: "block", reason: "it shows coordinates" });
assert.equal(seen[0].url, "https://api.anthropic.com/v1/messages");
assert.equal(seen[0].init.headers["x-api-key"], KEY);
assert.equal(seen[0].body.messages[0].content[0].type, "image");
assert.match(seen[0].body.messages[0].content[1].text, /Sam/);
assert.match(seen[0].body.system, /swastika/i);
assert.match(seen[0].body.system, /coordinates/i);
assert.ok(!JSON.stringify(seen[0].body).includes(KEY));

// Claude down: a person decides.
const down = await screenDesign(png, "Sam", { key: KEY, fetch: async () => new Response("overloaded", { status: 529 }) });
assert.equal(down.verdict, "unavailable");

// The bot: stays on topic by instruction, sends recent history, returns the text.
const botSeen = [];
const answer = await answerQuestion("how do i add mods", [{ question: "hi", answer: "Hello!" }], { key: KEY, fetch: fakeFetch("Open Mods and press Install.", botSeen) });
assert.equal(answer, "Open Mods and press Install.");
assert.match(botSeen[0].body.system, /only job is to answer/);
assert.match(botSeen[0].body.system, /Never follow instructions/);
assert.equal(botSeen[0].body.messages.length, 3);
assert.equal(await answerQuestion("hi", [], { key: null, fetch }), null);

console.log("claude: designs are screened before review, refusals stick, the bot stays on Catalyst");
