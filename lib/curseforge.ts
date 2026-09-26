/**
 * The launcher's CurseForge relay: the only place the CurseForge API key is used.
 *
 * CurseForge needs a private key (`x-api-key`) on every API request, and - since CurseForge's July 2026
 * change - on downloads from its CDN too. A key shipped inside the launcher is a key anyone can pull out
 * of it, so the launcher never holds one. It calls these routes; this file adds the key from the
 * server's environment and answers with a small shape of our own:
 *
 *   GET /api/mods/curseforge/search?q=&gameVersion=&loader=&categoryId=&sort=&index=&pageSize=
 *       -> { hits: Mod[], total, index }
 *   GET /api/mods/curseforge/categories           -> { categories: {id, name, slug}[] }
 *   GET /api/mods/curseforge/mods/{modId}          -> { mod: Mod }
 *   GET /api/mods/curseforge/mods/{modId}/files?gameVersion=&loader=&index=
 *       -> { files: File[] }
 *   GET /api/mods/curseforge/mods/{modId}/files/{fileId}
 *       -> { file: File }
 *
 * Only these operations exist - there is no "forward any path" - and every parameter is validated
 * before it is put in an upstream URL. Upstream answers are reduced to the fields the launcher uses,
 * so nothing CurseForge adds later reaches players unreviewed, and the key never appears in a
 * response, a log line or an error.
 *
 * With no CURSEFORGE_API_KEY set, every route answers 503 `not_configured` and the launcher shows
 * Modrinth only. File *downloads* are deliberately not relayed yet - see the download route.
 *
 * No `@/` imports, so `npm run check:curseforge` can run this file with plain `node`.
 */

export const CURSEFORGE_API = "https://api.curseforge.com";
export const MINECRAFT_GAME_ID = 432;
export const MODS_CLASS_ID = 6;

/** CurseForge's ModLoaderType numbers for the loaders the launcher supports. */
export const LOADERS = { forge: 1, fabric: 4, quilt: 5, neoforge: 6 } as const;
export type LoaderName = keyof typeof LOADERS;
const LOADER_NAMES: Record<number, LoaderName> = { 1: "forge", 4: "fabric", 5: "quilt", 6: "neoforge" };

/** ModsSearchSortField. "relevance" leaves the sort to CurseForge. */
const SORTS: Record<string, number | null> = { relevance: null, popularity: 2, updated: 3, downloads: 6, newest: 11 };

/** FileRelationType -> the launcher's dependency kinds. Tool (4) and Include (6) are not install-time. */
const RELATIONS: Record<number, string> = { 1: "embedded", 2: "optional", 3: "required", 5: "incompatible" };

const RELEASE_TYPES: Record<number, string> = { 1: "release", 2: "beta", 3: "alpha" };

export type Mod = {
  id: number;
  slug: string;
  name: string;
  summary: string;
  authors: string[];
  iconUrl: string | null;
  downloads: number;
  gameVersions: string[];
  loaders: LoaderName[];
  categories: string[];
  dateModified: string | null;
  /** False when the author opted out of third-party distribution: the launcher links to the page instead. */
  allowDistribution: boolean;
  websiteUrl: string | null;
  sourceUrl: string | null;
  issuesUrl: string | null;
  screenshots: string[];
};

export type File = {
  id: number;
  modId: number;
  displayName: string;
  fileName: string;
  releaseType: string;
  gameVersions: string[];
  loaders: LoaderName[];
  date: string | null;
  size: number;
  sha1: string | null;
  dependencies: { modId: number; type: string }[];
  downloadable: boolean;
};

export type Reply = { status: number; body: unknown; headers: Record<string, string> };

export type Deps = {
  key: string | null | undefined;
  fetch: typeof fetch;
  now?: () => number;
};

// --- input validation ------------------------------------------------------------------------------

const ID = /^[0-9]{1,10}$/;
const GAME_VERSION = /^[0-9]{1,2}\.[0-9]{1,3}(\.[0-9]{1,3})?$/;

export function parseId(raw: string | null | undefined): number | null {
  return raw && ID.test(raw) ? Number(raw) : null;
}

type SearchInput = {
  q: string;
  gameVersion: string | null;
  loader: LoaderName | null;
  categoryId: number | null;
  sort: string;
  index: number;
  pageSize: number;
};

/** Returns the validated search, or an error sentence for a 400. */
export function parseSearch(params: URLSearchParams): SearchInput | string {
  const q = (params.get("q") ?? "").trim();
  if (q.length > 100) return "Search text is too long.";
  const gameVersion = params.get("gameVersion");
  if (gameVersion !== null && !GAME_VERSION.test(gameVersion)) return "That is not a Minecraft version.";
  const loader = params.get("loader");
  if (loader !== null && !(loader in LOADERS)) return "Unknown mod loader.";
  const categoryRaw = params.get("categoryId");
  const categoryId = categoryRaw === null ? null : parseId(categoryRaw);
  if (categoryRaw !== null && categoryId === null) return "Unknown category.";
  const sort = params.get("sort") ?? "relevance";
  if (!(sort in SORTS)) return "Unknown sort order.";
  const index = Number(params.get("index") ?? "0");
  const pageSize = Number(params.get("pageSize") ?? "20");
  if (!Number.isInteger(index) || index < 0) return "Bad page.";
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) return "Bad page size.";
  // CurseForge refuses index + pageSize beyond 10,000.
  if (index + pageSize > 10_000) return "That page is past the end of the results.";
  return { q, gameVersion, loader: loader as LoaderName | null, categoryId, sort, index, pageSize };
}

// --- the operations ------------------------------------------------------------------------------

export async function search(params: URLSearchParams, deps: Deps): Promise<Reply> {
  const input = parseSearch(params);
  if (typeof input === "string") return error(400, "bad_request", input);
  const query: Record<string, string> = {
    gameId: String(MINECRAFT_GAME_ID),
    classId: String(MODS_CLASS_ID),
    index: String(input.index),
    pageSize: String(input.pageSize),
  };
  if (input.q) query.searchFilter = input.q;
  if (input.gameVersion) query.gameVersion = input.gameVersion;
  if (input.loader) query.modLoaderType = String(LOADERS[input.loader]);
  if (input.categoryId !== null) query.categoryId = String(input.categoryId);
  const sortField = SORTS[input.sort];
  if (sortField !== null) {
    query.sortField = String(sortField);
    query.sortOrder = "desc";
  }
  return relay(deps, "/v1/mods/search", query, TTL.search, (raw) => {
    const data = list(raw, "data");
    const pagination = obj(obj(raw).pagination);
    return {
      hits: data.map(mapMod).filter((m): m is Mod => m !== null),
      total: Math.min(num(pagination.totalCount) ?? data.length, 10_000),
      index: num(pagination.index) ?? input.index,
    };
  });
}

export async function categories(deps: Deps): Promise<Reply> {
  return relay(deps, "/v1/categories", { gameId: String(MINECRAFT_GAME_ID), classId: String(MODS_CLASS_ID) }, TTL.tags, (raw) => ({
    categories: list(raw, "data")
      .map((c) => {
        const o = obj(c);
        const id = num(o.id);
        const name = text(o.name, 80);
        if (id === null || !name || o.isClass === true) return null;
        return { id, name, slug: text(o.slug, 80) ?? "" };
      })
      .filter(Boolean),
  }));
}

export async function mod(modIdRaw: string, deps: Deps): Promise<Reply> {
  const modId = parseId(modIdRaw);
  if (modId === null) return error(404, "not_found", "No such mod.");
  return relay(deps, `/v1/mods/${modId}`, {}, TTL.project, (raw) => {
    const m = mapMod(obj(raw).data);
    if (!m || m.id !== modId) throw new UpstreamShapeError();
    return { mod: m };
  });
}

export async function files(modIdRaw: string, params: URLSearchParams, deps: Deps): Promise<Reply> {
  const modId = parseId(modIdRaw);
  if (modId === null) return error(404, "not_found", "No such mod.");
  const query: Record<string, string> = { pageSize: "50" };
  const gameVersion = params.get("gameVersion");
  if (gameVersion !== null) {
    if (!GAME_VERSION.test(gameVersion)) return error(400, "bad_request", "That is not a Minecraft version.");
    query.gameVersion = gameVersion;
  }
  const loader = params.get("loader");
  if (loader !== null) {
    if (!(loader in LOADERS)) return error(400, "bad_request", "Unknown mod loader.");
    query.modLoaderType = String(LOADERS[loader as LoaderName]);
  }
  const index = parseId(params.get("index") ?? "0");
  if (index === null || index > 9_950) return error(400, "bad_request", "Bad page.");
  query.index = String(index);
  const distributable = await distribution(modId, deps);
  if (typeof distributable !== "boolean") return distributable;
  return relay(deps, `/v1/mods/${modId}/files`, query, TTL.versions, (raw) => ({
    files: list(raw, "data")
      .map((f) => mapFile(f, distributable))
      .filter((f): f is File => f !== null && f.modId === modId),
  }));
}

export async function file(modIdRaw: string, fileIdRaw: string, deps: Deps): Promise<Reply> {
  const modId = parseId(modIdRaw);
  const fileId = parseId(fileIdRaw);
  if (modId === null || fileId === null) return error(404, "not_found", "No such file.");
  const distributable = await distribution(modId, deps);
  if (typeof distributable !== "boolean") return distributable;
  return relay(deps, `/v1/mods/${modId}/files/${fileId}`, {}, TTL.versions, (raw) => {
    const f = mapFile(obj(raw).data, distributable);
    if (!f || f.modId !== modId || f.id !== fileId) throw new UpstreamShapeError();
    return { file: f };
  });
}

/** Whether the mod's author allows third-party launchers to download it (cached with the mod). */
async function distribution(modId: number, deps: Deps): Promise<boolean | Reply> {
  const reply = await mod(String(modId), deps);
  if (reply.status !== 200) return reply;
  return (reply.body as { mod: Mod }).mod.allowDistribution;
}

// --- mapping untrusted upstream data -------------------------------------------------------------

export function mapMod(raw: unknown): Mod | null {
  const m = obj(raw);
  const id = num(m.id);
  const name = text(m.name, 200);
  if (id === null || !name || num(m.gameId) !== MINECRAFT_GAME_ID) return null;
  const indexes = list(m, "latestFilesIndexes").map(obj);
  const links = obj(m.links);
  const logo = obj(m.logo);
  return {
    id,
    slug: text(m.slug, 100)?.match(/^[a-z0-9-]+$/)?.[0] ?? String(id),
    name,
    summary: text(m.summary, 1000) ?? "",
    authors: list(m, "authors").map((a) => text(obj(a).name, 100)).filter((a): a is string => !!a).slice(0, 20),
    iconUrl: mediaUrl(logo.thumbnailUrl) ?? mediaUrl(logo.url),
    downloads: Math.max(0, Math.floor(num(m.downloadCount) ?? 0)),
    gameVersions: unique(indexes.map((i) => text(i.gameVersion, 20)).filter(isGameVersion)).sort(compareVersionsDesc),
    loaders: unique(indexes.map((i) => LOADER_NAMES[num(i.modLoader) ?? -1]).filter((l): l is LoaderName => !!l)),
    categories: list(m, "categories").map((c) => text(obj(c).name, 80)).filter((c): c is string => !!c).slice(0, 20),
    dateModified: isoDate(m.dateModified),
    allowDistribution: m.allowModDistribution !== false,
    websiteUrl: httpsUrl(links.websiteUrl),
    sourceUrl: httpsUrl(links.sourceUrl),
    issuesUrl: httpsUrl(links.issuesUrl),
    screenshots: list(m, "screenshots").map((s) => mediaUrl(obj(s).url)).filter((s): s is string => !!s).slice(0, 20),
  };
}

export function mapFile(raw: unknown, modAllowsDistribution: boolean): File | null {
  const f = obj(raw);
  const id = num(f.id);
  const modId = num(f.modId);
  const fileName = text(f.fileName, 255);
  const size = num(f.fileLength);
  if (id === null || modId === null || !fileName || size === null || size <= 0) return null;
  const versions = list(f, "gameVersions").map((v) => text(v, 40)).filter((v): v is string => !!v);
  const sha1 = list(f, "hashes").map(obj).find((h) => num(h.algo) === 1)?.value;
  return {
    id,
    modId,
    displayName: text(f.displayName, 255) ?? fileName,
    fileName,
    releaseType: RELEASE_TYPES[num(f.releaseType) ?? 1] ?? "release",
    gameVersions: versions.filter(isGameVersion),
    // CurseForge lists loaders among a file's game versions ("Fabric", "NeoForge").
    loaders: unique(versions.map((v) => v.toLowerCase()).filter((v): v is LoaderName => v in LOADERS)),
    date: isoDate(f.fileDate),
    size,
    sha1: typeof sha1 === "string" && /^[0-9a-f]{40}$/i.test(sha1) ? sha1.toLowerCase() : null,
    dependencies: list(f, "dependencies")
      .map(obj)
      .map((d) => ({ modId: num(d.modId), type: RELATIONS[num(d.relationType) ?? 0] }))
      .filter((d): d is { modId: number; type: string } => d.modId !== null && !!d.type),
    // CurseForge leaves downloadUrl null when the author has opted out; either signal means "no".
    downloadable: modAllowsDistribution && f.isAvailable === true && typeof f.downloadUrl === "string",
  };
}

// --- relay, cache and errors ---------------------------------------------------------------------

/** How long each answer is kept - here, and by Netlify's CDN via the response headers. */
const TTL = { search: 300, project: 1800, versions: 600, tags: 86_400 };

type Entry = { expires: number; body: unknown };
const cache = new Map<string, Entry>();
const MAX_CACHE = 500;

class UpstreamShapeError extends Error {}

async function relay(
  deps: Deps,
  path: string,
  query: Record<string, string>,
  ttlSeconds: number,
  shape: (raw: unknown) => unknown,
): Promise<Reply> {
  if (!deps.key) {
    return error(503, "not_configured", "CurseForge browsing is not switched on yet. Modrinth results are shown instead.");
  }
  const url = `${CURSEFORGE_API}${path}${Object.keys(query).length ? `?${new URLSearchParams(query)}` : ""}`;
  const now = (deps.now ?? Date.now)();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return ok(hit.body, ttlSeconds);

  let response: Response;
  try {
    response = await deps.fetch(url, {
      headers: { "x-api-key": deps.key, accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return error(502, "upstream_unavailable", "CurseForge is not answering right now.");
  }
  if (response.status === 429) {
    const retry = response.headers.get("retry-after");
    return error(429, "rate_limited", "CurseForge is busy. Try again shortly.", { "retry-after": retry && /^\d+$/.test(retry) ? retry : "60" });
  }
  if (response.status === 404) return error(404, "not_found", "CurseForge has no such mod or file.");
  if (response.status === 401 || response.status === 403) {
    // The key was rejected. Say so in the server log - never the key itself - and nothing more to clients.
    console.error(`[curseforge] the API key was refused (HTTP ${response.status}) for ${path}`);
    return error(502, "upstream_unavailable", "CurseForge is not available right now.");
  }
  if (!response.ok) return error(502, "upstream_unavailable", "CurseForge is having problems right now.");

  let body: unknown;
  try {
    body = shape(await response.json());
  } catch {
    return error(502, "upstream_unavailable", "CurseForge sent something unexpected.");
  }
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
  cache.set(url, { expires: now + ttlSeconds * 1000, body });
  return ok(body, ttlSeconds);
}

function ok(body: unknown, ttlSeconds: number): Reply {
  return {
    status: 200,
    body,
    headers: {
      "cache-control": `public, max-age=60`,
      // Netlify's CDN keeps the answer for everyone, which is what really keeps us inside CurseForge's limits.
      "netlify-cdn-cache-control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds}`,
    },
  };
}

export function error(status: number, code: string, message: string, headers: Record<string, string> = {}): Reply {
  return { status, body: { error: code, message }, headers: { "cache-control": "no-store", ...headers } };
}

/** For tests: forget cached answers and request counts. */
export function clearCache() {
  cache.clear();
  seen.clear();
}

// --- what the routes call -------------------------------------------------------------------------

/** The server's key and fetch. Read per request, so setting the variable needs no code change. */
export function serverDeps(): Deps {
  return { key: process.env.CURSEFORGE_API_KEY?.trim() || null, fetch };
}

export function toResponse(reply: Reply): Response {
  return Response.json(reply.body, { status: reply.status, headers: reply.headers });
}

const seen = new Map<string, number[]>();
const PER_MINUTE = 120;

/**
 * A per-address request budget, so one client cannot spend the whole key's allowance. It lives in this
 * server instance's memory - a speed bump, not a wall; the CDN cache above does most of the protecting.
 */
export function allowRequest(request: Request, now: number = Date.now()): Reply | null {
  const address = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const recent = (seen.get(address) ?? []).filter((t) => t > now - 60_000);
  if (recent.length >= PER_MINUTE) {
    return error(429, "rate_limited", "Too many requests. Try again in a minute.", { "retry-after": "60" });
  }
  recent.push(now);
  seen.set(address, recent);
  if (seen.size > 10_000) seen.delete(seen.keys().next().value as string);
  return null;
}

// --- small readers for untrusted JSON --------------------------------------------------------------

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function list(v: unknown, key: string): unknown[] {
  const value = obj(v)[key];
  return Array.isArray(value) ? value.slice(0, 2000) : [];
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const clean = v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim();
  return clean ? clean.slice(0, max) : null;
}

function httpsUrl(v: unknown): string | null {
  const s = text(v, 2048);
  if (!s) return null;
  try {
    return new URL(s).protocol === "https:" ? s : null;
  } catch {
    return null;
  }
}

/** Images only from CurseForge's media CDN, over HTTPS - the launcher refuses anything else anyway. */
function mediaUrl(v: unknown): string | null {
  const s = httpsUrl(v);
  if (!s) return null;
  const host = new URL(s).hostname;
  return host === "media.forgecdn.net" || host.endsWith(".media.forgecdn.net") ? s : null;
}

function isoDate(v: unknown): string | null {
  const s = text(v, 40);
  return s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : null;
}

function isGameVersion(v: string | null): v is string {
  return !!v && GAME_VERSION.test(v);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function compareVersionsDesc(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
