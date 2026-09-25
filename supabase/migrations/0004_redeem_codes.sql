-- Redeem codes for Catalyst Client.
--
-- Codes are made on /admin/codes and redeemed from the launcher through /api/codes/redeem, so a new
-- code works the moment it is made and a code is used up for everyone, not per computer.
--
-- Only a code's SHA-256 is stored - the same fingerprint the launcher computes (see lib/codes.ts) -
-- so reading this table gives nobody a working code. The readable codes exist once, in the admin's
-- browser, when a batch is made.
--
-- Locked down like the rest of the schema: row-level security on, no policies, so the anon key can
-- read and write nothing. Every call goes through the site's server with the service role key.

create table if not exists public.redeem_codes (
  hash text primary key check (hash ~ '^[0-9a-f]{64}$'),
  -- What the code gives, in the launcher's own grammar: coins:500, sale:20:7, item:Moth Wings,
  -- special:Creator Cape. The launcher applies it; the server only hands it over.
  reward text not null check (reward ~ '^(coins|sale|item|special):.+$'),
  note text check (note is null or char_length(note) <= 120),
  batch_id uuid not null,
  -- How many players may redeem it: 1 for a gift card, more for a stream or event code.
  max_uses integer not null default 1 check (max_uses between 1 and 100000),
  uses integer not null default 0 check (uses >= 0),
  -- The last day it works (inclusive, UTC). Null: it never runs out.
  expires_on date,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.redeem_codes is
  'Redeem codes by SHA-256 only. Made on /admin/codes, redeemed by the launcher through /api/codes/redeem.';

create index if not exists redeem_codes_batch_idx on public.redeem_codes (batch_id);

create table if not exists public.code_redemptions (
  hash text not null references public.redeem_codes (hash) on delete cascade,
  -- A random id the launcher keeps in ~/.visuals-launcher/device.json. Not a person and not a
  -- hardware fingerprint: it only stops one install redeeming the same shared code twice.
  device_id uuid not null,
  redeemed_at timestamptz not null default now(),
  primary key (hash, device_id)
);

comment on table public.code_redemptions is
  'One row per launcher install per code. device_id is random and says nothing about who someone is.';

alter table public.redeem_codes enable row level security;
alter table public.code_redemptions enable row level security;

-- --------------------------------------------------------------------------- redeeming

-- One code, one install, one step: the row is locked while it is checked, so two launchers racing
-- for the last use of a code cannot both get it.
create or replace function public.redeem_code(p_hash text, p_device uuid)
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
  if exists (
    select 1 from public.code_redemptions r where r.hash = p_hash and r.device_id = p_device
  ) then
    return query select 'already'::text, null::text, null::date;
    return;
  end if;
  if v_code.uses >= v_code.max_uses then
    return query select 'used'::text, null::text, null::date;
    return;
  end if;

  insert into public.code_redemptions (hash, device_id) values (p_hash, p_device);
  update public.redeem_codes c set uses = c.uses + 1 where c.hash = p_hash;
  return query select 'redeemed'::text, v_code.reward, v_code.expires_on;
end;
$$;

revoke all on function public.redeem_code(text, uuid) from public, anon, authenticated;
