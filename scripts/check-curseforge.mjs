#!/usr/bin/env node
/**
 * `npm run check:curseforge` - the CurseForge relay against a fake CurseForge, no key or network needed.
 *
 * Checks the things that matter for players and for the key: switched off cleanly without a key, only
 * validated parameters reach CurseForge, the key goes upstream and never back out, answers are reduced
 * to the launcher's shape, authors who opted out of third-party downloads stay opted out, and CurseForge
 * errors turn into the codes the launcher understands.
 */

import assert from "node:assert/strict";
import { allowRequest, categories, clearCache, file, files, mapFile, mapMod, mod, search } from "../lib/curseforge.ts";

const KEY = "test-key-never-leaves-the-server";

const rawMod = {
  id: 394468,
  gameId: 432,
  name: "Sodium",
  slug: "sodium",
  summary: "Fast rendering",
  downloadCount: 1234567.0,
  authors: [{ name: "jellysquid3" }],
  logo: { thumbnailUrl: "https://media.forgecdn.net/avatars/thumbnails/1/icon.png", url: "https://media.forgecdn.net/avatars/1/icon.png" },
  screenshots: [{ url: "http://insecure.example/s.png" }, { url: "https://media.forgecdn.net/attachments/1/s.png" }],
  categories: [{ name: "Performance" }],
  latestFilesIndexes: [
    { gameVersion: "1.21.1", modLoader: 4 },
    { gameVersion: "1.20.1", modLoader: 4 },
    { gameVersion: "1.21.1", modLoader: 6 },
  ],
  links: { websiteUrl: "https://www.curseforge.com/minecraft/mc-mods/sodium", sourceUrl: "javascript:alert(1)" },
  dateModified: "2026-09-01T00:00:00Z",
  allowModDistribution: true,
};

const rawFile = {
  id: 5555,
  modId: 394468,
  displayName: "Sodium 0.6.0",
  fileName: "sodium-0.6.0.jar",
  releaseType: 1,
  gameVersions: ["1.21.1", "Fabric", "Client"],
  fileDate: "2026-08-01T00:00:00Z",
  fileLength: 1000,
  hashes: [{ algo: 2, value: "d41d8cd98f00b204e9800998ecf8427e" }, { algo: 1, value: "A".repeat(40) }],
  dependencies: [{ modId: 306612, relationType: 3 }, { modId: 1, relationType: 4 }, { modId: 2, relationType: 5 }],
  isAvailable: true,
  downloadUrl: "https://edge.forgecdn.net/files/5555/sodium-0.6.0.jar",
};

/** A fake fetch that records what it was asked and answers from a table of path -> [status, body]. */
function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url: new URL(url), headers: init?.headers ?? {} });
    const path = new URL(url).pathname;
    const route = routes[path];
    if (!route) return new Response("{}", { status: 404 });
    if (route === "throw") throw new TypeError("fetch failed");
    const [status, body, headers] = route;
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers });
  };
  fn.calls = calls;
  return fn;
}

const params = (o) => new URLSearchParams(o);

// No key: switched off, and CurseForge is never asked.
{
  clearCache();
  const f = fakeFetch({});
  const reply = await search(params({ q: "sodium" }), { key: "", fetch: f });
  assert.equal(reply.status, 503);
  assert.equal(reply.body.error, "not_configured");
  assert.equal(f.calls.length, 0);
}

// Search: filters translate to CurseForge's parameters; the key goes upstream only.
{
  clearCache();
  const f = fakeFetch({ "/v1/mods/search": [200, { data: [rawMod, { id: 1, gameId: 999, name: "Not Minecraft" }, "junk"], pagination: { index: 0, pageSize: 20, resultCount: 1, totalCount: 1 } }] });
  const reply = await search(params({ q: "sodium", gameVersion: "1.21.1", loader: "fabric", categoryId: "423", sort: "downloads" }), { key: KEY, fetch: f });
  assert.equal(reply.status, 200);
  const sent = f.calls[0];
  assert.equal(sent.url.origin, "https://api.curseforge.com");
  assert.equal(sent.headers["x-api-key"], KEY);
  const q = Object.fromEntries(sent.url.searchParams);
  assert.deepEqual(q, { gameId: "432", classId: "6", index: "0", pageSize: "20", searchFilter: "sodium", gameVersion: "1.21.1", modLoaderType: "4", categoryId: "423", sortField: "6", sortOrder: "desc" });
  assert.equal(reply.body.hits.length, 1, "non-Minecraft and malformed entries are dropped");
  const hit = reply.body.hits[0];
  assert.deepEqual(hit.loaders, ["fabric", "neoforge"]);
  assert.deepEqual(hit.gameVersions, ["1.21.1", "1.20.1"]);
  assert.equal(hit.downloads, 1234567);
  assert.equal(hit.iconUrl, "https://media.forgecdn.net/avatars/thumbnails/1/icon.png");
  assert.deepEqual(hit.screenshots, ["https://media.forgecdn.net/attachments/1/s.png"], "non-https and off-CDN images are dropped");
  assert.equal(hit.sourceUrl, null, "javascript: links are dropped");
  assert.ok(!JSON.stringify(reply).includes(KEY), "the key never appears in a reply");
  assert.match(reply.headers["netlify-cdn-cache-control"], /s-maxage=300/);

  // The same search again is served from the cache.
  await search(params({ q: "sodium", gameVersion: "1.21.1", loader: "fabric", categoryId: "423", sort: "downloads" }), { key: KEY, fetch: f });
  assert.equal(f.calls.length, 1);
}

// Bad parameters never reach CurseForge.
{
  clearCache();
  const f = fakeFetch({});
  for (const bad of [
    { q: "x".repeat(101) },
    { gameVersion: "1.21.1&classId=17" },
    { loader: "bukkit" },
    { categoryId: "../1" },
    { sort: "evil" },
    { pageSize: "500" },
    { index: "-1" },
    { index: "9990", pageSize: "20" },
  ]) {
    const reply = await search(params(bad), { key: KEY, fetch: f });
    assert.equal(reply.status, 400, JSON.stringify(bad));
  }
  assert.equal((await mod("../../v1/games", { key: KEY, fetch: f })).status, 404);
  assert.equal((await file("1", "2;drop", { key: KEY, fetch: f })).status, 404);
  assert.equal(f.calls.length, 0);
}

// Files: mapped to the launcher's shape; relation types and hashes translated.
{
  clearCache();
  const f = fakeFetch({ "/v1/mods/394468": [200, { data: rawMod }], "/v1/mods/394468/files": [200, { data: [rawFile, { ...rawFile, id: 9, modId: 1 }] }] });
  const reply = await files("394468", params({ gameVersion: "1.21.1", loader: "fabric" }), { key: KEY, fetch: f });
  assert.equal(reply.status, 200);
  const [only, ...rest] = reply.body.files;
  assert.equal(rest.length, 0, "a file belonging to another mod is dropped");
  assert.deepEqual(only, {
    id: 5555,
    modId: 394468,
    displayName: "Sodium 0.6.0",
    fileName: "sodium-0.6.0.jar",
    releaseType: "release",
    gameVersions: ["1.21.1"],
    loaders: ["fabric"],
    date: "2026-08-01T00:00:00.000Z",
    size: 1000,
    sha1: "a".repeat(40),
    dependencies: [{ modId: 306612, type: "required" }, { modId: 2, type: "incompatible" }],
    downloadable: true,
  });
  assert.ok(!("downloadUrl" in only), "CDN URLs are not passed on");
}

// Authors who opted out of third-party distribution are never offered as downloadable.
{
  assert.equal(mapMod({ ...rawMod, allowModDistribution: false }).allowDistribution, false);
  assert.equal(mapFile(rawFile, false).downloadable, false);
  assert.equal(mapFile({ ...rawFile, downloadUrl: null }, true).downloadable, false);
  assert.equal(mapFile({ ...rawFile, isAvailable: false }, true).downloadable, false);
}

// One file, checked to be the one asked for.
{
  clearCache();
  const f = fakeFetch({ "/v1/mods/394468": [200, { data: rawMod }], "/v1/mods/394468/files/5555": [200, { data: { ...rawFile, id: 6666 } }] });
  assert.equal((await file("394468", "5555", { key: KEY, fetch: f })).status, 502, "a different file than asked for is refused");
}

// CurseForge errors become codes the launcher understands; the key is not logged.
{
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.join(" "));
  try {
    const cases = [
      [[429, "{}", { "retry-after": "17" }], 429, "rate_limited"],
      [[403, "{}"], 502, "upstream_unavailable"],
      [[500, "{}"], 502, "upstream_unavailable"],
      [[200, "<html>not json</html>"], 502, "upstream_unavailable"],
      ["throw", 502, "upstream_unavailable"],
    ];
    for (const [route, status, code] of cases) {
      clearCache();
      const reply = await categories({ key: KEY, fetch: fakeFetch({ "/v1/categories": route }) });
      assert.equal(reply.status, status, JSON.stringify(route));
      assert.equal(reply.body.error, code);
      if (status === 429) assert.equal(reply.headers["retry-after"], "17");
    }
  } finally {
    console.error = original;
  }
  assert.ok(logged.length > 0 && logged.every((l) => !l.includes(KEY)), "the key is never logged");
}

// The per-address budget.
{
  clearCache();
  const request = new Request("https://site.test/api/mods/curseforge/search", { headers: { "x-forwarded-for": "203.0.113.9" } });
  for (let i = 0; i < 120; i++) assert.equal(allowRequest(request, 1_000), null);
  assert.equal(allowRequest(request, 1_000).status, 429);
  assert.equal(allowRequest(request, 62_000), null, "the budget refills after a minute");
}

console.log("curseforge: relay validates input, keeps the key server-side, and maps CurseForge to the launcher's shape");
