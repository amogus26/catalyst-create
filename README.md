# Catalyst Designs

A small public site where players submit cape designs for Catalyst Client, and other players vote
on them. Next.js + Supabase.

## The rule this site is built around

**Nothing a visitor uploads is shown to anybody until a person has approved it.** Every submission
starts `pending` and stays invisible - not listed, not fetchable, not linkable - until someone opens
`/admin` and approves it. There is no path around this, including for testing.

That is the whole moderation story for this version. There is no automatic content filtering; a
human looking at each submission is the filter.

### How the gate is actually enforced

Four independent places, so no single mistake opens it:

1. **The store cannot create anything else.** `Store.createSubmission` takes no status argument
   (`lib/store/types.ts`), so no route, test or future change can insert a visible row. The column
   defaults to `'pending'` in the database too.
2. **The public page only ever asks for approved rows.** `app/page.tsx` calls
   `listByStatus("approved")` and `listFeatured()`, and `listFeatured` requires `approved` as well
   as `featured`. Pending designs are not fetched and filtered out - they are never loaded.
3. **Images are served by a route that checks the row first.** The Storage bucket is **private**, so
   no upload has a public URL at all. Bytes leave only through `app/api/images/[id]`, which returns
   404 for anything not approved unless the request carries a valid admin session.
4. **Approving requires the admin session, checked server-side.** `app/api/admin/review` verifies
   the session itself rather than trusting that the admin page rendered its buttons.

Row-level security is on for both tables with **no policies at all**, so the anon key - the only
key a browser could ever hold - can read and write nothing. Every query goes through this app's
server.

## Running it locally

```bash
npm install
cp .env.example .env.local     # then set ADMIN_PASSWORD to anything for local use
npm run dev
```

With no Supabase settings in `.env.local`, the site uses a **local dev store**: rows in
`.localstore/submissions.json`, images in `.localstore/images/`. An amber banner across the top says
so. This exists so the site can be run and checked without a cloud project; it is refused in
production (`getStore()` throws if `NODE_ENV=production` and Supabase is not configured), so a
misconfigured deploy fails loudly instead of quietly serving a store nobody is moderating.

Delete `.localstore/` to start over.

## Setting up Supabase

1. Create a project at [supabase.com](https://supabase.com) - the free tier is enough. Pick a
   region near your players and save the database password somewhere.
2. Open **SQL Editor**, paste all of `supabase/migrations/0001_init.sql`, and run it. That creates
   the two tables, the `cast_vote` function, turns on row-level security, and creates the Storage
   bucket.
3. Open **Storage** and check there is a `submissions` bucket and that it is **not public**. If the
   SQL could not create it, make it by hand: New bucket, name `submissions`, public **off**.
   (A public bucket would make every upload readable by URL before review. That is the one setting
   that would break the rule above.)
4. **Project Settings -> Data API** - copy the Project URL.
5. **Project Settings -> API Keys** - copy the `service_role` key (newer projects call this the
   *secret* key). It bypasses RLS: server only, never `NEXT_PUBLIC_`, never committed.
6. Put all three in `.env.local` and check the project over:

```bash
npm run check:supabase
```

That verifies the tables, the function, that the bucket exists and is private, and - if you also set
`SUPABASE_ANON_KEY` - that the anon key can read nothing. It only reads; it changes nothing.

## Environment variables

| Name | Needed | What it is |
| --- | --- | --- |
| `ADMIN_PASSWORD` | always | The shared password for `/admin`. Long and random; changing it signs out every admin session. |
| `SUPABASE_URL` | production | Project URL from Data API settings. |
| `SUPABASE_SERVICE_ROLE_KEY` | production | The service-role/secret key. **Server only.** |
| `SUPABASE_BUCKET` | optional | Defaults to `submissions`. |
| `SUPABASE_ANON_KEY` | optional | Only used by `npm run check:supabase` for its RLS check. |

None of these may be prefixed `NEXT_PUBLIC_` - that would publish them to every visitor.

## Where it is running

| | |
| --- | --- |
| Site | https://catalyst-create.netlify.app |
| Netlify project | `catalyst-create` (site id `c43726a8-24a2-4187-97e1-48568ad88731`) |
| Supabase project | `catalyst-create` (ref `ekmqfqdwnktbaufjkufx`, eu-central-1) |

**`netlify.toml` matters here.** Netlify installs its Next.js runtime automatically only for builds
from a linked Git repository; a deploy uploaded as a zip gets no runtime, publishes the static
output alone, and every dynamic page and API route 404s - which is the whole site. So the runtime is
a devDependency and is declared in `netlify.toml`. Leave both in place.

## Deploying

Push to GitHub first (see the bottom of this file), then either host:

### Vercel

1. [vercel.com](https://vercel.com) -> **Add New -> Project** -> import the repository.
2. Framework preset is detected as Next.js; leave the build settings alone.
3. **Environment Variables**: add `ADMIN_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and
   `SUPABASE_BUCKET` for Production (and Preview, if you want preview deploys to work - they will
   share the same database, so prefer a second Supabase project if that matters).
4. **Deploy**.
5. Open the deployed URL, submit a test design, then open `/admin` and approve it. If `/admin` will
   not open, `ADMIN_PASSWORD` is missing.

### Netlify

1. [netlify.com](https://netlify.com) -> **Add new site -> Import an existing project**.
2. Netlify detects Next.js and installs its Next runtime; build command `npm run build`.
3. **Site configuration -> Environment variables**: the same four.
4. **Deploy site**, then check it the same way.

### After it is live

The launcher's "Community designs" card points at a placeholder
(`https://catalyst.example/create`). Once this site has a real address, that link gets updated in
the launcher repo - `community/CommunityArt.kt`, one constant. That is a separate change.

## What this version deliberately does not have

- **No automatic content filtering.** The human approval step is the moderation.
- **No rewards.** Picking winners is something you do by looking at the gallery. Nothing here grants
  coins or talks to the launcher.
- **No user accounts.** A display name is a label anyone can type, not an identity. It is reviewed
  along with the image, because it is shown publicly too.
- **No connection to the launcher.**

## Known limits, stated plainly

- **Voting is one per browser, not one per person.** A cookie identifies the voter and the database
  refuses a second vote from the same cookie on the same design. Clearing cookies, opening a private
  window, or picking up a phone gets another vote. Treat the counts as a rough signal for a human
  picking winners, not as something to award prizes on automatically. Real anti-abuse needs
  identity - accounts, or the launcher's own sign-in - and is a later piece of work.
- **The admin login is not rate-limited.** One shared password, compared in constant time, in a
  signed httpOnly cookie. Use a long random password. A guess limiter is a sensible follow-up.
- **Rejected images are kept.** A rejected row keeps its file so that a mis-click can be undone
  from the "Rejected" list on the admin page. Nothing serves them - they are 404 to everyone but a
  reviewer - but you should decide a retention policy before this site sees real traffic.
- **The gallery loads every approved design at once.** Fine for a first contest; it needs paging
  before it is hundreds.

## Layout

The public site is **one page**. Submitting, the current voting round and the showcase are three
sections of `/` behind a tab switcher, not three routes - `/#submit`, `/#vote` and `/#showcase` are
real links to each. `/terms` is separate because it is reference material, and `/admin` is separate
because it is not public.

```
app/
  layout.tsx, page.tsx, globals.css   shell, the one public page, the launcher's palette
  terms/                              terms of service and privacy, on one page
  admin/                              password gate, review queue, round picking
  api/submissions/                    POST: create a pending submission
  api/votes/                          POST: one vote per browser
  api/images/[id]/                    GET: the only way an image leaves the server
  api/admin/login/                    POST/DELETE: open and close an admin session
  api/admin/review/                   POST: approve, reject, or send back to pending
  api/admin/feature/                  POST: put an approved design in the round, or take it out
components/
  section-tabs.tsx                    the switch between the three sections of the main page
  submit-form.tsx                     the form, with the client half of the file checks
  featured-round.tsx, showcase.tsx    the two ways designs are shown
  design-card.tsx, vote-button.tsx    one card and one vote, shared by both
  feature-toggle.tsx                  the reviewer's round picker
lib/
  validation.ts                       PNG and cape-size rules, shared by browser and server
  admin-session.ts                    password check and signed session cookie
  voter.ts                            the voter cookie
  config.ts                           how many designs a round holds
  store/                              types.ts, index.ts (picks a driver), supabase.ts, local.ts
supabase/migrations/                  0001 tables, RLS, cast_vote, private bucket; 0002 featured
scripts/check-supabase.mjs            read-only check of a real project
```
