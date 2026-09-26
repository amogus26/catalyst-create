package catalyst.mods

import catalyst.mods.compat.Compatibility
import catalyst.mods.compat.CompatibilityChecker
import catalyst.mods.compat.SuggestedAction
import catalyst.mods.instance.InstalledMod
import catalyst.mods.resolve.DependencyResolver
import catalyst.mods.resolve.Severity
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertTrue

class CompatibilityTest {
    private fun v(games: List<String>, loaders: Set<Loader>) = ModVersion(
        ProjectRef(Platform.MODRINTH, "AANobbMI"), "V0000001", "0.6.0", "0.6.0", Channel.RELEASE, games, loaders, Instant.EPOCH, emptyList(), emptyList(),
    )

    @Test
    fun `exact minecraft version and loader is compatible`(@TempDir dir: Path) {
        assertEquals(Compatibility.Compatible, CompatibilityChecker.check(instance(dir), v(listOf("1.21", "1.21.1"), setOf(Loader.FABRIC)), "Sodium"))
    }

    @Test
    fun `wrong loader is refused with a create-profile suggestion`(@TempDir dir: Path) {
        val forge = instance(dir, loader = Loader.FORGE)
        val c = assertIs<Compatibility.Incompatible>(CompatibilityChecker.check(forge, v(listOf("1.21.1"), setOf(Loader.FABRIC)), "Sodium"))
        assertEquals("Your profile uses Forge, but this version of Sodium requires Fabric.", c.reason)
        assertEquals(SuggestedAction.CreateProfile("1.21.1", Loader.FABRIC), c.action)
        assertEquals("Create Fabric Profile", (c.action as SuggestedAction.CreateProfile).label)
    }

    @Test
    fun `wrong minecraft version is refused, even a close one`(@TempDir dir: Path) {
        val c = CompatibilityChecker.check(instance(dir, gameVersion = "1.21.8"), v(listOf("1.21", "1.21.1"), setOf(Loader.FABRIC)), "Sodium")
        assertIs<Compatibility.Incompatible>(c)
        assertTrue("1.21.x" in c.reason && "1.21.8" in c.reason, c.reason)
    }

    @Test
    fun `forge and neoforge are not interchangeable`(@TempDir dir: Path) {
        assertIs<Compatibility.Incompatible>(CompatibilityChecker.check(instance(dir, loader = Loader.NEOFORGE), v(listOf("1.21.1"), setOf(Loader.FORGE)), "X"))
        assertIs<Compatibility.Incompatible>(CompatibilityChecker.check(instance(dir, loader = Loader.FORGE), v(listOf("1.21.1"), setOf(Loader.NEOFORGE)), "X"))
    }

    @Test
    fun `fabric mods on quilt are allowed with a warning`(@TempDir dir: Path) {
        assertIs<Compatibility.CompatibleWithWarning>(CompatibilityChecker.check(instance(dir, loader = Loader.QUILT), v(listOf("1.21.1"), setOf(Loader.FABRIC)), "X"))
        assertIs<Compatibility.Incompatible>(CompatibilityChecker.check(instance(dir, loader = Loader.FABRIC), v(listOf("1.21.1"), setOf(Loader.QUILT)), "X"))
    }

    @Test
    fun `a vanilla profile takes no mods`(@TempDir dir: Path) {
        val c = assertIs<Compatibility.Incompatible>(CompatibilityChecker.check(instance(dir, loader = null), v(listOf("1.21.1"), setOf(Loader.FABRIC)), "X"))
        assertEquals(SuggestedAction.CreateProfile("1.21.1", Loader.FABRIC), c.action)
    }

    @Test
    fun `game versions are summarised for cards`() {
        assertEquals("1.21.x", CompatibilityChecker.summarize(listOf("1.21", "1.21.1", "1.21.4")))
        assertEquals("1.21.x, 1.20.1", CompatibilityChecker.summarize(listOf("1.20.1", "1.21.1", "1.21.10")))
        assertTrue(CompatibilityChecker.versionKey("1.21.10") > CompatibilityChecker.versionKey("1.21.9"))
    }
}

class ResolverTest {
    private val transport = FakeTransport()
    private val world = FakeModrinth(transport)

    private fun resolver(dir: Path) = DependencyResolver(testManager(dir, transport).sources)

    private fun installedMod(id: String, name: String, sha1: String = "0".repeat(40), incompatibleWith: Set<String> = emptySet()) =
        InstalledMod(ProjectRef(Platform.MODRINTH, id), name, "OLD00000", "1.0", "$name.jar", 1, sha1, null, true, emptySet(), incompatibleWith, 0)

    private fun root(dir: Path, deps: String = "[]", loaders: List<String> = listOf("fabric")): ModVersion {
        world.project("AANobbMI", "Sodium", loaders = loaders)
        world.version("AANobbMI", "SODIUM01", "0.6.0", deps = deps, loaders = loaders)
        return testManager(dir, transport).sources.getValue(Platform.MODRINTH).version("AANobbMI", "SODIUM01")
    }

    @Test
    fun `required dependencies are resolved and listed`(@TempDir dir: Path) {
        world.project("P7dR8mSH", "Fabric API")
        world.version("P7dR8mSH", "FAPI0001", "0.102.0")
        val plan = resolver(dir).resolve(instance(dir), root(dir, "[${req("P7dR8mSH")}]"), "Sodium", emptyList())
        assertTrue(plan.canInstall, plan.problems.toString())
        assertEquals(listOf("Sodium", "Fabric API"), plan.mods.map { it.name })
        assertEquals("Sodium", plan.mods[1].requiredByName)
        assertEquals("Install 2 mods", plan.buttonLabel)
    }

    @Test
    fun `dependencies of dependencies are followed, and cycles only once`(@TempDir dir: Path) {
        world.project("AAAAAAA1", "Lib A")
        world.project("AAAAAAA2", "Lib B")
        world.version("AAAAAAA1", "LIBA0001", "1", deps = "[${req("AAAAAAA2")}]")
        world.version("AAAAAAA2", "LIBB0001", "1", deps = "[${req("AAAAAAA1")},${req("AANobbMI")}]")
        val plan = resolver(dir).resolve(instance(dir), root(dir, "[${req("AAAAAAA1")}]"), "Sodium", emptyList())
        assertTrue(plan.canInstall, plan.problems.toString())
        assertEquals(listOf("Sodium", "Lib A", "Lib B"), plan.mods.map { it.name })
    }

    @Test
    fun `optional dependencies are offered, and installed only when ticked`(@TempDir dir: Path) {
        world.project("YL57xq9U", "Iris")
        world.version("YL57xq9U", "IRIS0001", "1.8.0")
        val r = root(dir, "[${opt("YL57xq9U")}]")
        val plan = resolver(dir).resolve(instance(dir), r, "Sodium", emptyList())
        assertEquals(listOf("Sodium"), plan.mods.map { it.name })
        assertEquals("Iris", plan.optional.single().name)
        val ticked = resolver(dir).resolve(instance(dir), r, "Sodium", emptyList(), chosenOptional = setOf(ProjectRef(Platform.MODRINTH, "YL57xq9U")))
        assertEquals(listOf("Sodium", "Iris"), ticked.mods.map { it.name })
        assertTrue(ticked.optional.isEmpty())
    }

    @Test
    fun `a pinned dependency for another minecraft version falls back to one that fits`(@TempDir dir: Path) {
        world.project("P7dR8mSH", "Fabric API")
        world.version("P7dR8mSH", "FAPIOLD1", "0.90.0", gameVersions = listOf("1.20.1"), published = "2025-01-01T00:00:00Z")
        world.version("P7dR8mSH", "FAPINEW1", "0.102.0")
        val plan = resolver(dir).resolve(instance(dir), root(dir, """[{"project_id":"P7dR8mSH","version_id":"FAPIOLD1","dependency_type":"required"}]"""), "Sodium", emptyList())
        assertEquals("FAPINEW1", plan.mods[1].version.versionId)
    }

    @Test
    fun `a required dependency with no compatible version blocks the install`(@TempDir dir: Path) {
        world.project("P7dR8mSH", "Fabric API")
        world.version("P7dR8mSH", "FAPIOLD1", "0.90.0", gameVersions = listOf("1.20.1"))
        val plan = resolver(dir).resolve(instance(dir), root(dir, "[${req("P7dR8mSH")}]"), "Sodium", emptyList())
        assertFalse(plan.canInstall)
        assertTrue("has no version for Minecraft 1.21.1" in plan.blockers.single().message, plan.blockers.toString())
    }

    @Test
    fun `a dependency that is only a file name is warned about`(@TempDir dir: Path) {
        val plan = resolver(dir).resolve(instance(dir), root(dir, """[{"file_name":"secret-lib.jar","dependency_type":"required"}]"""), "Sodium", emptyList())
        assertTrue(plan.canInstall)
        assertTrue("secret-lib.jar" in plan.warnings.single().message)
    }

    @Test
    fun `dependencies already installed are reused, not downloaded again`(@TempDir dir: Path) {
        world.project("P7dR8mSH", "Fabric API")
        world.version("P7dR8mSH", "FAPI0001", "0.102.0")
        val plan = resolver(dir).resolve(instance(dir), root(dir, "[${req("P7dR8mSH")}]"), "Sodium", listOf(installedMod("P7dR8mSH", "Fabric API")))
        assertEquals(listOf("Sodium"), plan.mods.map { it.name })
        assertEquals(setOf("modrinth:AANobbMI"), plan.reusedDependencies["modrinth:P7dR8mSH"])
    }

    @Test
    fun `wrong loader blocks with a reason and a suggested action`(@TempDir dir: Path) {
        val plan = resolver(dir).resolve(instance(dir, loader = Loader.FORGE), root(dir), "Sodium", emptyList())
        val blocker = plan.blockers.single()
        assertEquals("⚠ Your profile uses Forge, but this version of Sodium requires Fabric.", blocker.message)
        assertEquals(SuggestedAction.CreateProfile("1.21.1", Loader.FABRIC), blocker.action)
    }

    @Test
    fun `wrong minecraft version blocks`(@TempDir dir: Path) {
        assertFalse(resolver(dir).resolve(instance(dir, gameVersion = "1.20.1"), root(dir), "Sodium", emptyList()).canInstall)
    }

    @Test
    fun `installing a mod that is already there is refused`(@TempDir dir: Path) {
        val plan = resolver(dir).resolve(instance(dir), root(dir), "Sodium", listOf(installedMod("AANobbMI", "Sodium")))
        assertTrue("already installed" in plan.blockers.single().message)
    }

    @Test
    fun `the same file from the other platform is caught by hash`(@TempDir dir: Path) {
        val r = root(dir)
        val sameFile = InstalledMod(ProjectRef(Platform.CURSEFORGE, "394468"), "Sodium", "5555", "0.6.0", "s.jar", 1, r.primaryFile!!.sha1, null, true, emptySet(), emptySet(), 0)
        val plan = resolver(dir).resolve(instance(dir), r, "Sodium", listOf(sameFile))
        assertTrue("already installed" in plan.blockers.single().message && "CurseForge" in plan.blockers.single().message)
    }

    @Test
    fun `the same mod by name from the other platform is warned about`(@TempDir dir: Path) {
        val other = InstalledMod(ProjectRef(Platform.CURSEFORGE, "394468"), "Sodium", "5555", "0.5", "s.jar", 1, "f".repeat(40), null, true, emptySet(), emptySet(), 0)
        val plan = resolver(dir).resolve(instance(dir), root(dir), "Sodium", listOf(other))
        assertTrue(plan.canInstall)
        assertEquals(Severity.WARNING, plan.problems.single().severity)
    }

    @Test
    fun `a mod that declares an installed mod incompatible is blocked`(@TempDir dir: Path) {
        val plan = resolver(dir).resolve(instance(dir), root(dir, "[${incompatible("OPTIFINE")}]"), "Sodium", listOf(installedMod("OPTIFINE", "OptiFabric")))
        assertEquals("Sodium cannot be used together with OptiFabric.", plan.blockers.single().message)
    }

    @Test
    fun `an installed mod that declared the new one incompatible also blocks`(@TempDir dir: Path) {
        val plan = resolver(dir).resolve(
            instance(dir), root(dir), "Sodium",
            listOf(installedMod("RUBIDIUM", "Rubidium", incompatibleWith = setOf("modrinth:AANobbMI"))),
        )
        assertTrue("Rubidium (installed) cannot be used together with Sodium" in plan.blockers.single().message)
    }

    @Test
    fun `two new mods that conflict with each other block`(@TempDir dir: Path) {
        world.project("AAAAAAA1", "Lib A")
        world.version("AAAAAAA1", "LIBA0001", "1", deps = "[${incompatible("AANobbMI")}]")
        val plan = resolver(dir).resolve(instance(dir), root(dir, "[${req("AAAAAAA1")}]"), "Sodium", emptyList())
        assertTrue(plan.blockers.any { "cannot be used together" in it.message })
    }

    @Test
    fun `a dependency graph that grows without end is capped`(@TempDir dir: Path) {
        for (i in 1..10) {
            val id = "CHAIN%03d".format(i)
            world.project(id, "Chain $i")
            world.version(id, "CHAINV%02d".format(i), "1", deps = if (i < 10) "[${req("CHAIN%03d".format(i + 1))}]" else "[]")
        }
        val capped = DependencyResolver(testManager(dir, transport).sources, maxMods = 5)
        val plan = capped.resolve(instance(dir), root(dir, "[${req("CHAIN001")}]"), "Sodium", emptyList())
        assertFalse(plan.canInstall)
        assertTrue("more than 5 mods" in plan.blockers.single().message)
    }
}
