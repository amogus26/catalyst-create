-- What kind of cosmetic a submission is: a cape, wings, a hat, a backpack.
--
-- The names come from the launcher's own lists (its ShopKind is {Wings, Cape}; its cosmetics page
-- adds Hats and Backpacks). Only the cape has a checkable texture size in this project, so only
-- the cape is size-checked - see lib/design-types.ts for the reasoning.
--
-- Existing rows predate the column and are all capes, which is what the default makes them.

alter table public.submissions
  add column if not exists design_type text not null default 'cape'
  check (design_type in ('cape', 'wings', 'hat', 'backpack'));

comment on column public.submissions.design_type is
  'Cosmetic kind, from the launcher''s own vocabulary. Only capes have a fixed texture size today.';
