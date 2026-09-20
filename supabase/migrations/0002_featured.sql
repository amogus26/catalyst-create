-- Featured designs: the handful picked for the current voting round.
--
-- Curation is a human decision, like approval is - there is no way to work out which five designs
-- make a good round by machine. A reviewer ticks them on /admin, and the vote section shows
-- whichever are ticked, highest-voted first, up to five.
--
-- Featuring does not make anything visible: only `status = 'approved'` does that, and every query
-- for featured designs also requires it. Ticking a pending design shows nobody anything.

alter table public.submissions
  add column if not exists featured boolean not null default false;

comment on column public.submissions.featured is
  'Picked by a reviewer for the current voting round. Only meaningful together with status = approved.';

-- The vote section reads featured + approved, ordered by votes.
create index if not exists submissions_featured_idx
  on public.submissions (featured, status, vote_count desc)
  where featured;
