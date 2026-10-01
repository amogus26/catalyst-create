# Catalyst Client - the website

The official site for Catalyst Client: what the launcher and client do, the store (cosmetics, coins,
battle pass), how to redeem a code, downloads, and **Catalyst Designs** - where players submit
cosmetic designs and vote on them. It also holds the Terms of Service and Privacy Policy for all of
Catalyst, the code server the launcher redeems codes with, and the CurseForge relay for the
launcher's mod browser. Next.js + Supabase, on Netlify.

## Pages

| Path | What it is |
| --- | --- |
| `/` | Home: a 3D hero, the figures, a tour of the real launcher, the features, the client's modules, Catalyst and Minecraft side by side, how to start, Microsoft sign-in, the store |
| `/cosmetics` | The shop as the launcher has it - capes and wings in coins, a 3D viewer, rewards you earn |
| `/coins` | Coin packs, what coins buy, Catalyst+ and the daily rewards calendar |
| `/battle-pass` | The season: 50 levels on a scrolling track, the quests and the XP they give |
| `/redeem` | Where codes come from and how to redeem one in the launcher |
| `/designs` | Catalyst Designs: the round (`#vote`), the gallery (`#gallery`), submitting (`#submit`) |
| `/download` | Windows and macOS, what you need, and the release notes |
| `/terms`, `/privacy` | The legal pages (facts in `lib/legal.ts`) |
| `/admin`, `/admin/codes` | The reviewers' pages |

Catalyst Designs used to be the whole site at `/`. Old links still land in the right place:
`/#vote`, `/#gallery` and `/#submit` are sent on to `/designs#...` by
`components/site/hash-redirect.tsx` (a hash never reaches the server), and `/vote`, `/gallery` and
`/submit` redirect in `next.config.mjs`.

## No real payments yet

Nothing on this site takes money. Prices are shown the way the launcher shows them, and every buy
button says **Buy in the launcher** or **Coming soon**. There is no payment provider and no card field
anywhere. **Before real payments exist, the Terms (`lib/legal.ts`, `app/terms`) must be reviewed** -
they were written for a store that sells nothing yet.

Codes are redeemed **only in the launcher**, which ties a redemption to its device id (see Redeem
codes below). `/redeem` explains the steps; there is deliberately no web form, because one would
bypass that.

## Where the facts come from

Everything the pages say about the app - versions, modules, shop items and prices, coin packs,
daily rewards, the season, quests, themes, release notes - lives in **`lib/catalyst.ts`**, copied
from the launcher and client source (each block names the Kotlin file it came from). When the app
changes, change it there and every page follows. `lib/sprites.ts` holds the reward icons,
generated from the launcher's `RewardIcons.kt`, and `components/site/cosmetic-art.tsx` draws capes
and wings the way `CosmeticArt.kt` does. The screenshots in `assets/screens/` are of the real
launcher and client. **The launcher's are drawn by the launcher itself** at 2.25x (2880x1800) -
run `WEBSITE_SHOTS=1 ./gradlew test --tests '*WebsiteShots*'` in the launcher repo and convert
`build/website-shots/*.png` to WebP into `assets/screens/`. They are shown at no more than 1440px
wide, so one pixel per screen pixel on Retina, and served as they are (`unoptimized`), never
re-compressed. The Store tab is left out on purpose: it shows the daily reward cards. The client's module menu is a video (`public/video/modules.mp4`, from the team's recording: the still
start and end cut, played at 2x, 30 fps, a keyframe every 6 frames so scrolling can seek it smoothly).
On a wide screen it is pinned and the page's scroll plays it; on a phone it loops; with reduced motion
it stays still with controls. **The side-by-side pair** (`compare-catalyst.webp`, `compare-minecraft.webp`, the
slider in `components/home/compare.tsx`) are the client's own `vz_shot=world` screenshots (its `DebugShots`), of
the same spot at the same time: run `runClient` with `--width 1440 --height 810` (on a Retina Mac that is
2880x1620) and its own `--gameDir` (an init script adding both to the run's args, so no saves or settings of
the team's are touched), `-Dvz_world=<a copied save> -Dvz_config=<an empty folder> -Dvz_skin=steve
-Dvz_command_tick=20 -Dvz_panorama_tick=220` and `-Dvz_commands="time set 1000;weather clear;item replace entity
@s weapon.mainhand with diamond_sword;tp @s -940.67 79 241.5 0 -8"` (that save's snowy valley), the game's chat
hidden and GUI scale 4 in that folder's options.txt. Minecraft: `-Dvz_disable=` every module that starts on.
Catalyst: `-Dvz_enable=sky_shaders,minimap -Dvz_disable=fps` - the FPS readout is off because a dev run at that size,
without the Sodium a real launch brings, says nothing true about speed. The chips under it list what is on. Then
`vz_menu.png` from that folder's `screenshots/`, resized to 2560x1440 WebP (quality 90). The mods panel's icons come straight from
Modrinth's CDN, as the launcher shows them - they are the mod authors', not ours to copy.

- **Daily rewards stay a surprise.** The site says what the calendar is worth in coins, never which
  cosmetics are on which day or what the year gift holds - opening the card is the point.
- **Sample data is labelled.** The daily rewards and the season are the launcher's own sample data
  until there is a server, and the pages mark them *Preview*.
- **No numbers are made up.** There are no player counts, downloads or ratings anywhere, because
  none exist yet. Add them only when they are real.
- **Download links are a placeholder.** `DOWNLOAD_URLS` in `lib/catalyst.ts` is
  `{ windows: null, macos: null }`. While a link is `null`, every Download button goes to `/download`,
  which says the build is not out yet. Put the real URLs there when there are builds.

## 3D, motion and speed

The 3D (three.js through `@react-three/fiber` and `drei`) is the character in the hero, the viewer
on `/cosmetics`, the coins on `/coins` and the cape preview on `/designs`. Scroll animation uses
`motion`. The rules, all in `components/three/stage.tsx` and `components/site/`:

- The 3D is its own chunk, loaded after the page has painted (`next/dynamic` with `ssr: false`,
  mounted when the browser is idle), so it never holds up the first view.
- The pixel ratio is capped at 2, and a scene stops drawing while it is off screen.
- A still picture stands in while the 3D loads, without WebGL, and if the scene throws.
- **Reduced motion** (`prefers-reduced-motion`): nothing turns or floats, a scene draws one still
  frame, the pinned scroll sections become plain lists, and everything that would fade in is simply
  there. The markup is the same with and without it, so nothing re-renders on load.
- **The page scales with the window.** All sizes are in rem, and between 900px and 1440px wide the
  root size follows the window (`html` in `app/site.css`), so a smaller window shows the same page
  smaller - as the launcher does - rather than a squeezed one. At 900px and under, the phone layout
  takes over at full size. Write new sizes in rem, and keep breakpoints at 900px and under.
- **The background answers the pointer**, like the launcher's Home: a fog trail after the mouse and a
  bloom where you click (`components/site/pointer-light.tsx`, the launcher's `HallBackdrop.kt`
  numbers). One canvas behind the page, drawn only while there is light to draw, off with reduced
  motion.
- The character, capes and wings are drawn in code (`components/three/textures.ts`) - our own skin,
  no Mojang assets.

**Regenerating the pictures.** `public/stills/hero.webp` is the hero scene itself: open
`/?still` (it holds a three-quarter pose and keeps the canvas readable), wait for it to draw, then
in the browser console run
`Object.assign(document.createElement("a"), { href: document.querySelector("canvas").toDataURL("image/webp", 0.86), download: "hero.webp" }).click()`.
`public/og.png`, the picture shown when a link is shared, is a 1200x630 screenshot of the top of the
home page.

Desktop Lighthouse on a production build (September 2026): performance 98-100 on every page, and 100
for accessibility, best practices and SEO; largest paint 0.7-1.2 s, no layout shift.

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
2. **The public page only ever asks for approved rows.** `app/designs/page.tsx` calls
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

### Claude screens every design first

Before a submission is stored, `app/api/submissions` sends the image (enlarged, pixel for pixel) and the
display name to Claude (`lib/claude.ts`, `screenDesign`). It refuses sexual content, hate and extremist
symbols (swastikas in any form, SS runes...), glorified war and violence, real-world locating details
(coordinates, street names, addresses, phone numbers, URLs, QR codes), slurs and anything illegal. A
refused design is **not stored** and the player is told why. A design Claude passes - or one it could
not look at (no `ANTHROPIC_API_KEY`, Claude down, an unclear answer) - is stored **pending** as before,
so the human review above still decides everything that is shown. `npm run check:claude` tests this
against a fake Claude.

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

A cape - drawn or uploaded - is shown on a turning 3D player beside the form as it is made, and every
cape in the gallery has a **View in 3D** button. The preview reads the file in the browser; nothing is
sent until the form is submitted.

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
| `ANTHROPIC_API_KEY` | optional | Claude: screens designs before review and answers the launcher's bot. **Server only.** |
| `CURSEFORGE_API_KEY` | optional | Turns on the CurseForge relay. **Server only.** Without it the relay answers 503. |

None of these may be prefixed `NEXT_PUBLIC_` - that would publish them to every visitor.

## Where it is running

| | |
| --- | --- |
| Site | **https://catalystclient.net** (bought through Netlify, DNS managed by Netlify) - also https://catalyst-client.netlify.app |
| Netlify project | `catalyst-client` (site id `c43726a8-24a2-4187-97e1-48568ad88731`) |
| Old address | https://catalyst-create.netlify.app - its own small Netlify project, see below |
| Supabase project | `catalyst-create` (ref `ekmqfqdwnktbaufjkufx`, eu-central-1) |

**The old address still works.** The site was called `catalyst-create` until it became the official
site. That name is now held by a second, tiny Netlify project deployed from **`old-address/`**: it
sends every page on to the same path at the new address, and passes `/api/*` straight through, so
launchers built before the move can still redeem codes and search CurseForge. Keep that project -
if it were deleted, anyone could take the old name and receive those launchers' requests.

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

## Catalyst Bot relay

The launcher's Catalyst Bot sends typed questions to `/api/bot` (`{ question, history }` ->
`{ answer }`), which asks Claude with instructions to answer questions about Catalyst and Minecraft only
and to refuse everything else, including attempts to change those rules. 12 questions a minute per
address. With no `ANTHROPIC_API_KEY` it answers 503 and the launcher uses its own fixed answers. Nothing
is stored. The key is server-only, like the CurseForge key.

## CurseForge relay

The launcher's mod browser searches Modrinth itself, but CurseForge needs a private key on every
request, so CurseForge goes through this site: `lib/curseforge.ts` and `app/api/mods/curseforge/*`
(search, categories, a mod, its files, one file). Set `CURSEFORGE_API_KEY` to turn it on and check it
with `npm run check:curseforge`. The key never goes to the launcher.

- **Nothing is cached.** CurseForge's terms do not allow keeping their data, so every reply is
  `no-store` (for browsers and Netlify's CDN) and every request goes to CurseForge fresh. The test
  checks both.
- **Downloads are switched off** (`501`) until CurseForge confirms in writing that relaying files is
  allowed; the route's comment says what to build then.
- A per-address rate limit keeps one caller from spending the key's quota.

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
`netlify deploy --build --prod` from this folder (the Next.js runtime is declared in `netlify.toml`).
Leave out `--prod` for a draft deploy: a private preview URL, with the live site untouched. The
environment variables are set in Netlify's UI. After deploying, open `/admin` to check the password
works, and `/admin/codes` to check the codes tables exist.

Before a deploy, all of these should pass:

```bash
npm run typecheck
npm run build
npm run check:codes        # this site and the launcher hash codes the same way
npm run check:curseforge   # the relay, against a fake CurseForge
npm run check:claude       # design screening and the bot, against a fake Claude
```

## What this version deliberately does not have

- **No automatic content filtering.** The human approval step is the moderation.
- **No rewards for submitting.** Picking winners is something you do by looking at the gallery.
- **No user accounts.** A display name is a label anyone can type, not an identity. It is reviewed
  along with the image, because it is shown publicly too.
- **The launcher talks to this site in three places only:** redeeming a code, CurseForge searches
  through the relay, and Catalyst Bot questions.
- **No payments, no accounts, no web redeem form** - see No real payments yet.

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

```
app/
  layout.tsx, template.tsx            the header and footer on every page; each page fades in
  site.css, globals.css               the site's look; the Designs, admin and legal pages' styles
  page.tsx, home.module.css           the home page
  cosmetics/, coins/, battle-pass/    the store pages
  redeem/, download/                  how to redeem a code; downloads and release notes
  designs/                            Catalyst Designs: the round, the gallery, the submit form
  terms/, privacy/                    Terms of Service and Privacy Policy (facts in lib/legal.ts)
  admin/                              password gate, review queue, round picking
  admin/codes/                        making and cancelling redeem codes
  api/submissions/                    POST: create a pending submission
  api/votes/                          POST: one vote per browser
  api/images/[id]/                    GET: the only way an image leaves the server
  api/codes/redeem/                   POST: the launcher redeems a code
  api/mods/curseforge/                GET: the CurseForge relay (no caching)
  api/admin/                          login, review, feature, codes - reviewers only
components/
  site/                               header, footer, download button, motion helpers, icons,
                                      the "hall" light backdrop, pixel sprites, cosmetic artwork
  three/                              the 3D: stage (limits and fallbacks), player, textures, scenes
  home/, cosmetics/, coins/,          the pieces of each page
  battle-pass/, redeem/, download/
  designs/cape-preview.tsx            the 3D cape preview and the View in 3D dialog
  hero-stage.tsx, featured-round.tsx, gallery.tsx, design-card.tsx, vote-button.tsx,
  submit-form.tsx, draw-canvas.tsx    Catalyst Designs
  logo.tsx, logo-shapes.ts            the client's logo as SVG, from the launcher's traced shapes
lib/
  catalyst.ts, sprites.ts             facts from the launcher and client; the reward icons
  codes.ts, rewards.ts                code format and fingerprint; rewards in the launcher's grammar
  curseforge.ts                       the CurseForge relay
  legal.ts                            operator, contact, country and ages for the legal pages
  validation.ts, design-types.ts      PNG and size rules; the kinds of design
  admin-session.ts, voter.ts          password check and session cookie; the voter cookie
  store/                              types.ts, index.ts (picks a driver), supabase.ts, local.ts
assets/screens/                       screenshots of the real launcher and client
public/stills/, public/og.png         the hero's still picture; the link-sharing picture
supabase/migrations/                  0001 tables, RLS, cast_vote, bucket; 0002 featured;
                                      0003 design_type; 0004 redeem codes
scripts/                              check-supabase, check-codes, check-curseforge,
                                      remove-submissions
```

## Look and feel

Dark, like the launcher: its navy ground, its sky blue for actions, its sculk teal for light and its
coin gold for anything you can earn or buy. Pages open on a "hall" - soft pools of teal light with
ribbons and specks drifting up, drawn in CSS - and sections rise in as they are reached. Wide screens
get pinned scroll sections (the launcher tour on the home page, the battle pass track); phones get the
same content as plain lists. Inter for text, Space Grotesk for headings and JetBrains Mono for small labels - no pixel font. Buttons have the launcher's stepped pixel corners. The logo is the launcher's own traced logo
as an SVG, never the raster artwork. Every page says it is not affiliated with Mojang or Microsoft.

**Microsoft sign-in is approved, and the site says exactly that much.** Mojang reviewed the launcher's Azure
app and put it on the Minecraft sign-in allow list on 28 September 2026 (`SIGN_IN` in `lib/catalyst.ts`). The
pages call it "approved for Minecraft sign-in" - never "official", "partner" or "endorsed" - and wherever it is
claimed (the home page's sign-in section, the terms) they also say it is permission to sign players in, not
an endorsement. No Microsoft, Xbox or Mojang logos.
