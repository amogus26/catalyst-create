# Mod browser: Modrinth + CurseForge inside the launcher

Players search, install, update and remove mods from inside the Catalyst launcher. They don't need
the Modrinth App, the CurseForge App, Prism or the official launcher. This document is the design:
what exists today, the security boundaries, and the points where the platforms' own rules set the
limits.

It covers two parts:

| Part | Where | Runs on |
| --- | --- | --- |
| Launcher mod manager (search, resolve, download, verify, install, update, remove) | `launcher-mods/` (Kotlin/JVM module) | The player's computer (Windows, macOS Intel and Apple Silicon) |
| CurseForge relay (holds the API key) | `lib/curseforge.ts` and `app/api/mods/curseforge/*` in this site | Netlify, next to the code server |

## 0. Conflicts and limits

The brief asked to stop and explain wherever a requirement meets a platform rule. There are three.

1. **CurseForge downloads need the private key, and the launcher can't hold it.** Since July 2026
   CurseForge's CDN (`edge.forgecdn.net`) returns 401 unless the request carries the API key
   ([CurseForge blog](https://blog.curseforge.com/introducing-api-key-authentication-for-curseforge-file-downloads/)).
   The brief also says the key must never be in the client. Both can't be true for a direct
   download. The only compliant shape left is for our server to fetch the file with the key and
   pass the bytes on. Whether CurseForge's terms allow that relay is not ours to guess, so it is
   **built but switched off**: `…/files/{fileId}/download` answers `501 downloads_not_enabled`. Ask
   CurseForge when applying for the key. If they confirm it in writing, that route is about 30 lines
   (see its comment). Until then, CurseForge search, details, versions, dependencies and update
   checks work (once a key is set), and Install on a CurseForge mod says it isn't switched on yet
   and links to the project page.
2. **Authors can opt out of third-party distribution** (`allowModDistribution: false`, or a null
   `downloadUrl`). Those mods are never downloaded by the launcher, relay or not. The player gets
   "Open on CurseForge" instead. This is a CurseForge rule, not a limitation of our code.
3. **This work was done without the launcher's source.** The launcher is a separate Kotlin project
   (`CosmeticsPage.kt`, `~/.visuals-launcher/`) that isn't in this repository, and it wasn't
   available to this session. So `launcher-mods` is a self-contained module with a small interface
   (`InstanceProvider`) for the launcher to implement, plus a UI-independent screen controller
   (`ModBrowser`) for the launcher's pages to bind to. Section 1 lists what the launcher side still
   has to confirm.

Also: the Modrinth and CurseForge documentation sites were blocked by this session's network
policy. The Modrinth API was taken from Modrinth's own OpenAPI spec, the source of
docs.modrinth.com (`modrinth/code`, `apps/docs/public/openapi.yaml`, v2.7.0). The CurseForge API
shapes and enums came from a maintained client library, cross-checked against CurseForge's
published enum values. The CurseForge relay is the one place where a field-name mistake would
show, and it is covered by `npm run check:curseforge`. Check the response shapes against
docs.curseforge.com once the key exists.

## 1. The existing architecture, as far as it can be seen from here

| Question | What is known | Where the module plugs in |
| --- | --- | --- |
| Where instances live | Owned by the launcher (its data folder is `~/.visuals-launcher/`). Instance layout wasn't visible. | `InstanceProvider.list/get/create` returns `Instance(id, name, gameVersion, loader, loaderVersion, gameDir)`. The module writes only inside `gameDir`: `mods/` for jars and `.catalyst/` for its own state. |
| Backend | This Next.js site on Netlify + Supabase. The launcher already calls it for `/api/codes/redeem`. | The CurseForge relay is added to the same site, so there is no new service. |
| Authentication | There are no player accounts. The launcher sends a random device id for codes. Microsoft sign-in for playing is the launcher's own business. | Mod browsing needs no sign-in. Modrinth's public API needs no token, and CurseForge's key stays on the server. OAuth (docs.modrinth.com/guide/oauth) is only needed for acting *as* a Modrinth user (following projects, private projects), which isn't in scope. |
| Launcher updates | Not visible from here. | Independent: mod updates are per-instance and handled by `UpdateChecker`. |

To confirm when merging into the launcher: how the launcher stores instances (to implement
`InstanceProvider`), its UI toolkit (Compose is assumed, but `ModBrowser` doesn't depend on it), and
its version string for the User-Agent.

## 2. Architecture and security boundaries

```
 Player's computer (untrusted network, untrusted API data)          Netlify (holds secrets)
 ┌──────────────────────────────────────────────────────┐        ┌────────────────────────────┐
 │ Launcher UI (Explore Mods page)                       │        │ catalyst-create             │
 │   │ binds to                                          │        │  /api/mods/curseforge/*     │
 │ ModBrowser ─ search both, cards, prompts, updates     │  HTTPS │   validate params           │
 │   ├ ModrinthSource ─────────────────────────────────────────────────────► api.modrinth.com  │
 │   ├ CurseForgeSource ── no key ───────────────────────►│ relay ── x-api-key ──► api.curseforge.com
 │   ├ DependencyResolver ─ plan, conflicts, optional     │        │   reduce to our shape       │
 │   ├ ModInstaller ─ stage → verify → atomic commit      │        │   CDN cache, per-IP budget  │
 │   │    downloads ◄──────── cdn.modrinth.com ───────────────────── (CurseForge files: off, §0) │
 │   └ writes only <instance>/mods and <instance>/.catalyst│       └────────────────────────────┘
 └──────────────────────────────────────────────────────┘
```

**Boundaries:**

- **Secrets:** the only secret is `CURSEFORGE_API_KEY`, stored in Netlify's environment. It is
  never `NEXT_PUBLIC_`, never in the launcher, never in a response or a log line (the check script
  asserts both). Modrinth needs no secret.
- **Network:** the launcher fetches only `https://` URLs on an allow-list: `api.modrinth.com`,
  `cdn.modrinth.com`, `media.forgecdn.net` (icons) and our backend host. Redirects are followed by
  hand and every hop is re-checked, so a hostile response can't point the launcher at `file:`,
  `http:`, internal addresses or another site. TLS uses the JDK defaults and is never relaxed.
- **Data:** every API field is untrusted. JSON is read field by field with type checks and length
  caps (`net/Json.kt`). Ids must look like ids before they go into a URL path. Names, descriptions
  and URLs are clipped and filtered. The long description is plain text or Markdown and is never
  rendered as HTML. A version that claims to belong to another project is rejected.
- **Filesystem:** a file name from an API becomes a file on disk only if it passes
  `SafePaths.fileName`. It is refused, not "cleaned", if it contains `/ \ : * ? " < > |`, control or
  bidi characters, a leading dot, a trailing dot or space, a Windows device name (`CON`, `NUL`,
  `COM1`…) or a non-`.jar` extension. The target must be a direct child of `mods/`, and it can't be
  a symlink or pass through one.
- **Execution:** the launcher never runs, loads or unpacks a mod. Mods go in as the downloaded jar.
  Minecraft's loader loads them when the player presses Play. Nothing in an API response is ever a
  command.

## 3. Modrinth

Public v2 API, no token (reading public data needs none). Every request carries the launcher's
User-Agent (`ModManagerConfig.userAgent`, e.g. `amogus26/catalyst-launcher/1.4.0 (contact)`).
Modrinth requires one that names the app. `ModManager` refuses a blank one.

| Feature | Endpoint |
| --- | --- |
| Search by name, category, Minecraft version, loader; sort by relevance, popularity (follows), downloads, newest, updated | `GET /v2/search?query&facets&index&offset&limit`. Facets are ANDed groups, e.g. `[["project_type:mod"],["versions:1.21.1"],["categories:fabric"]]`. A Quilt profile ORs Quilt and Fabric. |
| Details, description, icon, gallery, downloads, versions, loaders | `GET /v2/project/{id}` |
| Author | `GET /v2/project/{id}/members` (search hits already carry `author`) |
| Version list, filtered to the instance | `GET /v2/project/{id}/version?loaders&game_versions&include_changelog=false` |
| A specific (pinned) version | `GET /v2/version/{id}` |
| Dependencies | Each version's `dependencies` (`required`, `optional`, `incompatible`, `embedded`) |
| Updates | `POST /v2/version_files/update` with the installed files' sha1s, the instance's loader(s) and version, releases only. One request per instance. |
| Categories | `GET /v2/tag/category` |
| Integrity | `files[].hashes.sha512` (verified) and `sha1` |

**Rate limit:** 300 requests per minute per IP, reported in `X-Ratelimit-Limit`, `-Remaining` and
`-Reset`. `RateBudget` keeps the launcher under 250 a minute by itself. It stops sending when the
server reports 0 remaining, waits out short resets, and turns long ones (and 429s) into
"Modrinth is busy right now. Try again in N seconds." Transient failures (network, 5xx) are retried
twice with backoff. A 410 means the API version was retired and says the launcher needs an update.

## 4. CurseForge

The launcher → our backend → CurseForge. Never the launcher → CurseForge with a key.

| Launcher asks | Relay calls (gameId 432, classId 6) |
| --- | --- |
| `GET /search?q&gameVersion&loader&categoryId&sort&index&pageSize` | `GET /v1/mods/search` with `searchFilter`, `gameVersion`, `modLoaderType` (Forge 1, Fabric 4, Quilt 5, NeoForge 6), `categoryId`, `sortField` (Popularity 2, LastUpdated 3, TotalDownloads 6, ReleasedDate 11), `sortOrder=desc`. `index + pageSize <= 10000`. |
| `GET /categories` | `GET /v1/categories?gameId=432&classId=6` |
| `GET /mods/{id}` | `GET /v1/mods/{id}` |
| `GET /mods/{id}/files?gameVersion&loader&index` | `GET /v1/mods/{id}/files` |
| `GET /mods/{id}/files/{fileId}` | `GET /v1/mods/{id}/files/{fileId}` |
| `GET /mods/{id}/files/{fileId}/download` | **501, switched off** (§0) |

The relay validates every parameter against a pattern before building the upstream URL. It has no
generic pass-through. It reduces answers to the launcher's shape (`Mod`, `File` in
`lib/curseforge.ts`): dependency relation types become `required`/`optional`/`incompatible`/`embedded`
(Tool and Include are dropped), the sha1 is picked out of `hashes` (algo 1), loaders are read from
the file's game-version tags, and `downloadable` is false unless the mod allows distribution *and*
the file is available *and* CurseForge gave a download URL. CDN URLs are not passed on.

**Caching and limits:** CurseForge doesn't publish a fixed number, so the relay is conservative:

- Answers are cached in memory and by Netlify's CDN (`Netlify-CDN-Cache-Control: s-maxage` of
  5 minutes for search, 30 for projects, 10 for files, and 24 hours for categories), so a popular
  search costs one upstream call for everyone.
- Each address gets 120 requests a minute (per server instance, as a speed bump).
- CurseForge's 429 passes through with its `Retry-After`.
- A refused key is logged, without the key, and reported to players only as "not available".

**Turning it on:** set `CURSEFORGE_API_KEY` in Netlify, then redeploy. Nothing in the launcher
changes. Without the key, every route answers `503 not_configured`, and the launcher shows Modrinth
results with one line saying CurseForge isn't available yet.

## 5. Compatibility, dependencies, installing

**Compatibility (`CompatibilityChecker`):**
- The Minecraft version must be an exact match. A mod for 1.21.1 isn't assumed to work on 1.21.8.
- The loader must be supported. Forge and NeoForge are not interchangeable.
- A Fabric mod on a Quilt profile is allowed with a warning.
- A vanilla profile takes no mods and offers to create a loader profile.

Refusals come as a reason plus a suggested action:

> **Cannot install Sodium**
> Your profile uses Forge, but this version of Sodium requires Fabric.
> [ Create Fabric Profile ]

**Resolution (`DependencyResolver`):** starting from the chosen version, it follows required
dependencies, plus the optional ones the player ticked, recursively. For each one:

- A pinned dependency version is used only if it fits the instance. Otherwise the newest fitting
  release is picked (then beta, then alpha).
- A dependency that is already installed is reused and recorded as needed.
- A cycle is followed once, and a plan is capped at 64 mods.

Blockers:

- A required dependency with no fitting version.
- `incompatible` against anything installed or in the plan, in either direction (the record keeps
  what each installed mod declared).
- The same project already installed.
- The same file already installed from the other platform (matched by hash).
- No verifiable file.
- An author who opted out of launcher downloads.

Warnings:

- The same mod by name from the other platform.
- A dependency that is only an external file name.
- Two mods pinning different versions of one library.
- Fabric on Quilt.

The player sees the plan before anything downloads:

> **Sodium**
> • Fabric API - required by Sodium
> ☐ Iris Shaders (optional)
> [ Install 2 mods ]

**Installing (`ModInstaller`):** all or nothing, per instance, one operation at a time:

1. Re-check every planned mod against the instance as it is now. Plans come from API data and
   may be stale.
2. Check every target name and path, and refuse if an unmanaged file already has that name.
3. Download each file into `<instance>/.catalyst/staging/<random>/` (owner-only permissions on
   POSIX; same disk, so the final step is a rename). Each download is capped at the size the API
   declared, and sha1 and sha512 are computed while streaming.
4. Verify the exact size and hash (sha512, or sha1 for CurseForge), then open the jar: it must be a
   real zip with no traversal or duplicate entries. If its own metadata (`fabric.mod.json`,
   `quilt.mod.json`, `META-INF/mods.toml`, `META-INF/neoforge.mods.toml`) names a loader, that
   loader must fit the profile. This catches a mislabelled version.
5. Only when every file has passed, rename them into `mods/`, without overwriting anything. Then
   write `<instance>/.catalyst/mods.json` atomically.
6. On any failure: remove what was moved, put back a replaced file, restore the record, and delete
   staging. The instance is exactly as it was.

`mods.json` records what the launcher installed and why (explicit or a dependency, required by
whom, declared incompatibilities, hashes). Files the player added by hand aren't in it and are never
touched.

**Removing:** only files in the record. It refuses if another installed mod needs the file (unless
forced), and also removes dependencies nothing needs any more. `config/` is left alone.

**Updating (`UpdateChecker` + `prepareUpdate`):** finds the newest compatible release, re-checks
it, re-resolves dependencies (a new version can need new ones), then installs with the old file
moved to a backup first. If anything fails, the old file comes back. The player's `config/` is never
touched, so settings survive.

> Sodium    Installed: 0.6.0    Latest compatible: 0.6.5    [ Update ]

## 6. Caching (launcher side)

`TtlCache`: a bounded in-memory LRU, plus an optional disk cache in the launcher's data folder.
Disk entries are named by a hash, so no API text becomes a path.

| What | Kept for |
| --- | --- |
| Search results | 5 minutes |
| Version lists | 10 minutes |
| Project details | 30 minutes |
| Categories | 24 hours |
| Update checks | never cached |

When offline, an expired answer (up to 7 days old) is shown rather than an error. That is safe
because every download is verified by hash anyway.

## 7. The Explore Mods screen

`ModBrowser` is the screen's logic. The launcher's page binds to it:

```
 Explore Mods                                          Profile: [ 1.21.8 Fabric PvP ▾ ]
 [ Search mods...                                   ]
 [ All ] [ Modrinth ] [ CurseForge ]
 Minecraft [1.21.8 ▾]  Loader [Fabric ▾]  Category [Any ▾]  Sort [Relevance ▾]
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │ [icon] Sodium                                   Modrinth · Fabric · 1.21.8     │
 │        by jellysquid3 · 55M downloads                                          │
 │        Modern rendering engine ...                                 [ INSTALL ] │
 └──────────────────────────────────────────────────────────────────────────────┘
  CurseForge isn't available yet - showing Modrinth.          (a notice, not an error)
```

- `search(query, profile)`: both platforms in parallel. The profile fills in the version and loader
  filters. One platform failing shows a notice while the other's results stay. On "All", results are
  interleaved by rank, or merged by count or date when sorting by those.
- `ModCard`: the platform label, loader, "Minecraft 1.21.x", "55M downloads", and a state (Install,
  Installed 0.6.0, or a greyed "Not available for Forge").
- `prepareInstall` returns `Ready` (the plan, the lines above, the button label, warnings, optional
  dependencies) or `Blocked` (title, reason, suggested action). `createProfile` is the
  "Create Fabric Profile" button.
- `checkUpdates`, `prepareUpdate` and `update` drive the "Updates available" list. `uninstall` drives
  Remove.
- All calls block. The UI runs them off its main thread and shows `InstallProgress`.

## 8. Tests

`launcher-mods` (`gradle test`, 123 tests) covers, with a fake network and temporary instances:

- search and every filter
- sort mapping
- version and loader compatibility (wrong version, wrong loader, Forge vs NeoForge, Quilt, vanilla)
- dependency resolution (transitive, cycles, optional, pinned fallbacks, reuse, caps)
- conflicting dependencies (both directions, within a plan)
- duplicates (same project, same hash across platforms, same name)
- install, uninstall (orphans, needed-by, hand-added files kept), update (success, rollback, config
  kept, wrong-loader update not offered)
- invalid JSON and malformed fields
- 404 and 410
- network failures with retry and the offline cache
- 429 short and long, exhausted `X-Ratelimit` windows, our own budget
- truncated and padded downloads, hash mismatch, not-a-jar, damaged zip, jar metadata for the wrong
  loader
- path traversal and hostile file names (Windows device names, bidi tricks, separators)
- zip-slip and zip bombs
- symlinks
- the URL allow-list
- the CurseForge not-configured and opt-out paths

`LiveModrinthTest` runs the whole path against the real Modrinth API and CDN when `MODRINTH_LIVE=1`.
CI sets that on every OS.

The site's `npm run check:curseforge` covers:

- the relay without a key
- parameter validation (nothing bad reaches CurseForge)
- the key upstream-only, never echoed or logged
- mapping and opt-out handling
- CurseForge 429, 403, 500, a garbled body, and network errors
- caching
- the per-address budget

CI (`.github/workflows/launcher-mods.yml`) runs the module on Linux, Windows, macOS on Apple
Silicon (`macos-latest`) and macOS on Intel (`macos-15-intel`), plus the site's typecheck and checks.

## 9. Not done yet

- **CurseForge downloads:** waiting on CurseForge's answer (§0).
- **The Compose page itself:** it depends on the launcher's theme and components, which weren't
  available. `ModBrowser` holds all the logic and strings, so the page is layout only.
- **Modpacks, resource packs and shaders:** the module installs mods. `SafeZip` (safe extraction
  with limits) is there and tested for when packs are added.
- **Server-side mod detection** (client-only vs server-only) isn't used to filter yet.
