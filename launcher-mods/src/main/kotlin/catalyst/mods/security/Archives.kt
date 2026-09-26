package catalyst.mods.security

import catalyst.mods.IntegrityException
import catalyst.mods.Loader
import catalyst.mods.UnsafePathException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardOpenOption
import java.util.zip.ZipException
import java.util.zip.ZipFile

/** What a downloaded jar says about itself. */
data class JarInfo(val loaders: Set<Loader>, val entryCount: Int)

/**
 * Checks a downloaded mod before it is placed in an instance. Mods are installed as the jar itself -
 * never unpacked and never run by the launcher - so this only has to establish that the file is a real,
 * well-formed zip with no hostile entry names, and which loader(s) its metadata is written for.
 */
object JarInspector {
    private const val MAX_ENTRIES = 100_000

    fun inspect(file: Path): JarInfo {
        Files.newInputStream(file, StandardOpenOption.READ).use { input ->
            val magic = input.readNBytes(4)
            if (magic.size < 4 || magic[0] != 'P'.code.toByte() || magic[1] != 'K'.code.toByte() ||
                magic[2] != 3.toByte() || magic[3] != 4.toByte()
            ) {
                throw IntegrityException("The download is not a Java mod file (.jar).")
            }
        }
        val loaders = mutableSetOf<Loader>()
        var count = 0
        try {
            ZipFile(file.toFile()).use { zip ->
                val seen = HashSet<String>()
                for (entry in zip.entries()) {
                    if (++count > MAX_ENTRIES) throw IntegrityException("The mod file has an implausible number of entries.")
                    val name = entry.name
                    if (!seen.add(name)) throw IntegrityException("The mod file contains duplicate entries.")
                    try {
                        SafePaths.entryPath(Path.of("jar-root"), name, portable = false)
                    } catch (e: UnsafePathException) {
                        throw IntegrityException("The mod file contains a malicious path and was rejected (${e.message}).")
                    }
                    when (name) {
                        "fabric.mod.json" -> loaders += Loader.FABRIC
                        "quilt.mod.json" -> loaders += Loader.QUILT
                        "META-INF/mods.toml" -> loaders += Loader.FORGE
                        "META-INF/neoforge.mods.toml" -> loaders += Loader.NEOFORGE
                        "mcmod.info" -> loaders += Loader.FORGE
                    }
                }
            }
        } catch (e: ZipException) {
            throw IntegrityException("The mod file is damaged and cannot be opened.")
        }
        if (count == 0) throw IntegrityException("The mod file is empty.")
        return JarInfo(loaders, count)
    }
}

/** Limits for [SafeZip.extract], sized for resource packs and modpack overrides. */
data class ExtractLimits(
    val maxEntries: Int = 20_000,
    val maxTotalBytes: Long = 2L * 1024 * 1024 * 1024,
    val maxEntryBytes: Long = 512L * 1024 * 1024,
    /** Uncompressed/compressed. Real archives stay far below this; zip bombs do not. */
    val maxRatio: Long = 200,
)

/**
 * Unpacking an archive without letting it write anywhere else. Not used for mods (see [JarInspector]);
 * kept here, tested, for resource packs, shader packs and modpack overrides.
 */
object SafeZip {
    fun extract(archive: Path, destination: Path, limits: ExtractLimits = ExtractLimits()): List<Path> {
        Files.createDirectories(destination)
        val written = mutableListOf<Path>()
        try {
            ZipFile(archive.toFile()).use { zip ->
                var total = 0L
                var count = 0
                for (entry in zip.entries()) {
                    if (++count > limits.maxEntries) throw IntegrityException("The archive has too many files.")
                    val target = SafePaths.entryPath(destination, entry.name)
                    if (entry.isDirectory) {
                        Files.createDirectories(target)
                        continue
                    }
                    Files.createDirectories(target.parent)
                    if (Files.isSymbolicLink(target.parent) || Files.exists(target)) {
                        throw UnsafePathException("The archive would overwrite or link outside its folder: ${entry.name}")
                    }
                    var entryBytes = 0L
                    zip.getInputStream(entry).use { input ->
                        Files.newOutputStream(target, StandardOpenOption.CREATE_NEW).use { out ->
                            written.add(target)
                            val buffer = ByteArray(64 * 1024)
                            while (true) {
                                val n = input.read(buffer)
                                if (n < 0) break
                                entryBytes += n
                                total += n
                                val compressed = entry.compressedSize.coerceAtLeast(1)
                                if (entryBytes > limits.maxEntryBytes || total > limits.maxTotalBytes ||
                                    (entryBytes > 1_000_000 && entryBytes / compressed > limits.maxRatio)
                                ) {
                                    throw IntegrityException("The archive expands far beyond its size and was rejected.")
                                }
                                out.write(buffer, 0, n)
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            written.asReversed().forEach { runCatching { Files.deleteIfExists(it) } }
            if (e is ZipException) throw IntegrityException("The archive is damaged and cannot be opened.")
            throw e
        }
        return written
    }
}
