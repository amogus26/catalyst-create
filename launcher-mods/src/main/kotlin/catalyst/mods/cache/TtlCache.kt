package catalyst.mods.cache

import catalyst.mods.net.Ticker
import catalyst.mods.net.toHex
import java.nio.ByteBuffer
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.time.Duration

/**
 * API responses kept for a while so browsing does not re-ask the same question.
 *
 * Memory first (a bounded LRU), then optionally disk so a relaunch still has icons and project pages.
 * Every entry has an expiry: [fresh] only returns unexpired entries, so version lists refresh on their
 * own; [stale] is the offline fallback. Disk entries are named by a hash of the key, so nothing from an
 * API response ever becomes part of a path.
 */
class TtlCache(
    private val dir: Path? = null,
    private val maxEntries: Int = 512,
    private val ticker: Ticker = Ticker.System,
    /** How long past expiry an entry may still be served when offline. */
    private val staleFor: Duration = Duration.ofDays(7),
) {
    private class Entry(val bytes: ByteArray, val expiresAt: Long)

    private val memory = object : LinkedHashMap<String, Entry>(64, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Entry>) = size > maxEntries
    }

    init {
        dir?.let { Files.createDirectories(it) }
    }

    @Synchronized
    fun fresh(key: String): ByteArray? = load(key)?.takeIf { it.expiresAt > ticker.nowMillis() }?.bytes

    @Synchronized
    fun stale(key: String): ByteArray? = load(key)?.takeIf { it.expiresAt + staleFor.toMillis() > ticker.nowMillis() }?.bytes

    @Synchronized
    fun put(key: String, bytes: ByteArray, ttl: Duration) {
        val entry = Entry(bytes, ticker.nowMillis() + ttl.toMillis())
        memory[key] = entry
        dir?.let { d ->
            runCatching {
                val file = d.resolve(name(key))
                val tmp = Files.createTempFile(d, "c", ".tmp")
                Files.write(tmp, ByteBuffer.allocate(8).putLong(entry.expiresAt).array() + bytes)
                Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
            }
        }
    }

    @Synchronized
    fun invalidate(prefix: String) {
        memory.keys.removeIf { it.startsWith(prefix) }
    }

    @Synchronized
    fun clear() {
        memory.clear()
        dir?.let { d -> Files.list(d).use { s -> s.forEach { runCatching { Files.delete(it) } } } }
    }

    private fun load(key: String): Entry? {
        memory[key]?.let { return it }
        val d = dir ?: return null
        val file = d.resolve(name(key))
        if (!Files.isRegularFile(file)) return null
        return runCatching {
            val raw = Files.readAllBytes(file)
            if (raw.size < 8) return null
            Entry(raw.copyOfRange(8, raw.size), ByteBuffer.wrap(raw, 0, 8).long).also { memory[key] = it }
        }.getOrNull()
    }

    private fun name(key: String) =
        MessageDigest.getInstance("SHA-256").digest(key.toByteArray(Charsets.UTF_8)).toHex() + ".bin"

    companion object {
        /** How long each kind of answer is trusted before asking again. */
        val SEARCH: Duration = Duration.ofMinutes(5)
        val PROJECT: Duration = Duration.ofMinutes(30)
        val VERSIONS: Duration = Duration.ofMinutes(10)
        val TAGS: Duration = Duration.ofHours(24)
        val ICON: Duration = Duration.ofDays(7)

        /** Update checks must be current: never served from cache. */
        val NONE: Duration = Duration.ZERO
    }
}
