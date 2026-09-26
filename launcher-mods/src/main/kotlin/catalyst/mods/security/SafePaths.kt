package catalyst.mods.security

import catalyst.mods.UnsafePathException
import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.Path
import java.text.Normalizer

/**
 * File names and paths from API responses, made safe to write - or refused.
 *
 * A mod's file name comes from the API and becomes a file in the player's instance. Names are *refused*
 * rather than "cleaned": silently rewriting `../../x.jar` into something else could collide with a real
 * file, and a platform that sends a name like that is not one to trust with the download either.
 * The rules cover Windows and macOS as well as Linux, since the launcher ships on all three.
 */
object SafePaths {
    private val windowsReserved = Regex("^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\\..*)?$", RegexOption.IGNORE_CASE)
    private const val forbidden = "/\\:*?\"<>|"
    private const val MAX_NAME_BYTES = 200

    /** Returns [raw] if it is a plain, portable file name ending in one of [extensions]; throws otherwise. */
    fun fileName(raw: String, extensions: Set<String> = setOf(".jar")): String {
        val name = Normalizer.normalize(raw, Normalizer.Form.NFC)
        fun refuse(why: String): Nothing = throw UnsafePathException("Refusing the file name \"${printable(raw)}\": $why.")
        if (name.isEmpty()) refuse("it is empty")
        if (name.toByteArray(Charsets.UTF_8).size > MAX_NAME_BYTES) refuse("it is too long")
        if (name.any { it in forbidden }) refuse("it contains a path separator or a character Windows does not allow")
        if (name.any { it.isISOControl() || it.code in 0x202A..0x202E || it.code in 0x2066..0x2069 }) {
            refuse("it contains control or text-direction characters")
        }
        if (name.startsWith(".")) refuse("it is hidden or a relative path")
        if (name.endsWith(".") || name.endsWith(" ")) refuse("it ends with a dot or a space")
        if (name.trim() != name) refuse("it starts with a space")
        if (windowsReserved.matches(name)) refuse("it is a reserved device name on Windows")
        if (extensions.none { name.lowercase().endsWith(it) }) refuse("it is not a ${extensions.joinToString("/")} file")
        return name
    }

    /**
     * Where [fileName] goes inside [dir], checked to really be a direct child of it: no traversal, no
     * absolute path, and no symbolic link standing in for the directory or the file.
     */
    fun childOf(dir: Path, fileName: String, extensions: Set<String> = setOf(".jar")): Path {
        val safeName = fileName(fileName, extensions)
        val root = dir.toAbsolutePath().normalize()
        val target = root.resolve(safeName).normalize()
        if (target.parent != root || target.fileName.toString() != safeName) {
            throw UnsafePathException("Refusing to write outside the instance's folder.")
        }
        if (Files.exists(root)) {
            val real = root.toRealPath()
            if (Files.isSymbolicLink(target)) throw UnsafePathException("Refusing to write through a link: $safeName")
            if (Files.exists(target, LinkOption.NOFOLLOW_LINKS) && target.toRealPath().parent != real) {
                throw UnsafePathException("Refusing to write outside the instance's folder.")
            }
        }
        return target
    }

    /**
     * For archive entries: a relative path whose every part is safe, resolved and re-checked under [root].
     * [portable] also refuses names Windows cannot hold; it is off when a jar is only being inspected,
     * since a Java package called `aux` is harmless in a file nobody unpacks.
     */
    fun entryPath(root: Path, entryName: String, portable: Boolean = true): Path {
        val normalizedRoot = root.toAbsolutePath().normalize()
        val cleaned = entryName.replace('\\', '/')
        if (cleaned.startsWith("/") || Regex("^[A-Za-z]:").containsMatchIn(cleaned)) {
            throw UnsafePathException("Archive entry \"${printable(entryName)}\" is an absolute path.")
        }
        val parts = cleaned.split('/').filter { it.isNotEmpty() }
        if (parts.isEmpty()) throw UnsafePathException("Archive entry has an empty name.")
        for (part in parts) {
            if (part == "." || part == "..") throw UnsafePathException("Archive entry \"${printable(entryName)}\" climbs out of its folder.")
            if (part.any { it.isISOControl() } ||
                (portable && (part.any { it in forbidden } || windowsReserved.matches(part) || part.endsWith(".") || part.endsWith(" ")))
            ) {
                throw UnsafePathException("Archive entry \"${printable(entryName)}\" has an unsafe name.")
            }
        }
        val target = parts.fold(normalizedRoot) { acc, p -> acc.resolve(p) }.normalize()
        if (!target.startsWith(normalizedRoot) || target == normalizedRoot) {
            throw UnsafePathException("Archive entry \"${printable(entryName)}\" climbs out of its folder.")
        }
        return target
    }

    private fun printable(s: String) = s.take(80).map { if (it.isISOControl()) '?' else it }.joinToString("")
}
