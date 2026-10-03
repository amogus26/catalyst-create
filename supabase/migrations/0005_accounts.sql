-- Catalyst accounts: one per Minecraft account, and everything that hangs off one - coins, owned
-- cosmetics, daily rewards and battle pass coins claimed, friends, clans, clan waypoints and chat.
--
-- A player is who Mojang says they are: the launcher joins a session with Mojang's session server and
-- the site asks Mojang whether that player really did (lib/account.ts), so `players.id` is the
-- Minecraft profile id and nobody can sign in as someone else.
--
-- Coins live here, not on the player's computer: every change goes through one of the functions at the
-- bottom, which lock the player's row and write the ledger in the same step, so a balance can never go
-- below zero, be spent twice, or change without a line saying why.
--
-- Locked down like the rest of the schema: row-level security on, no policies, so the anon key can read
-- and write nothing. Every call goes through the site's server with the service role key.

create table if not exists public.players (
  id uuid primary key,
  name text not null check (name ~ '^[A-Za-z0-9_]{1,16}$'),
  coins integer not null default 0 check (coins >= 0),
  -- Catalyst Plus, from a plus:N code until payments exist. Null: never had it.
  plus_until date,
  -- The best sale a code gave, on wings: percent off until the day (inclusive).
  sale_percent integer not null default 0 check (sale_percent between 0 and 90),
  sale_until date,
  -- Presence, from the launcher's and the game's heartbeats. Online means seen in the last two minutes.
  status text not null default 'online' check (status in ('online', 'playing')),
  playing text check (char_length(playing) <= 100),
  hosting text check (char_length(hosting) <= 100),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists players_name_idx on public.players (lower(name));

comment on table public.players is
  'One row per Minecraft account that signed in to Catalyst. id is the Minecraft profile id, verified with Mojang.';

create table if not exists public.coin_ledger (
  id bigint generated always as identity primary key,
  player uuid not null references public.players (id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('code', 'daily', 'year-gift', 'pass', 'buy', 'gift-in', 'gift-out', 'migrate', 'refund')),
  ref text check (char_length(ref) <= 120),
  created_at timestamptz not null default now()
);

create index if not exists coin_ledger_player_idx on public.coin_ledger (player, created_at desc);

create table if not exists public.owned_items (
  player uuid not null references public.players (id) on delete cascade,
  item text not null check (char_length(item) between 1 and 60),
  source text not null check (source in ('shop', 'code', 'daily', 'pass', 'migrate', 'gift')),
  acquired_at timestamptz not null default now(),
  primary key (player, item)
);

-- A code is used once per account (and, as before, once per launcher install).
create table if not exists public.account_redemptions (
  hash text not null references public.redeem_codes (hash) on delete cascade,
  player uuid not null references public.players (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (hash, player)
);

-- Codes redeemed by an install before accounts existed are moved into the first account it signs in with.
alter table public.code_redemptions add column if not exists claimed_by uuid references public.players (id) on delete set null;

create table if not exists public.daily_claims (
  player uuid not null references public.players (id) on delete cascade,
  -- The player's own date for the card opened.
  day date not null,
  coins integer not null check (coins >= 0),
  item text,
  claimed_at timestamptz not null default now(),
  primary key (player, day)
);

create table if not exists public.year_gifts (
  player uuid not null references public.players (id) on delete cascade,
  year integer not null,
  claimed_at timestamptz not null default now(),
  primary key (player, year)
);

create table if not exists public.pass_claims (
  player uuid not null references public.players (id) on delete cascade,
  season integer not null,
  level integer not null check (level between 1 and 50),
  coins integer not null check (coins >= 0),
  claimed_at timestamptz not null default now(),
  primary key (player, season, level)
);

-- A friend request is a row; accepting it sets accepted. One row per pair, whichever way it was asked.
create table if not exists public.friendships (
  requester uuid not null references public.players (id) on delete cascade,
  addressee uuid not null references public.players (id) on delete cascade,
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee_idx on public.friendships (addressee);

create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 24),
  tag text not null check (tag ~ '^[A-Z0-9]{2,5}$'),
  colour integer not null default 5025000 check (colour between 0 and 16777215),
  owner uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists clans_name_idx on public.clans (lower(name));
create unique index if not exists clans_tag_idx on public.clans (tag);

-- A player is in one clan at most.
create table if not exists public.clan_members (
  clan uuid not null references public.clans (id) on delete cascade,
  player uuid not null unique references public.players (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (clan, player)
);

create table if not exists public.clan_invites (
  clan uuid not null references public.clans (id) on delete cascade,
  player uuid not null references public.players (id) on delete cascade,
  invited_by uuid references public.players (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (clan, player)
);

-- Waypoints the whole clan sees, on one server (its address) in one dimension.
create table if not exists public.clan_waypoints (
  id bigint generated always as identity primary key,
  clan uuid not null references public.clans (id) on delete cascade,
  server text not null check (char_length(server) between 1 and 100),
  dimension text not null check (char_length(dimension) between 1 and 64),
  name text not null check (char_length(name) between 1 and 32),
  x integer not null,
  y integer not null,
  z integer not null,
  colour integer not null check (colour between 0 and 16777215),
  created_by uuid references public.players (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists clan_waypoints_idx on public.clan_waypoints (clan, server);

-- Chat: to a friend, or to the sender's clan.
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  sender uuid not null references public.players (id) on delete cascade,
  recipient uuid references public.players (id) on delete cascade,
  clan uuid references public.clans (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now(),
  check ((recipient is null) <> (clan is null))
);

create index if not exists messages_recipient_idx on public.messages (recipient, id);
create index if not exists messages_sender_idx on public.messages (sender, id);
create index if not exists messages_clan_idx on public.messages (clan, id);

alter table public.players enable row level security;
alter table public.coin_ledger enable row level security;
alter table public.owned_items enable row level security;
alter table public.account_redemptions enable row level security;
alter table public.daily_claims enable row level security;
alter table public.year_gifts enable row level security;
alter table public.pass_claims enable row level security;
alter table public.friendships enable row level security;
alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
alter table public.clan_invites enable row level security;
alter table public.clan_waypoints enable row level security;
alter table public.messages enable row level security;

-- Plus codes (plus:30 - thirty days of Catalyst Plus) join the reward grammar.
alter table public.redeem_codes drop constraint if exists redeem_codes_reward_check;
alter table public.redeem_codes add constraint redeem_codes_reward_check
  check (reward ~ '^(coins|sale|item|special|plus):.+$');

-- --------------------------------------------------------------------------- players

-- Signing in: the row for [p_id], named as Mojang spells it now. A name is one account's at a time, so
-- whoever had it before (renamed since, and not back yet) gives it up for a placeholder until they return.
create or replace function public.account_upsert(p_id uuid, p_name text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.players set name = 'x' || left(replace(id::text, '-', ''), 15)
  where lower(name) = lower(p_name) and id <> p_id;
  insert into public.players (id, name, last_seen) values (p_id, p_name, now())
  on conflict (id) do update set name = excluded.name, last_seen = now();
end;
$$;

create or replace function public.player_by_name(p_name text)
returns setof public.players
language sql
stable
set search_path = ''
as $$
  select * from public.players where lower(name) = lower(p_name) limit 1;
$$;

-- --------------------------------------------------------------------------- coins

-- The one way a balance changes: locks the row, refuses to go below zero, writes the ledger.
-- Returns the new balance, or null when the player has too few coins (nothing changes then).
create or replace function public.change_coins(p_player uuid, p_delta integer, p_reason text, p_ref text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_coins integer;
begin
  select coins into v_coins from public.players where id = p_player for update;
  if not found then
    raise exception 'no such player';
  end if;
  if v_coins + p_delta < 0 then
    return null;
  end if;
  update public.players set coins = coins + p_delta where id = p_player;
  if p_delta <> 0 then
    insert into public.coin_ledger (player, delta, reason, ref) values (p_player, p_delta, p_reason, p_ref);
  end if;
  return v_coins + p_delta;
end;
$$;

-- Buying: the price is the site's (lib/catalog.ts), worked out before this is called.
create or replace function public.buy_item(p_player uuid, p_item text, p_price integer)
returns text
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.owned_items where player = p_player and item = p_item) then
    return 'owned';
  end if;
  if public.change_coins(p_player, -p_price, 'buy', p_item) is null then
    return 'poor';
  end if;
  insert into public.owned_items (player, item, source) values (p_player, p_item, 'shop');
  return 'bought';
end;
$$;

-- Applies a code's reward to an account. Sales keep the better of the two; Plus adds days.
create or replace function public.apply_reward(p_player uuid, p_reward text, p_ref text, p_source text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_kind text := split_part(p_reward, ':', 1);
  v_rest text := substr(p_reward, length(split_part(p_reward, ':', 1)) + 2);
  v_today date := (now() at time zone 'utc')::date;
  v_percent integer;
  v_days integer;
begin
  if v_kind = 'coins' then
    perform public.change_coins(p_player, v_rest::integer, case when p_source = 'migrate' then 'migrate' else 'code' end, p_ref);
  elsif v_kind = 'item' then
    insert into public.owned_items (player, item, source) values (p_player, v_rest, p_source) on conflict do nothing;
  elsif v_kind = 'special' then
    insert into public.owned_items (player, item, source) values (p_player, 'special:' || v_rest, p_source) on conflict do nothing;
  elsif v_kind = 'sale' then
    v_percent := split_part(v_rest, ':', 1)::integer;
    v_days := split_part(v_rest, ':', 2)::integer;
    update public.players set
      sale_percent = case when sale_until is null or sale_until < v_today or v_percent >= sale_percent then v_percent else sale_percent end,
      sale_until = case when sale_until is null or sale_until < v_today or v_percent >= sale_percent then v_today + v_days - 1 else sale_until end
    where id = p_player;
  elsif v_kind = 'plus' then
    update public.players set plus_until = greatest(coalesce(plus_until, v_today - 1), v_today - 1) + v_rest::integer
    where id = p_player;
  end if;
end;
$$;

-- A code redeemed by an account: once per account, once per install, the code's uses counted - and the
-- reward applied in the same step.
create or replace function public.redeem_code_for(p_hash text, p_player uuid, p_device uuid)
returns table (outcome text, reward text, expires_on date)
language plpgsql
set search_path = ''
as $$
declare
  v_code public.redeem_codes%rowtype;
begin
  select * into v_code from public.redeem_codes c where c.hash = p_hash for update;

  if not found then
    return query select 'unknown'::text, null::text, null::date;
    return;
  end if;
  if v_code.revoked then
    return query select 'revoked'::text, null::text, null::date;
    return;
  end if;
  if v_code.expires_on is not null and v_code.expires_on < (now() at time zone 'utc')::date then
    return query select 'expired'::text, null::text, v_code.expires_on;
    return;
  end if;
  if exists (select 1 from public.account_redemptions r where r.hash = p_hash and r.player = p_player)
     or exists (select 1 from public.code_redemptions r where r.hash = p_hash and r.device_id = p_device) then
    return query select 'already'::text, null::text, null::date;
    return;
  end if;
  if v_code.uses >= v_code.max_uses then
    return query select 'used'::text, null::text, null::date;
    return;
  end if;

  insert into public.account_redemptions (hash, player) values (p_hash, p_player);
  insert into public.code_redemptions (hash, device_id, claimed_by) values (p_hash, p_device, p_player);
  update public.redeem_codes c set uses = c.uses + 1 where c.hash = p_hash;
  perform public.apply_reward(p_player, v_code.reward, 'code', 'code');
  return query select 'redeemed'::text, v_code.reward, v_code.expires_on;
end;
$$;

-- What an install redeemed before accounts existed, moved into the account it first signs in with:
-- the rewards are the codes' own, so nothing a launcher says about itself is trusted here.
create or replace function public.claim_device_codes(p_player uuid, p_device uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select r.hash, c.reward from public.code_redemptions r
    join public.redeem_codes c on c.hash = r.hash
    where r.device_id = p_device and r.claimed_by is null
    for update of r
  loop
    update public.code_redemptions set claimed_by = p_player where hash = v_row.hash and device_id = p_device;
    if not exists (select 1 from public.account_redemptions a where a.hash = v_row.hash and a.player = p_player) then
      insert into public.account_redemptions (hash, player) values (v_row.hash, p_player);
      perform public.apply_reward(p_player, v_row.reward, 'device code', 'migrate');
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- A daily reward card: once per player per date. The reward is the site's (lib/daily.ts).
create or replace function public.claim_daily(p_player uuid, p_day date, p_coins integer, p_item text)
returns text
language plpgsql
set search_path = ''
as $$
begin
  insert into public.daily_claims (player, day, coins, item) values (p_player, p_day, p_coins, p_item)
  on conflict do nothing;
  if not found then
    return 'already';
  end if;
  perform public.change_coins(p_player, p_coins, 'daily', p_day::text);
  if p_item is not null then
    insert into public.owned_items (player, item, source) values (p_player, p_item, 'daily') on conflict do nothing;
  end if;
  return 'claimed';
end;
$$;

-- The year's gift: every day of the year opened, once.
create or replace function public.claim_year_gift(p_player uuid, p_year integer, p_coins integer)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_days integer := (make_date(p_year + 1, 1, 1) - make_date(p_year, 1, 1));
  v_opened integer;
begin
  select count(*) into v_opened from public.daily_claims
  where player = p_player and day >= make_date(p_year, 1, 1) and day < make_date(p_year + 1, 1, 1);
  if v_opened < v_days then
    return 'not-yet';
  end if;
  insert into public.year_gifts (player, year) values (p_player, p_year) on conflict do nothing;
  if not found then
    return 'already';
  end if;
  perform public.change_coins(p_player, p_coins, 'year-gift', p_year::text);
  return 'claimed';
end;
$$;

-- A battle pass level's coins, once. Whether the level could have been reached yet is the site's check.
create or replace function public.claim_pass(p_player uuid, p_season integer, p_level integer, p_coins integer)
returns text
language plpgsql
set search_path = ''
as $$
begin
  insert into public.pass_claims (player, season, level, coins) values (p_player, p_season, p_level, p_coins)
  on conflict do nothing;
  if not found then
    return 'already';
  end if;
  perform public.change_coins(p_player, p_coins, 'pass', p_season || ':' || p_level);
  return 'claimed';
end;
$$;

-- Coins to a friend: both sides of the ledger in one step, and only between friends.
create or replace function public.gift_coins(p_from uuid, p_to uuid, p_amount integer)
returns text
language plpgsql
set search_path = ''
as $$
begin
  if p_amount < 1 then
    return 'amount';
  end if;
  if not exists (
    select 1 from public.friendships f
    where f.accepted and ((f.requester = p_from and f.addressee = p_to) or (f.requester = p_to and f.addressee = p_from))
  ) then
    return 'not-friends';
  end if;
  -- Lock both rows in one order, so two gifts crossing each other cannot deadlock.
  perform 1 from public.players where id in (p_from, p_to) order by id for update;
  if public.change_coins(p_from, -p_amount, 'gift-out', p_to::text) is null then
    return 'poor';
  end if;
  perform public.change_coins(p_to, p_amount, 'gift-in', p_from::text);
  return 'sent';
end;
$$;

revoke all on function public.account_upsert(uuid, text) from public, anon, authenticated;
revoke all on function public.player_by_name(text) from public, anon, authenticated;
revoke all on function public.change_coins(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.buy_item(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.apply_reward(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.redeem_code_for(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.claim_device_codes(uuid, uuid) from public, anon, authenticated;
revoke all on function public.claim_daily(uuid, date, integer, text) from public, anon, authenticated;
revoke all on function public.claim_year_gift(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.claim_pass(uuid, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.gift_coins(uuid, uuid, integer) from public, anon, authenticated;
