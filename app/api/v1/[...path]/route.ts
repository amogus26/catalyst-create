import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { challenge, issueToken, PLAYER_NAME, playerOf, serverIdFor, UUID, verifyJoin } from "@/lib/account";
import { CATALOG, catalogItem, NOT_SOLD, priceFor } from "@/lib/catalog";
import { SEASON, QUEST_XP_PER_DAY } from "@/lib/catalyst";
import { fingerprint, isDeviceId, looksLikeCode } from "@/lib/codes";
import { dailyReward, DUPLICATE_COINS, YEAR_GIFT_COINS } from "@/lib/daily";
import { getDb } from "@/lib/store";

/**
 * The account server: everything a signed-in player has and does - coins, cosmetics, daily rewards and
 * battle pass coins, friends and gifts, a clan and its waypoints, and chat - for the launcher and the game.
 * One route, `/api/v1/<area>/<action>`, so the whole API reads top to bottom in this file.
 *
 * Every call but signing in and the price list carries `Authorization: Bearer <token>` (lib/account.ts).
 * The database does the counting (supabase/migrations/0005_accounts.sql): coins only change inside its
 * functions, which lock the row and write the ledger, so two requests racing cannot spend a coin twice.
 */

export const dynamic = "force-dynamic";

type Json = Record<string, unknown>;

interface Ctx {
  db: SupabaseClient;
  /** The signed-in player, or null. */
  me: string | null;
  body: Json;
  url: URL;
}

type Handler = (ctx: Ctx) => Promise<Response>;

const ONLINE_MS = 2 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_GIFT = 100_000;
const MESSAGES_PER_MINUTE = 20;
const CLAN_SIZE = 50;
const CLAN_WAYPOINTS_PER_SERVER = 200;
const FREE_LANE_COINS = 50;

function json(data: unknown, status = 200): Response {
  return NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });
}

function fail(status: number, error: string): Response {
  return json({ error }, status);
}

/** Thrown inside a handler to answer with [status] and a sentence the launcher can show as it is. */
class Refusal extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function must(condition: unknown, status: number, message: string): asserts condition {
  if (!condition) throw new Refusal(status, message);
}

function signedIn(ctx: Ctx): string {
  must(ctx.me, 401, "Sign in again in the launcher.");
  return ctx.me;
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim().slice(0, max) : null;
}

function whole(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

async function rpc<T>(db: SupabaseClient, name: string, args: Json): Promise<T> {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data as T;
}

function utcToday(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

// ------------------------------------------------------------------------------------------- players

interface PlayerRow {
  id: string;
  name: string;
  coins: number;
  plus_until: string | null;
  sale_percent: number;
  sale_until: string | null;
  status: string;
  playing: string | null;
  hosting: string | null;
  last_seen: string;
}

async function player(db: SupabaseClient, id: string): Promise<PlayerRow> {
  const { data, error } = await db.from("players").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  must(data, 401, "Sign in again in the launcher.");
  return data as PlayerRow;
}

/** The sale a code gave, while it runs. */
function activeSale(row: PlayerRow): number {
  return row.sale_until && row.sale_until >= utcToday() ? row.sale_percent : 0;
}

/** Everything the launcher shows about the signed-in player. */
async function me(db: SupabaseClient, id: string): Promise<Json> {
  const [row, owned] = await Promise.all([player(db, id), db.from("owned_items").select("item").eq("player", id)]);
  if (owned.error) throw new Error(owned.error.message);
  const items = (owned.data as { item: string }[]).map((r) => r.item);
  const sale = activeSale(row);
  return {
    id: row.id,
    name: row.name,
    coins: row.coins,
    items: items.filter((name) => !name.startsWith("special:")),
    specials: items.filter((name) => name.startsWith("special:")).map((name) => name.slice("special:".length)),
    sale: sale > 0 ? { percentOff: sale, until: row.sale_until } : null,
    plusUntil: row.plus_until && row.plus_until >= utcToday() ? row.plus_until : null,
  };
}

/** A friend or clanmate as the lists show them. */
function presence(row: PlayerRow, now = Date.now()) {
  const online = now - Date.parse(row.last_seen) < ONLINE_MS;
  return {
    id: row.id,
    name: row.name,
    online,
    status: online ? row.status : "offline",
    playing: online ? row.playing : null,
    hosting: online ? row.hosting : null,
    lastSeen: row.last_seen,
  };
}

async function players(db: SupabaseClient, ids: string[]): Promise<Map<string, PlayerRow>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await db.from("players").select("*").in("id", ids);
  if (error) throw new Error(error.message);
  return new Map((data as PlayerRow[]).map((row) => [row.id, row]));
}

async function byName(db: SupabaseClient, name: string): Promise<PlayerRow | null> {
  const rows = await rpc<PlayerRow[]>(db, "player_by_name", { p_name: name });
  return rows[0] ?? null;
}

async function areFriends(db: SupabaseClient, a: string, b: string): Promise<boolean> {
  const { data, error } = await db
    .from("friendships")
    .select("accepted")
    .or(`and(requester.eq.${a},addressee.eq.${b}),and(requester.eq.${b},addressee.eq.${a})`)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.accepted);
}

async function clanOf(db: SupabaseClient, id: string): Promise<string | null> {
  const { data, error } = await db.from("clan_members").select("clan").eq("player", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.clan as string | undefined) ?? null;
}

// ------------------------------------------------------------------------------------------- account

const account: Record<string, Handler> = {
  "POST account/challenge": async () => json(challenge()),

  "POST account/login": async ({ db, body }) => {
    const name = text(body.name, 16);
    must(name && PLAYER_NAME.test(name), 400, "That is not a Minecraft name.");
    let profile: { id: string; name: string } | null;
    // Only `next dev` with CATALYST_DEV_FAKE_LOGIN=1 may skip Mojang - for the API's own tests.
    if (process.env.NODE_ENV !== "production" && process.env.CATALYST_DEV_FAKE_LOGIN === "1" && body.fake === true) {
      must(typeof body.id === "string" && UUID.test(body.id), 400, "Fake sign-in needs an id.");
      profile = { id: body.id, name };
    } else {
      const serverId = typeof body.ticket === "string" ? serverIdFor(body.ticket) : null;
      must(serverId, 400, "That sign-in took too long - try again.");
      try {
        profile = await verifyJoin(name, serverId);
      } catch {
        throw new Refusal(503, "Mojang's servers didn't answer - try again in a minute.");
      }
      must(profile, 401, "Mojang couldn't confirm this account - sign in to Minecraft again in the launcher.");
    }
    await rpc(db, "account_upsert", { p_id: profile.id, p_name: profile.name });
    const { token, expiresAt } = issueToken(profile.id);
    return json({ token, expiresAt, me: await me(db, profile.id) });
  },

  "GET account/me": async (ctx) => json(await me(ctx.db, signedIn(ctx))),

  // The codes this install redeemed before accounts existed, and the cosmetics it bought with their coins.
  "POST account/migrate": async (ctx) => {
    const id = signedIn(ctx);
    must(isDeviceId(ctx.body.device), 400, "The launcher did not say which install this is.");
    const moved = await rpc<number>(ctx.db, "claim_device_codes", { p_player: id, p_device: String(ctx.body.device).toLowerCase() });
    const bought = Array.isArray(ctx.body.bought) ? ctx.body.bought.filter((x): x is string => typeof x === "string").slice(0, 50) : [];
    if (moved > 0) {
      const row = await player(ctx.db, id);
      for (const name of bought) {
        const price = priceFor(name, activeSale(row));
        if (price !== null) await rpc(ctx.db, "buy_item", { p_player: id, p_item: name, p_price: price });
      }
    }
    return json({ moved, me: await me(ctx.db, id) });
  },

  "POST account/redeem": async (ctx) => {
    const id = signedIn(ctx);
    const code = typeof ctx.body.code === "string" ? ctx.body.code : "";
    must(isDeviceId(ctx.body.device), 400, "The launcher did not say which install this is.");
    if (!looksLikeCode(code)) return json({ outcome: "unknown" });
    const rows = await rpc<{ outcome: string; reward: string | null; expires_on: string | null }[]>(ctx.db, "redeem_code_for", {
      p_hash: fingerprint(code),
      p_player: id,
      p_device: String(ctx.body.device).toLowerCase(),
    });
    const row = rows[0] ?? { outcome: "unknown", reward: null, expires_on: null };
    return json({
      outcome: row.outcome,
      ...(row.reward ? { reward: row.reward } : {}),
      ...(row.outcome === "expired" && row.expires_on ? { expiresOn: row.expires_on } : {}),
      me: await me(ctx.db, id),
    });
  },
};

// ------------------------------------------------------------------------------------------- shop

const shop: Record<string, Handler> = {
  "GET shop/prices": async () =>
    NextResponse.json({ items: CATALOG }, { headers: { "cache-control": "public, max-age=300, s-maxage=300" } }),

  "POST shop/buy": async (ctx) => {
    const id = signedIn(ctx);
    const name = text(ctx.body.item, 60);
    must(name && !(NOT_SOLD as readonly string[]).includes(name) && catalogItem(name), 404, "That item isn't for sale.");
    const price = priceFor(name, activeSale(await player(ctx.db, id)));
    const outcome = await rpc<string>(ctx.db, "buy_item", { p_player: id, p_item: name, p_price: price });
    return json({ outcome, price, me: await me(ctx.db, id) });
  },
};

// ------------------------------------------------------------------------------------------- rewards

const rewards: Record<string, Handler> = {
  // A daily card, for the player's own date: today where they are, which is never more than a day from UTC.
  "POST daily/claim": async (ctx) => {
    const id = signedIn(ctx);
    const date = text(ctx.body.date, 10);
    must(date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)), 400, "Which day?");
    must(Math.abs(Date.parse(date) - Date.parse(utcToday())) <= DAY_MS, 400, "Only today's card can be opened.");
    const reward = dailyReward(date.slice(0, 7), Number(date.slice(8)));
    let coins = reward.coins;
    let item = reward.item;
    let duplicate = false;
    if (item && reward.kind !== "coins") {
      const { data, error } = await ctx.db.from("owned_items").select("item").eq("player", id).eq("item", item).maybeSingle();
      if (error) throw new Error(error.message);
      if (data) {
        coins += DUPLICATE_COINS[reward.kind];
        item = null;
        duplicate = true;
      }
    }
    const outcome = await rpc<string>(ctx.db, "claim_daily", { p_player: id, p_day: date, p_coins: coins, p_item: item });
    return json({ outcome, reward: { ...reward, coins, item: reward.item, duplicate }, me: await me(ctx.db, id) });
  },

  "POST daily/year-gift": async (ctx) => {
    const id = signedIn(ctx);
    const year = whole(ctx.body.year);
    must(year && year >= 2026 && year <= new Date().getUTCFullYear(), 400, "Which year?");
    const outcome = await rpc<string>(ctx.db, "claim_year_gift", { p_player: id, p_year: year, p_coins: YEAR_GIFT_COINS });
    return json({ outcome, me: await me(ctx.db, id) });
  },

  // The free lane's coins, every fifth level - once the level could have been reached at the most XP a day gives.
  "POST pass/claim": async (ctx) => {
    const id = signedIn(ctx);
    const level = whole(ctx.body.level);
    must(level && level >= 5 && level <= SEASON.levels && level % 5 === 0, 400, "That level has no coins to collect.");
    const today = Date.parse(utcToday());
    must(today <= Date.parse(SEASON.endsOn), 400, "This season is over.");
    const days = Math.floor((today - Date.parse(SEASON.startsOn)) / DAY_MS) + 1;
    const xpNeeded =
      level <= SEASON.earlyLevels
        ? level * SEASON.earlyLevelXp
        : SEASON.earlyLevels * SEASON.earlyLevelXp + (level - SEASON.earlyLevels) * SEASON.lateLevelXp;
    must(xpNeeded <= days * QUEST_XP_PER_DAY, 400, "That level can't have been reached yet this season.");
    const outcome = await rpc<string>(ctx.db, "claim_pass", { p_player: id, p_season: SEASON.number, p_level: level, p_coins: FREE_LANE_COINS });
    return json({ outcome, coins: FREE_LANE_COINS, me: await me(ctx.db, id) });
  },
};

// ------------------------------------------------------------------------------------------- friends

const friends: Record<string, Handler> = {
  // The heartbeat: the launcher and the game say where the player is every minute.
  "POST social/presence": async (ctx) => {
    const id = signedIn(ctx);
    const status = ctx.body.status === "playing" ? "playing" : "online";
    const { error } = await ctx.db
      .from("players")
      .update({ status, playing: text(ctx.body.playing, 100), hosting: text(ctx.body.hosting, 100), last_seen: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return json({ ok: true });
  },

  "GET social/friends": async (ctx) => {
    const id = signedIn(ctx);
    const { data, error } = await ctx.db.from("friendships").select("*").or(`requester.eq.${id},addressee.eq.${id}`);
    if (error) throw new Error(error.message);
    const rows = data as { requester: string; addressee: string; accepted: boolean; created_at: string }[];
    const others = await players(ctx.db, rows.map((r) => (r.requester === id ? r.addressee : r.requester)));
    const view = (r: (typeof rows)[number]) => {
      const other = others.get(r.requester === id ? r.addressee : r.requester);
      return other ? presence(other) : null;
    };
    const friendsList = rows.filter((r) => r.accepted).map(view).filter((x) => x !== null);
    friendsList.sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
    return json({
      friends: friendsList,
      incoming: rows.filter((r) => !r.accepted && r.addressee === id).map(view).filter((x) => x !== null),
      outgoing: rows.filter((r) => !r.accepted && r.requester === id).map(view).filter((x) => x !== null),
    });
  },

  "POST social/friends/add": async (ctx) => {
    const id = signedIn(ctx);
    const name = text(ctx.body.name, 16);
    must(name && PLAYER_NAME.test(name), 400, "That is not a Minecraft name.");
    const other = await byName(ctx.db, name);
    must(other, 404, `${name} hasn't signed in to Catalyst yet - ask them to open the launcher once.`);
    must(other.id !== id, 400, "That's you!");
    const { data, error } = await ctx.db
      .from("friendships")
      .select("*")
      .or(`and(requester.eq.${id},addressee.eq.${other.id}),and(requester.eq.${other.id},addressee.eq.${id})`)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) {
      must(!data.accepted, 409, `You and ${other.name} are already friends.`);
      must(data.requester === other.id, 409, `You already asked ${other.name}.`);
      // They asked first: asking back is saying yes.
      const accepted = await ctx.db.from("friendships").update({ accepted: true }).eq("requester", other.id).eq("addressee", id);
      if (accepted.error) throw new Error(accepted.error.message);
      return json({ outcome: "friends", friend: presence(other) });
    }
    const pending = await ctx.db.from("friendships").select("addressee", { count: "exact", head: true }).eq("requester", id).eq("accepted", false);
    must((pending.count ?? 0) < 50, 429, "You have 50 requests waiting already.");
    const inserted = await ctx.db.from("friendships").insert({ requester: id, addressee: other.id });
    if (inserted.error) throw new Error(inserted.error.message);
    return json({ outcome: "asked", friend: presence(other) });
  },

  "POST social/friends/accept": async (ctx) => {
    const id = signedIn(ctx);
    const other = typeof ctx.body.id === "string" && UUID.test(ctx.body.id) ? ctx.body.id : null;
    must(other, 400, "Whose request?");
    const { data, error } = await ctx.db.from("friendships").update({ accepted: true }).eq("requester", other).eq("addressee", id).select();
    if (error) throw new Error(error.message);
    must(data && data.length > 0, 404, "That request is gone.");
    return json({ outcome: "friends" });
  },

  // Unfriending, declining and taking a request back are all the same: the row goes.
  "POST social/friends/remove": async (ctx) => {
    const id = signedIn(ctx);
    const other = typeof ctx.body.id === "string" && UUID.test(ctx.body.id) ? ctx.body.id : null;
    must(other, 400, "Who?");
    const { error } = await ctx.db
      .from("friendships")
      .delete()
      .or(`and(requester.eq.${id},addressee.eq.${other}),and(requester.eq.${other},addressee.eq.${id})`);
    if (error) throw new Error(error.message);
    return json({ outcome: "removed" });
  },

  "POST social/gift": async (ctx) => {
    const id = signedIn(ctx);
    const to = typeof ctx.body.to === "string" && UUID.test(ctx.body.to) ? ctx.body.to : null;
    const amount = whole(ctx.body.amount);
    must(to && to !== id, 400, "Who is it for?");
    must(amount && amount >= 1 && amount <= MAX_GIFT, 400, `Gift between 1 and ${MAX_GIFT.toLocaleString("en-GB")} coins.`);
    const outcome = await rpc<string>(ctx.db, "gift_coins", { p_from: id, p_to: to, p_amount: amount });
    must(outcome !== "not-friends", 403, "You can only gift coins to friends.");
    must(outcome !== "poor", 402, "You don't have that many coins.");
    // The friend hears about it in their chat.
    await ctx.db.from("messages").insert({ sender: id, recipient: to, body: `[Gift] Sent you ${amount.toLocaleString("en-GB")} coins` });
    return json({ outcome, me: await me(ctx.db, id) });
  },
};

// ------------------------------------------------------------------------------------------- chat

const chat: Record<string, Handler> = {
  // Everything new since [after]: messages to and from the player, and their clan's.
  "GET social/messages": async (ctx) => {
    const id = signedIn(ctx);
    const after = Number(ctx.url.searchParams.get("after") ?? 0) || 0;
    const clan = await clanOf(ctx.db, id);
    const filter = [`recipient.eq.${id}`, `and(sender.eq.${id},clan.is.null)`, ...(clan ? [`clan.eq.${clan}`] : [])].join(",");
    // From the start, the newest hundred; after that, everything newer than what the caller has.
    const { data, error } =
      after > 0
        ? await ctx.db.from("messages").select("*").or(filter).gt("id", after).order("id", { ascending: true }).limit(200)
        : await ctx.db.from("messages").select("*").or(filter).order("id", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    if (after === 0) data?.reverse();
    const rows = data as { id: number; sender: string; recipient: string | null; clan: string | null; body: string; created_at: string }[];
    const names = await players(ctx.db, [...new Set(rows.flatMap((r) => [r.sender, ...(r.recipient ? [r.recipient] : [])]))]);
    return json({
      messages: rows.map((r) => ({
        id: r.id,
        from: r.sender,
        fromName: names.get(r.sender)?.name ?? "?",
        to: r.recipient,
        toName: r.recipient ? (names.get(r.recipient)?.name ?? "?") : null,
        clan: r.clan !== null,
        body: r.body,
        at: r.created_at,
      })),
    });
  },

  "POST social/messages": async (ctx) => {
    const id = signedIn(ctx);
    const body = text(ctx.body.body, 300);
    must(body, 400, "Say something first.");
    const recent = await ctx.db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender", id)
      .gt("created_at", new Date(Date.now() - 60_000).toISOString());
    must((recent.count ?? 0) < MESSAGES_PER_MINUTE, 429, "Slow down a little.");
    let row: Json;
    if (ctx.body.clan === true) {
      const clan = await clanOf(ctx.db, id);
      must(clan, 403, "You aren't in a clan.");
      row = { sender: id, clan, body };
    } else {
      const to = typeof ctx.body.to === "string" && UUID.test(ctx.body.to) ? ctx.body.to : null;
      must(to && (await areFriends(ctx.db, id, to)), 403, "You can only message friends.");
      row = { sender: id, recipient: to, body };
    }
    const { data, error } = await ctx.db.from("messages").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return json({ id: data.id });
  },
};

// ------------------------------------------------------------------------------------------- clans

interface ClanRow {
  id: string;
  name: string;
  tag: string;
  colour: number;
  owner: string;
}

async function clanRow(db: SupabaseClient, clan: string): Promise<ClanRow> {
  const { data, error } = await db.from("clans").select("*").eq("id", clan).single();
  if (error) throw new Error(error.message);
  return data as ClanRow;
}

const clans: Record<string, Handler> = {
  "GET social/clan": async (ctx) => {
    const id = signedIn(ctx);
    const invitesTo = await ctx.db.from("clan_invites").select("clan, invited_by").eq("player", id);
    if (invitesTo.error) throw new Error(invitesTo.error.message);
    const invited = (invitesTo.data as { clan: string; invited_by: string | null }[]).map((r) => r.clan);
    const invitedClans = invited.length
      ? ((await ctx.db.from("clans").select("*").in("id", invited)).data as ClanRow[] | null) ?? []
      : [];
    const invites = invitedClans.map((c) => ({ id: c.id, name: c.name, tag: c.tag, colour: c.colour }));

    const mine = await clanOf(ctx.db, id);
    if (!mine) return json({ clan: null, invites });
    const clan = await clanRow(ctx.db, mine);
    const members = await ctx.db.from("clan_members").select("player, joined_at").eq("clan", mine);
    const pending = await ctx.db.from("clan_invites").select("player").eq("clan", mine);
    if (members.error || pending.error) throw new Error((members.error ?? pending.error)!.message);
    const rows = await players(ctx.db, [
      ...(members.data as { player: string }[]).map((m) => m.player),
      ...(pending.data as { player: string }[]).map((p) => p.player),
    ]);
    const memberList = (members.data as { player: string }[])
      .map((m) => rows.get(m.player))
      .filter((r): r is PlayerRow => Boolean(r))
      .map((r) => ({ ...presence(r), owner: r.id === clan.owner }));
    memberList.sort((a, b) => Number(b.owner) - Number(a.owner) || Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
    return json({
      clan: {
        id: clan.id,
        name: clan.name,
        tag: clan.tag,
        colour: clan.colour,
        owner: clan.owner,
        members: memberList,
        invited: (pending.data as { player: string }[]).map((p) => rows.get(p.player)?.name).filter(Boolean),
      },
      invites,
    });
  },

  "POST social/clan/create": async (ctx) => {
    const id = signedIn(ctx);
    const name = text(ctx.body.name, 24);
    const tag = text(ctx.body.tag, 5)?.toUpperCase();
    const colour = whole(ctx.body.colour) ?? 0x4caf50;
    must(name && name.length >= 3 && /^[\p{L}\p{N} _'-]+$/u.test(name), 400, "A clan name is 3 to 24 letters, numbers and spaces.");
    must(tag && /^[A-Z0-9]{2,5}$/.test(tag), 400, "A clan tag is 2 to 5 letters or numbers.");
    must(colour >= 0 && colour <= 0xffffff, 400, "That is not a colour.");
    must(!(await clanOf(ctx.db, id)), 409, "Leave your clan first.");
    const created = await ctx.db.from("clans").insert({ name, tag, colour, owner: id }).select("id").single();
    must(!created.error || created.error.code !== "23505", 409, "That name or tag is taken.");
    if (created.error) throw new Error(created.error.message);
    const joined = await ctx.db.from("clan_members").insert({ clan: created.data.id, player: id });
    if (joined.error) throw new Error(joined.error.message);
    await ctx.db.from("clan_invites").delete().eq("player", id);
    return json({ outcome: "created", id: created.data.id });
  },

  "POST social/clan/invite": async (ctx) => {
    const id = signedIn(ctx);
    const mine = await clanOf(ctx.db, id);
    must(mine, 403, "You aren't in a clan.");
    const name = text(ctx.body.name, 16);
    must(name && PLAYER_NAME.test(name), 400, "That is not a Minecraft name.");
    const other = await byName(ctx.db, name);
    must(other, 404, `${name} hasn't signed in to Catalyst yet.`);
    must(!(await clanOf(ctx.db, other.id)), 409, `${other.name} is in a clan already.`);
    const size = await ctx.db.from("clan_members").select("player", { count: "exact", head: true }).eq("clan", mine);
    must((size.count ?? 0) < CLAN_SIZE, 409, `A clan holds ${CLAN_SIZE} players.`);
    const { error } = await ctx.db.from("clan_invites").upsert({ clan: mine, player: other.id, invited_by: id });
    if (error) throw new Error(error.message);
    return json({ outcome: "invited" });
  },

  "POST social/clan/join": async (ctx) => {
    const id = signedIn(ctx);
    const clan = typeof ctx.body.clan === "string" && UUID.test(ctx.body.clan) ? ctx.body.clan : null;
    must(clan, 400, "Which clan?");
    must(!(await clanOf(ctx.db, id)), 409, "Leave your clan first.");
    const invite = await ctx.db.from("clan_invites").select("clan").eq("clan", clan).eq("player", id).maybeSingle();
    must(invite.data, 404, "That invite is gone.");
    const { error } = await ctx.db.from("clan_members").insert({ clan, player: id });
    if (error) throw new Error(error.message);
    await ctx.db.from("clan_invites").delete().eq("player", id);
    return json({ outcome: "joined" });
  },

  "POST social/clan/decline": async (ctx) => {
    const id = signedIn(ctx);
    const clan = typeof ctx.body.clan === "string" && UUID.test(ctx.body.clan) ? ctx.body.clan : null;
    must(clan, 400, "Which clan?");
    await ctx.db.from("clan_invites").delete().eq("clan", clan).eq("player", id);
    return json({ outcome: "declined" });
  },

  // Leaving: the owner hands the clan to whoever joined next, and the last one out closes it.
  "POST social/clan/leave": async (ctx) => {
    const id = signedIn(ctx);
    const mine = await clanOf(ctx.db, id);
    must(mine, 404, "You aren't in a clan.");
    const clan = await clanRow(ctx.db, mine);
    await ctx.db.from("clan_members").delete().eq("clan", mine).eq("player", id);
    if (clan.owner === id) {
      const next = await ctx.db.from("clan_members").select("player").eq("clan", mine).order("joined_at").limit(1).maybeSingle();
      if (next.data) await ctx.db.from("clans").update({ owner: next.data.player }).eq("id", mine);
      else await ctx.db.from("clans").delete().eq("id", mine);
    }
    return json({ outcome: "left" });
  },

  "POST social/clan/kick": async (ctx) => {
    const id = signedIn(ctx);
    const mine = await clanOf(ctx.db, id);
    must(mine, 404, "You aren't in a clan.");
    must((await clanRow(ctx.db, mine)).owner === id, 403, "Only the clan's owner can do that.");
    const other = typeof ctx.body.id === "string" && UUID.test(ctx.body.id) ? ctx.body.id : null;
    must(other && other !== id, 400, "Who?");
    await ctx.db.from("clan_members").delete().eq("clan", mine).eq("player", other);
    return json({ outcome: "kicked" });
  },

  "GET social/clan/waypoints": async (ctx) => {
    const id = signedIn(ctx);
    const mine = await clanOf(ctx.db, id);
    if (!mine) return json({ waypoints: [] });
    const server = text(ctx.url.searchParams.get("server"), 100);
    let query = ctx.db.from("clan_waypoints").select("*").eq("clan", mine).order("id");
    if (server) query = query.eq("server", server.toLowerCase());
    const { data, error } = await query.limit(500);
    if (error) throw new Error(error.message);
    const by = await players(ctx.db, [...new Set((data as { created_by: string | null }[]).map((w) => w.created_by).filter((x): x is string => !!x))]);
    return json({
      waypoints: (data as Json[]).map((w) => ({
        id: w.id,
        server: w.server,
        dimension: w.dimension,
        name: w.name,
        x: w.x,
        y: w.y,
        z: w.z,
        colour: w.colour,
        by: w.created_by ? (by.get(String(w.created_by))?.name ?? null) : null,
      })),
    });
  },

  "POST social/clan/waypoints": async (ctx) => {
    const id = signedIn(ctx);
    const mine = await clanOf(ctx.db, id);
    must(mine, 403, "You aren't in a clan.");
    const server = text(ctx.body.server, 100)?.toLowerCase();
    const dimension = text(ctx.body.dimension, 64);
    const name = text(ctx.body.name, 32);
    const [x, y, z] = [whole(ctx.body.x), whole(ctx.body.y), whole(ctx.body.z)];
    const colour = whole(ctx.body.colour) ?? 0x4fa8e8;
    must(server && dimension && name && x !== null && y !== null && z !== null, 400, "A waypoint needs a name and a place.");
    must(Math.abs(x) <= 30_000_000 && Math.abs(z) <= 30_000_000 && Math.abs(y) <= 4096, 400, "That place is off the map.");
    const count = await ctx.db.from("clan_waypoints").select("id", { count: "exact", head: true }).eq("clan", mine).eq("server", server);
    must((count.count ?? 0) < CLAN_WAYPOINTS_PER_SERVER, 409, "Your clan has 200 waypoints here already.");
    const { data, error } = await ctx.db
      .from("clan_waypoints")
      .insert({ clan: mine, server, dimension, name, x, y, z, colour: colour & 0xffffff, created_by: id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return json({ id: data.id });
  },

  "POST social/clan/waypoints/remove": async (ctx) => {
    const id = signedIn(ctx);
    const mine = await clanOf(ctx.db, id);
    must(mine, 403, "You aren't in a clan.");
    const waypoint = whole(ctx.body.id);
    must(waypoint, 400, "Which waypoint?");
    await ctx.db.from("clan_waypoints").delete().eq("id", waypoint).eq("clan", mine);
    return json({ outcome: "removed" });
  },
};

const ROUTES: Record<string, Handler> = { ...account, ...shop, ...rewards, ...friends, ...chat, ...clans };

async function handle(request: Request, params: Promise<{ path: string[] }>): Promise<Response> {
  const { path } = await params;
  const handler = ROUTES[`${request.method} ${path.join("/")}`];
  if (!handler) return fail(404, "No such call.");
  const db = getDb();
  if (!db) return fail(503, "The account server has no database.");
  let body: Json = {};
  if (request.method === "POST") {
    try {
      body = ((await request.json()) as Json) ?? {};
    } catch {
      return fail(400, "That request could not be read.");
    }
  }
  try {
    return await handler({ db, me: playerOf(request), body, url: new URL(request.url) });
  } catch (error) {
    if (error instanceof Refusal) return fail(error.status, error.message);
    console.error(`[catalyst-account] ${request.method} ${path.join("/")} failed:`, error);
    return fail(500, "The account server had a problem. Try again in a minute.");
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handle(request, params);
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handle(request, params);
}
