# Catalyst Designs

A small public site where players submit cosmetic designs for Catalyst Client - capes, wings, hats,
backpacks - and other players vote on them. Designs can be uploaded as a PNG or drawn in the
browser. It also holds the Terms of Service and Privacy Policy for all of Catalyst, and the code
server the launcher redeems codes with. Next.js + Supabase.

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

## Kinds of design, and the size rules

The type names come from the launcher rather than being invented here: its `ShopKind` is
{Wings, Cape} and its cosmetics page adds Hats and Backpacks. Pets and Emotes are left out on
purpose - a pet is a model and an emote is an animation, neither of which is a PNG somebody draws.

**Only the cape is size-checked, and that is a deliberate decision.** The cape has a real,
documented texture size in this project (64x32 or an exact 2:1 HD multiple, because the 1.21.4 cape
model computes its UVs against a 64x32 layout - the launcher's `ControlsValidation.kt` explains it
properly). Nothing else has a settled size anywhere: the client mod implements capes
(`ControlsCapeMixin`) and nothing else yet, and the launcher's wings are drawn artwork rather than
a texture. Holding wings to the cape's 64x32 would be inventing a spec and rejecting good work for
breaking a rule nobody has written, so every other type gets format and size checks only - a real
PNG, under 1 MB, between 8x8 and 1024x1024.

When wings do get implemented, add their sizes to `sizes` in `lib/design-types.ts`; the checks, the
drop-zone wording and the submit form all follow from that one place.

## Drawing in the browser

The submit section has two tabs: upload a file, or draw a cape. The canvas is exactly 64x32 - a
real cape texture - and is only *displayed* large (16px per texture pixel on a desktop screen), so
anything drawn is already the right size and needs no dimension check at all. A drawing is turned
into a PNG and posted to the same route as an upload, so it arrives pending and goes through the
same review. Tools are deliberately four: a colour, a pencil, an eraser and a clear.

Capes only, for now, because the cape is the only type whose dimensions are settled.

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
2. Open **SQL Editor** and run the files in `supabase/migrations/` in order - `0001_init.sql`
   creates the two tables, the `cast_vote` function, row-level security and the Storage bucket;
   `0002` and `0003` add columns; `0004_redeem_codes.sql` adds the redeem code tables and the
   `redeem_code` function.
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

## Redeem codes

Codes for the launcher - gift cards, giveaways, stream codes - are made on **`/admin/codes`**
(same reviewer password) and work in every launcher the moment they are made.

- **Making:** pick the reward (coins, a sale on wings, a free shop item or a code-only exclusive),
  how many codes, how many players each may be used by, an optional last day and a note. The server
  generates `CATL-XXXX-XXXX-XXXX` codes (31-letter alphabet, no 0/O/1/I/L) and stores **only their
  SHA-256**; the readable codes come back once, to copy or download. Batches can be cancelled, and
  so can one leaked code.
- **Redeeming:** the launcher posts `{code, device}` to **`/api/codes/redeem`**. `device` is a
  random id the launcher keeps in `~/.visuals-launcher/device.json` - never hardware, never a
  person. The `redeem_code` database function locks the code, checks cancelled / expired / already
  redeemed on this install / used up, records the redemption and hands back the reward, all in one
  step, so a code's last use can't go to two players at once.
- **The launcher applies the reward** (`coins:500`, `sale:20:7`, `item:Moth Wings`,
  `special:Creator Cape` - `lib/rewards.ts`, the launcher's `CodeGrant`). What it gave is kept on
  the player's computer until accounts exist.
- **Keeping the two sides in step:** the launcher and this site each hash a code themselves.
  `npm run check:codes` checks this site against the example the launcher's `CodesTest` pins. Item
  names in `lib/rewards.ts` must match the launcher's shop (`CosmeticsPage.kt`).
- No rate limit: 31^12 codes make guessing one by asking hopeless.

## Legal pages

`/terms` (Terms of Service) and `/privacy` (Privacy Policy) cover all of Catalyst - launcher,
client, this site, coins, battle pass, codes and community designs - written from what the
software actually does. The facts they depend on live in **`lib/legal.ts`**: who runs it, the
contact address (**null until the team has one - set it**, the GDPR requires one), the country
whose law applies and its data protection authority, and the ages. They are carefully written but
not a lawyer's work: have them checked before real payments or a big audience.

## Deploying

The live site is uploaded with the Netlify CLI or API (it is not built from Git), so pushing to
GitHub does not change it. To deploy: apply any new migration to the Supabase project first, then
`netlify deploy --prod` from this folder (the Next.js runtime is declared in `netlify.toml`). The
environment variables are set in Netlify's UI. After deploying, open `/admin` to check the password
works, and `/admin/codes` to check the codes tables exist.

## What this version deliberately does not have

- **No automatic content filtering.** The human approval step is the moderation.
- **No rewards for submitting.** Picking winners is something you do by looking at the gallery.
- **No user accounts.** A display name is a label anyone can type, not an identity. It is reviewed
  along with the image, because it is shown publicly too.
- **The launcher talks to this site in one place only:** redeeming a code.

## Known limits, stated plainly

- **Voting is one per browser, not one per person.** A cookie identifies the voter and the database
  refuses a second vote from the same cookie on the same design. Treat the counts as a rough signal
  for a human picking winners, not as something to award prizes on automatically.
- **The admin login is not rate-limited.** One shared password, compared in constant time, in a
  signed httpOnly cookie. Use a long random password.
- **Rejected images are kept** so a mis-click can be undone. Nothing serves them - they are 404 to
  everyone but a reviewer - but decide a retention policy before real traffic.
- **The gallery loads every approved design at once**, and the codes page groups the newest 10,000
  codes in the app. Both need paging eventually.
- **A shared code is once per install, not once per person** - the launcher's device id is random
  and can be reset by deleting a file. Single-use codes are unaffected: they are used up for everyone.

## Layout

The public site is **one page** that scrolls: the current round (`/#vote`), the gallery
(`/#gallery`) and the submit form (`/#submit`). `/terms` and `/privacy` are the legal pages, and
`/admin` and `/admin/codes` are the reviewers' pages.

```
app/
  layout.tsx, page.tsx, globals.css   shell, the one public page, the dark theme
  terms/, privacy/                    Terms of Service and Privacy Policy (facts in lib/legal.ts)
  admin/                              password gate, review queue, round picking
  admin/codes/                        making and cancelling redeem codes
  api/submissions/                    POST: create a pending submission
  api/votes/                          POST: one vote per browser
  api/images/[id]/                    GET: the only way an image leaves the server
  api/codes/redeem/                   POST: the launcher redeems a code
  api/admin/login/                    POST/DELETE: open and close an admin session
  api/admin/review/                   POST: approve, reject, or send back to pending
  api/admin/feature/                  POST: put an approved design in the round, or take it out
  api/admin/codes/                    POST: make a batch; revoke/: cancel a batch or a code
components/
  hero-stage.tsx                      the leading design, big, at the top of the page
  featured-round.tsx, gallery.tsx     the round, and every approved design with a type filter
  design-card.tsx, vote-button.tsx    one card and one vote, shared by both
  submit-form.tsx, draw-canvas.tsx    the form, and the 64x32 cape canvas
  logo.tsx, logo-shapes.ts            the client's logo as SVG, from the launcher's traced shapes
  type-icon.tsx, feature-toggle.tsx   a pixel mark per kind; the reviewer's round picker
lib/
  codes.ts, rewards.ts                code format and fingerprint; rewards in the launcher's grammar
  legal.ts                            operator, contact, country and ages for the legal pages
  validation.ts, design-types.ts      PNG and size rules; the kinds of design
  admin-session.ts, voter.ts          password check and session cookie; the voter cookie
  store/                              types.ts, index.ts (picks a driver), supabase.ts, local.ts
supabase/migrations/                  0001 tables, RLS, cast_vote, bucket; 0002 featured;
                                      0003 design_type; 0004 redeem codes
scripts/                              check-supabase.mjs, check-codes.mjs, remove-submissions.mjs
```

## Look and feel

Dark, like the launcher: its navy ground, its sky blue for actions, its sculk teal for the light
behind the hero, and its coin gold for winning. Designs sit on a dark stage so the art is the
brightest thing on the page, drawn pixel-sharp. Everything is on one scroll with very little text:
a big headline, three one-line steps, the round, the gallery and the form - no tabs to find things
behind. Inter for text; the pixel face only labels sections, as the launcher's does. The logo is
the launcher's own traced logo as an SVG, never the raster artwork.
