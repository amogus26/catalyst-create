package catalyst.mods

import catalyst.mods.browser.CardState
import catalyst.mods.browser.InstallPrompt
import catalyst.mods.browser.ModBrowser
import catalyst.mods.compat.SuggestedAction
import catalyst.mods.instance.InstalledMods
import catalyst.mods.instance.Instance
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.listDirectoryEntries
import kotlin.io.path.name
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertTrue

class InstallerTest {
    private val transport = FakeTransport()
    private val world = FakeModrinth(transport)

    private fun sodiumWithFabricApi(fabricApiJar: ByteArray = Jars.fabric("fabric-api"), fapiSha512: String? = null, fapiSize: Long? = null) {
        world.project("AANobbMI", "Sodium")
        world.project("P7dR8mSH", "Fabric API")
        world.version("P7dR8mSH", "FAPI0001", "0.102.0", jar = fabricApiJar, sha512Override = fapiSha512, sizeOverride = fapiSize)
        world.version("AANobbMI", "SODIUM01", "0.6.0", deps = "[${req("P7dR8mSH")}]")
    }

    private fun ready(browser: ModBrowser, profile: Instance, id: String = "AANobbMI", name: String = "Sodium") =
        assertIs<InstallPrompt.Ready>(browser.prepareInstall(profile, ProjectRef(Platform.MODRINTH, id), name))

    private fun jars(profile: Instance) = if (Files.exists(profile.modsDir)) profile.modsDir.listDirectoryEntries().map { it.name }.sorted() else emptyList()

    /** Nothing but the mods folder and the launcher's own state folder, and no staging left over. */
    private fun assertClean(profile: Instance) {
        val staging = profile.stateDir.resolve("staging")
        if (Files.exists(staging)) assertTrue(staging.listDirectoryEntries().isEmpty(), "staging was cleaned up")
        val backup = profile.stateDir.resolve("backup")
        if (Files.exists(backup)) assertTrue(backup.listDirectoryEntries().isEmpty(), "backups were cleaned up")
    }

    @Test
    fun `install puts the mod and its dependency into that instance's mods folder`(@TempDir dir: Path) {
        sodiumWithFabricApi()
        val m = testManager(dir, transport)
        val profile = instance(dir)
        val prompt = ready(m.browser, profile)
        assertEquals("Sodium", prompt.title)
        assertEquals(listOf("Fabric API - required by Sodium"), prompt.lines)
        assertEquals("Install 2 mods", prompt.buttonLabel)

        m.browser.install(prompt.plan)
        assertEquals(listOf("AANobbMI-0.6.0.jar", "P7dR8mSH-0.102.0.jar"), jars(profile))
        assertContentEquals(world.jarBytes.getValue("SODIUM01"), Files.readAllBytes(profile.modsDir.resolve("AANobbMI-0.6.0.jar")))
        val record = InstalledMods(profile).load().associateBy { it.name }
        assertTrue(record.getValue("Sodium").explicit)
        assertFalse(record.getValue("Fabric API").explicit)
        assertEquals(setOf("modrinth:AANobbMI"), record.getValue("Fabric API").requiredBy)
        assertClean(profile)
    }

    @Test
    fun `a second instance is not touched`(@TempDir dir: Path) {
        sodiumWithFabricApi()
        val m = testManager(dir, transport)
        val pvp = instance(dir)
        val other = Instance("other", "1.21.1 Fabric Survival", "1.21.1", Loader.FABRIC, null, Files.createDirectories(dir.resolve("other")))
        m.browser.install(ready(m.browser, pvp).plan)
        assertTrue(jars(other).isEmpty())
    }

    @Test
    fun `a hash mismatch installs nothing at all`(@TempDir dir: Path) {
        sodiumWithFabricApi(fapiSha512 = "0".repeat(128))
        val m = testManager(dir, transport)
        val profile = instance(dir)
        val e = assertFailsWith<IntegrityException> { m.browser.install(ready(m.browser, profile).plan) }
        assertTrue("checksum" in e.message!!)
        assertTrue(jars(profile).isEmpty(), "Sodium was verified but must not be installed without its dependency")
        assertTrue(InstalledMods(profile).load().isEmpty())
        assertClean(profile)
    }

    @Test
    fun `a truncated or padded download is caught by size`(@TempDir dir: Path) {
        val jar = Jars.fabric("fabric-api")
        sodiumWithFabricApi(fabricApiJar = jar, fapiSize = jar.size + 10L)
        val m = testManager(dir, transport)
        val profile = instance(dir)
        assertFailsWith<IntegrityException> { m.browser.install(ready(m.browser, profile).plan) }
        assertTrue(jars(profile).isEmpty())

        val m2 = testManager(dir, transport)
        world.version("P7dR8mSH", "FAPI0002", "0.102.1", jar = jar, sizeOverride = jar.size - 10L)
        assertFailsWith<IntegrityException> { m2.browser.install(ready(m2.browser, profile).plan) }
        assertTrue(jars(profile).isEmpty())
    }

    @Test
    fun `a corrupted file that is not a jar is rejected even with a matching hash`(@TempDir dir: Path) {
        sodiumWithFabricApi(fabricApiJar = "this is an error page".toByteArray())
        val m = testManager(dir, transport)
        val profile = instance(dir)
        assertFailsWith<IntegrityException> { m.browser.install(ready(m.browser, profile).plan) }
        assertTrue(jars(profile).isEmpty())
    }

    @Test
    fun `a jar whose own metadata says forge is refused on a fabric profile`(@TempDir dir: Path) {
        world.project("AANobbMI", "Sodium")
        world.version("AANobbMI", "SODIUM01", "0.6.0", jar = Jars.forge("sodium"))
        val m = testManager(dir, transport)
        val profile = instance(dir)
        val e = assertFailsWith<IntegrityException> { m.browser.install(ready(m.browser, profile).plan) }
        assertTrue("built for Forge, not Fabric" in e.message!!, e.message)
    }

    @Test
    fun `a network failure mid-way leaves the instance as it was`(@TempDir dir: Path) {
        sodiumWithFabricApi()
        val url = transport.let { "https://cdn.modrinth.com/data/P7dR8mSH/versions/FAPI0001/P7dR8mSH-0.102.0.jar" }
        transport.fileFails(url) { throw NetworkException("connection reset") }
        val m = testManager(dir, transport)
        val profile = instance(dir)
        assertFailsWith<NetworkException> { m.browser.install(ready(m.browser, profile).plan) }
        assertTrue(jars(profile).isEmpty())
        assertClean(profile)
    }

    @Test
    fun `a file name from the api that climbs out of the folder is refused and nothing is written`(@TempDir dir: Path) {
        world.project("AANobbMI", "Sodium")
        world.version("AANobbMI", "SODIUM01", "0.6.0", fileName = "../../../evil.jar")
        val m = testManager(dir, transport)
        val profile = instance(dir)
        assertFailsWith<UnsafePathException> { m.browser.install(ready(m.browser, profile).plan) }
        assertFalse(Files.exists(dir.resolve("evil.jar")))
        assertFalse(Files.exists(profile.gameDir.resolve("evil.jar")))
        assertTrue(transport.downloads.isEmpty(), "refused before downloading")
    }

    @Test
    fun `a download address off modrinth's cdn is refused`(@TempDir dir: Path) {
        world.project("AANobbMI", "Sodium")
        world.version("AANobbMI", "SODIUM01", "0.6.0")
        val evil = world.versionJson("SODIUM01").replace(Regex("\"url\":\"[^\"]+\""), "\"url\":\"https://evil.example/sodium.jar\"")
        transport.json("GET", "/v2/project/AANobbMI/version", "[$evil]")
        val m = testManager(dir, transport)
        assertFailsWith<UnsafeUrlException> { m.browser.install(ready(m.browser, instance(dir)).plan) }
    }

    @Test
    fun `a file the player put there by hand is never overwritten`(@TempDir dir: Path) {
        world.project("AANobbMI", "Sodium")
        world.version("AANobbMI", "SODIUM01", "0.6.0")
        val m = testManager(dir, transport)
        val profile = instance(dir)
        Files.createDirectories(profile.modsDir)
        Files.writeString(profile.modsDir.resolve("AANobbMI-0.6.0.jar"), "mine")
        assertFailsWith<InstallException> { m.browser.install(ready(m.browser, profile).plan) }
        assertEquals("mine", Files.readString(profile.modsDir.resolve("AANobbMI-0.6.0.jar")))
    }

    @Test
    fun `installing twice is refused`(@TempDir dir: Path) {
        sodiumWithFabricApi()
        val m = testManager(dir, transport)
        val profile = instance(dir)
        val plan = ready(m.browser, profile).plan
        m.browser.install(plan)
        assertIs<InstallPrompt.Blocked>(m.browser.prepareInstall(profile, ProjectRef(Platform.MODRINTH, "AANobbMI"), "Sodium"))
        assertFailsWith<InstallException> { m.browser.install(plan) }
        assertEquals(2, jars(profile).size)
    }

    @Test
    fun `wrong loader gives the cannot-install screen with a create-profile button`(@TempDir dir: Path) {
        sodiumWithFabricApi()
        val m = testManager(dir, transport)
        val forge = instance(dir, loader = Loader.FORGE)
        val blocked = assertIs<InstallPrompt.Blocked>(m.browser.prepareInstall(forge, ProjectRef(Platform.MODRINTH, "AANobbMI"), "Sodium"))
        assertEquals("Cannot install Sodium", blocked.title)
        assertEquals("Your profile uses Forge, but this version of Sodium requires Fabric.", blocked.reason)
        val action = assertIs<SuggestedAction.CreateProfile>(blocked.action)
        val created = m.browser.createProfile(action)
        assertEquals(Loader.FABRIC, created.loader)
        assertEquals("1.21.1", created.gameVersion)
        assertTrue(jars(forge).isEmpty())
    }

    @Test
    fun `uninstall removes the mod and dependencies nothing else needs, and leaves hand-added files`(@TempDir dir: Path) {
        sodiumWithFabricApi()
        val m = testManager(dir, transport)
        val profile = instance(dir)
        m.browser.install(ready(m.browser, profile).plan)
        Files.writeString(profile.modsDir.resolve("my-own-mod.jar"), "hand added")
        Files.createDirectories(profile.gameDir.resolve("config")).resolve("sodium-options.json").let { Files.writeString(it, "{}") }

        val result = m.browser.uninstall(profile, ProjectRef(Platform.MODRINTH, "AANobbMI"))
        assertEquals(listOf("Sodium", "Fabric API"), result.removed)
        assertEquals(listOf("my-own-mod.jar"), jars(profile))
        assertTrue(Files.exists(profile.gameDir.resolve("config/sodium-options.json")), "config is kept")
        assertTrue(InstalledMods(profile).load().isEmpty())
    }

    @Test
    fun `a dependency another mod needs is not removed without force`(@TempDir dir: Path) {
        sodiumWithFabricApi()
        val m = testManager(dir, transport)
        val profile = instance(dir)
        m.browser.install(ready(m.browser, profile).plan)
        val e = assertFailsWith<InstallException> { m.browser.uninstall(profile, ProjectRef(Platform.MODRINTH, "P7dR8mSH")) }
        assertEquals("Fabric API is needed by Sodium. Remove those first.", e.message)
        m.browser.uninstall(profile, ProjectRef(Platform.MODRINTH, "P7dR8mSH"), force = true)
        assertEquals(listOf("AANobbMI-0.6.0.jar"), jars(profile))
    }

    @Test
    fun `updates are found, installed over the old version, and keep config`(@TempDir dir: Path) {
        sodiumWithFabricApi()
        val m = testManager(dir, transport)
        val profile = instance(dir)
        m.browser.install(ready(m.browser, profile).plan)
        Files.createDirectories(profile.gameDir.resolve("config")).resolve("sodium-options.json").let { Files.writeString(it, """{"fps":999}""") }

        world.version("AANobbMI", "SODIUM02", "0.6.5", deps = "[${req("P7dR8mSH")}]", jar = Jars.fabric("sodium-new"))
        val oldSha1 = InstalledMods(profile).load().first { it.name == "Sodium" }.sha1!!
        transport.json("POST", "/v2/version_files/update", """{"$oldSha1":${world.versionJson("SODIUM02")}}""")

        val report = m.browser.checkUpdates(profile)
        val candidate = report.updates.single()
        assertEquals("0.6.0", candidate.installed.versionNumber)
        assertEquals("0.6.5", candidate.latest.versionNumber)

        val prompt = assertIs<InstallPrompt.Ready>(m.browser.prepareUpdate(profile, candidate))
        assertEquals("Update", prompt.buttonLabel)
        m.browser.update(prompt.plan)
        assertEquals(listOf("AANobbMI-0.6.5.jar", "P7dR8mSH-0.102.0.jar"), jars(profile))
        val sodium = InstalledMods(profile).load().first { it.name == "Sodium" }
        assertEquals("0.6.5", sodium.versionNumber)
        assertTrue(sodium.explicit)
        assertEquals("""{"fps":999}""", Files.readString(profile.gameDir.resolve("config/sodium-options.json")))
        assertClean(profile)
    }

    @Test
    fun `a failed update leaves the working version in place`(@TempDir dir: Path) {
        sodiumWithFabricApi()
        val m = testManager(dir, transport)
        val profile = instance(dir)
        m.browser.install(ready(m.browser, profile).plan)
        val before = Files.readAllBytes(profile.modsDir.resolve("AANobbMI-0.6.0.jar"))

        world.version("AANobbMI", "SODIUM02", "0.6.5", deps = "[${req("P7dR8mSH")}]", jar = Jars.fabric("sodium-new"), sha512Override = "1".repeat(128))
        val oldSha1 = InstalledMods(profile).load().first { it.name == "Sodium" }.sha1!!
        transport.json("POST", "/v2/version_files/update", """{"$oldSha1":${world.versionJson("SODIUM02")}}""")
        val prompt = assertIs<InstallPrompt.Ready>(m.browser.prepareUpdate(profile, m.browser.checkUpdates(profile).updates.single()))
        assertFailsWith<IntegrityException> { m.browser.update(prompt.plan) }

        assertEquals(listOf("AANobbMI-0.6.0.jar", "P7dR8mSH-0.102.0.jar"), jars(profile))
        assertContentEquals(before, Files.readAllBytes(profile.modsDir.resolve("AANobbMI-0.6.0.jar")))
        assertEquals("0.6.0", InstalledMods(profile).load().first { it.name == "Sodium" }.versionNumber)
        assertClean(profile)
    }

    @Test
    fun `an update to a version for another loader is not offered`(@TempDir dir: Path) {
        sodiumWithFabricApi()
        val m = testManager(dir, transport)
        val profile = instance(dir)
        m.browser.install(ready(m.browser, profile).plan)
        world.version("AANobbMI", "SODIUM03", "0.7.0", loaders = listOf("neoforge"), jar = Jars.forge("s"))
        val oldSha1 = InstalledMods(profile).load().first { it.name == "Sodium" }.sha1!!
        transport.json("POST", "/v2/version_files/update", """{"$oldSha1":${world.versionJson("SODIUM03")}}""")
        assertTrue(m.browser.checkUpdates(profile).updates.isEmpty())
    }
}

class BrowserTest {
    private val transport = FakeTransport()

    @Test
    fun `all-platform search shows modrinth results and a notice while curseforge is off`(@TempDir dir: Path) {
        transport.json("GET", "/v2/search", """{"hits":[${HIT_JSON}],"offset":0,"limit":20,"total_hits":1}""")
        transport.json("GET", "/api/mods/curseforge/search", """{"error":"not_configured","message":"CurseForge is not switched on yet."}""", status = 503)
        val m = testManager(dir, transport)
        val result = m.browser.search(SearchQuery("sodium"), instance(dir))
        assertEquals(listOf("Sodium"), result.cards.map { it.summary.name })
        assertEquals("CurseForge is not switched on yet.", result.notices[Platform.CURSEFORGE])
        val card = result.cards.single()
        assertEquals("Modrinth", card.platformLabel)
        assertEquals("Fabric", card.loaderLabel)
        assertEquals("Minecraft 1.21.1", card.versionLabel)
        assertEquals("55M", card.downloadsLabel)
        assertEquals(CardState.Installable, card.state)
    }

    @Test
    fun `the profile fills in the version and loader filters`(@TempDir dir: Path) {
        transport.json("GET", "/v2/search", """{"hits":[],"offset":0,"limit":20,"total_hits":0}""")
        testManager(dir, transport, backend = false).browser.search(SearchQuery("x"), instance(dir, gameVersion = "1.21.8", loader = Loader.NEOFORGE))
        val q = java.net.URLDecoder.decode(transport.requests.single().uri.rawQuery, Charsets.UTF_8)
        assertTrue("versions:1.21.8" in q && "categories:neoforge" in q, q)
    }

    @Test
    fun `cards flag mods that will not fit the profile`(@TempDir dir: Path) {
        transport.json("GET", "/v2/search", """{"hits":[${HIT_JSON}],"offset":0,"limit":20,"total_hits":1}""")
        val m = testManager(dir, transport, backend = false)
        val card = m.browser.search(SearchQuery("sodium", gameVersion = "1.21.1", loader = Loader.FABRIC), instance(dir, loader = Loader.FORGE)).cards.single()
        assertIs<CardState.ProbablyIncompatible>(card.state)
    }

    @Test
    fun `merging by downloads interleaves both platforms by count`() {
        fun s(name: String, p: Platform, d: Long) = ModSummary(ProjectRef(p, name), null, name, null, "", null, d, emptyList(), emptySet(), emptyList(), null)
        val merged = ModBrowser.merge(
            listOf(listOf(s("a", Platform.MODRINTH, 10), s("b", Platform.MODRINTH, 1)), listOf(s("c", Platform.CURSEFORGE, 5))),
            SortBy.DOWNLOADS,
        )
        assertEquals(listOf("a", "c", "b"), merged.map { it.name })
        assertEquals(listOf("a", "c", "b"), ModBrowser.merge(listOf(listOf(s("a", Platform.MODRINTH, 1), s("b", Platform.MODRINTH, 1)), listOf(s("c", Platform.CURSEFORGE, 1))), SortBy.RELEVANCE).map { it.name })
        assertEquals("1.2M", ModBrowser.compact(1_234_567))
        assertEquals("999", ModBrowser.compact(999))
    }

    private companion object {
        const val HIT_JSON = """{"project_id":"AANobbMI","project_type":"mod","slug":"sodium","title":"Sodium","description":"Fast",
          "author":"jellysquid3","categories":["fabric","optimization"],"display_categories":["fabric","optimization"],
          "versions":["1.21","1.21.1"],"downloads":55000000,"follows":1,"icon_url":"https://cdn.modrinth.com/data/AANobbMI/icon.png",
          "date_modified":"2026-09-01T00:00:00Z"}"""
    }
}
