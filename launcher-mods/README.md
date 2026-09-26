# launcher-mods

The launcher's mod browser and installer for Modrinth and CurseForge, as a self-contained Kotlin/JVM
module. The design, the security boundaries and the CurseForge limits are in
[`../docs/mod-browser.md`](../docs/mod-browser.md).

## Build and test

```bash
cd launcher-mods
gradle test                      # 123 unit tests, no network
MODRINTH_LIVE=1 gradle test      # also the end-to-end test against the real Modrinth API
```

It needs JDK 21 and Gradle 8.14. Its only dependency is `kotlinx-serialization-json`, used for its
JSON tree API; there's no compiler plugin.

## Wiring it into the launcher

1. Copy `src/main/kotlin/catalyst/mods` into the launcher, or include this folder as a Gradle
   subproject. Add `org.jetbrains.kotlinx:kotlinx-serialization-json` if the launcher doesn't
   already have it.
2. Implement `InstanceProvider` over the launcher's own profiles (`list`, `get`, and `create` for
   the "Create Fabric Profile" button).
3. Build one `ModManager` at startup:

   ```kotlin
   val mods = ModManager(
       ModManagerConfig(
           userAgent = "amogus26/catalyst-launcher/${BuildInfo.VERSION} (support@your-domain)",
           backend = URI("https://catalyst-create.netlify.app/api/mods/curseforge"),
           cacheDir = launcherDataDir.resolve("cache/mods"),
       ),
       instances = LauncherInstances,
   )
   ```

4. Bind the Explore Mods page to `mods.browser`:
   - `search(query, profile)` returns cards and per-platform notices.
   - `prepareInstall` returns a `Ready` plan, or `Blocked` with a reason and an action.
   - `install(plan, progress)` installs the plan.
   - `checkUpdates`, `prepareUpdate` and `update` drive updates; `uninstall` drives Remove.

   All calls block, so run them off the UI thread.

The module never holds a CurseForge key and never talks to CurseForge directly. It only writes
inside the chosen instance's `mods/` and `.catalyst/` folders.
