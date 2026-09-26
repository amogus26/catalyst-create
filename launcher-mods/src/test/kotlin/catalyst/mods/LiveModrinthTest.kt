package catalyst.mods

import catalyst.mods.browser.InstallPrompt
import catalyst.mods.instance.InstalledMods
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.listDirectoryEntries
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

/**
 * The whole path against the real Modrinth API and CDN, with the real HTTPS transport: search, pick,
 * resolve, download, verify, install, uninstall. A handful of requests, so it stays far inside the
 * rate limit. Off by default (unit tests never touch the network); CI turns it on with MODRINTH_LIVE=1.
 */
@EnabledIfEnvironmentVariable(named = "MODRINTH_LIVE", matches = "1")
class LiveModrinthTest {
    @Test
    fun `search, install and remove sodium on a real fabric profile`(@TempDir dir: Path) {
        val manager = ModManager(
            ModManagerConfig("amogus26/catalyst-launcher-mods/0.1.0 (ci; github.com/amogus26/catalyst-create)", backend = null, cacheDir = dir.resolve("cache")),
            FakeInstances(dir),
        )
        val profile = instance(dir, gameVersion = "1.21.1", loader = Loader.FABRIC)

        val result = manager.browser.search(SearchQuery("sodium", platforms = setOf(Platform.MODRINTH)), profile)
        val sodium = result.cards.first { it.summary.slug == "sodium" }
        assertEquals("Modrinth", sodium.platformLabel)
        assertTrue((sodium.summary.downloads ?: 0) > 1_000_000)

        val prompt = assertIs<InstallPrompt.Ready>(manager.browser.prepareInstall(profile, sodium.summary.ref, sodium.summary.name))
        manager.browser.install(prompt.plan)
        val installed = InstalledMods(profile).load()
        assertTrue(installed.any { it.ref == sodium.summary.ref })
        assertEquals(installed.size, profile.modsDir.listDirectoryEntries("*.jar").size)

        manager.browser.uninstall(profile, sodium.summary.ref)
        assertTrue(profile.modsDir.listDirectoryEntries("*.jar").isEmpty())
        assertTrue(Files.exists(dir.resolve("cache")))
    }
}
