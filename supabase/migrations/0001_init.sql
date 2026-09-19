-- Catalyst Designs - initial schema.
--
-- Run this once against a new Supabase project (SQL Editor, or `supabase db push`).
--
-- The moderation rule lives in three places here, on purpose:
--   1. `status` defaults to 'pending'. A row that forgets to say what it is, is hidden.
--   2. Row-level security is on for both tables, with NO policies. The anon key - the only key a
--      browser could ever hold - can therefore read and write nothing at all. Every query in this
--      site goes through the Next.js server with the service role key, which bypasses RLS. That is
--      what stops someone fetching the pending queue straight from the database.
--   3. `cast_vote` refuses anything that is not approved, so even a vote cannot touch a pending row.
--
-- The Storage bucket is private for the same reason: a public bucket would serve every upload by
-- URL the moment it landed. Images are read back by the server and passed on by /api/images/[id],
-- which checks the row's status first.

create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------------- submissions

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 24),
  image_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  vote_count integer not null default 0 check (vote_count >= 0),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

comment on table public.submissions is
  'Player-submitted cape designs. Nothing is public until status = approved, set by a human on /admin.';
comment on column public.submissions.display_name is
  'A label the submitter typed. Not an identity - there are no accounts. Reviewed with the image.';
comment on column public.submissions.image_path is
  'Object path in the private Storage bucket. Never served directly; see app/api/images/[id].';

-- The gallery reads approved by votes; the queue reads pending by age.
create index if not exists submissions_status_votes_idx
  on public.submissions (status, vote_count desc, created_at desc);

-- --------------------------------------------------------------------------- votes

create table if not exists public.votes (
  submission_id uuid not null references public.submissions (id) on delete cascade,
  voter_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (submission_id, voter_id)
);

comment on table public.votes is
  'One row per browser per design. voter_id is a cookie, not a person: it stops double-clicking, not determined abuse.';

-- --------------------------------------------------------------------------- locked down

alter table public.submissions enable row level security;
alter table public.votes enable row level security;

-- No policies are created, deliberately. Anything holding the anon key gets nothing. If you ever
-- add one, remember that `select` on submissions would expose the pending queue.

-- --------------------------------------------------------------------------- voting

create or replace function public.cast_vote(p_submission_id uuid, p_voter_id uuid)
returns table (counted boolean, votes integer)
language plpgsql
as $$
declare
  v_inserted integer;
  v_votes integer;
begin
  -- The insert only finds a row to vote on if the submission is approved, so this one statement
  -- covers both "already voted" and "not approved": neither inserts anything.
  insert into public.votes (submission_id, voter_id)
  select s.id, p_voter_id
    from public.submissions s
   where s.id = p_submission_id
     and s.status = 'approved'
  on conflict do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.submissions
       set vote_count = vote_count + 1
     where id = p_submission_id
    returning submissions.vote_count into v_votes;
  else
    select s.vote_count into v_votes
      from public.submissions s
     where s.id = p_submission_id
       and s.status = 'approved';
  end if;

  -- v_votes stays null when there is no approved submission by that id, which the app reads as 404.
  return query select (v_inserted > 0), v_votes;
end;
$$;

revoke all on function public.cast_vote(uuid, uuid) from public, anon, authenticated;

-- --------------------------------------------------------------------------- storage

-- A PRIVATE bucket. If this says true, every upload is world-readable by URL before anyone reviews
-- it, which is the one thing this site must never do.
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

-- No storage policies either: only the service role reads or writes these objects.
