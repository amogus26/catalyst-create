package catalyst.mods.net

import catalyst.mods.ApiRetiredException
import catalyst.mods.BadResponseException
import catalyst.mods.ModsException
import catalyst.mods.NetworkException
import catalyst.mods.NotFoundException
import catalyst.mods.RateLimitedException
import catalyst.mods.cache.TtlCache
import kotlinx.serialization.json.JsonElement
import java.net.URI
import java.time.Duration

/** Time, injectable so rate-limit and cache tests do not sleep. */
interface Ticker {
    fun nowMillis(): Long
    fun sleep(millis: Long)

    object System : Ticker {
        override fun nowMillis() = java.lang.System.currentTimeMillis()
        override fun sleep(millis: Long) = Thread.sleep(millis)
    }
}

/**
 * Keeps one platform's request rate inside its published limit.
 *
 * Two things are tracked: our own sliding one-minute window (so the launcher never *reaches* the limit
 * in normal use), and what the server tells us - `X-Ratelimit-Remaining`/`X-Ratelimit-Reset` on Modrinth,
 * `Retry-After` on a 429 from anyone. A short wait is absorbed; a long one is reported to the player
 * rather than freezing the UI.
 */
class RateBudget(
    private val platform: String,
    private val perMinute: Int,
    private val ticker: Ticker = Ticker.System,
    private val maxWaitMillis: Long = 5_000,
) {
    private val sent = ArrayDeque<Long>()
    private var blockedUntil = 0L

    @Synchronized
    fun acquire() {
        var now = ticker.nowMillis()
        if (blockedUntil > now) {
            val wait = blockedUntil - now
            if (wait > maxWaitMillis) throw RateLimitedException((wait + 999) / 1000, platform)
            ticker.sleep(wait)
            now = ticker.nowMillis()
        }
        while (sent.isNotEmpty() && sent.first() <= now - WINDOW) sent.removeFirst()
        if (sent.size >= perMinute) {
            val wait = sent.first() + WINDOW - now
            if (wait > maxWaitMillis) throw RateLimitedException((wait + 999) / 1000, platform)
            ticker.sleep(wait)
            now = ticker.nowMillis()
            while (sent.isNotEmpty() && sent.first() <= now - WINDOW) sent.removeFirst()
        }
        sent.addLast(now)
    }

    @Synchronized
    fun observe(response: Response) {
        val now = ticker.nowMillis()
        if (response.status == 429) {
            val seconds = response.header("Retry-After")?.trim()?.toLongOrNull()
                ?: response.header("X-Ratelimit-Reset")?.trim()?.toLongOrNull()
                ?: 60
            blockedUntil = maxOf(blockedUntil, now + seconds.coerceIn(1, 3600) * 1000)
            return
        }
        val remaining = response.header("X-Ratelimit-Remaining")?.trim()?.toLongOrNull()
        val reset = response.header("X-Ratelimit-Reset")?.trim()?.toLongOrNull()
        if (remaining != null && remaining <= 0 && reset != null) {
            blockedUntil = maxOf(blockedUntil, now + reset.coerceIn(0, 3600) * 1000)
        }
    }

    @Synchronized
    fun secondsBlocked(): Long = ((blockedUntil - ticker.nowMillis()).coerceAtLeast(0) + 999) / 1000

    private companion object {
        const val WINDOW = 60_000L
    }
}

/**
 * JSON over HTTPS for one platform: rate budget, a couple of retries for transient failures, a response
 * cache, and HTTP status mapped to exceptions a player can read.
 */
class ApiClient(
    val platform: String,
    private val baseUri: URI,
    private val transport: Transport,
    private val budget: RateBudget,
    private val cache: TtlCache,
    private val ticker: Ticker = Ticker.System,
    private val extraHeaders: Map<String, String> = emptyMap(),
    /** Platform-specific statuses (e.g. our backend's 503 "not configured"); return null to use the defaults. */
    private val mapError: (Response) -> ModsException? = { null },
) {
    fun get(path: String, query: List<Pair<String, String>> = emptyList(), ttl: Duration, what: String): JsonElement =
        fetch(Request("GET", uri(path, query), accept()), ttl, what)

    fun post(path: String, body: JsonElement, ttl: Duration, what: String): JsonElement {
        val bytes = body.toString().toByteArray(Charsets.UTF_8)
        return fetch(Request("POST", uri(path, emptyList()), accept() + ("Content-Type" to "application/json"), bytes), ttl, what)
    }

    fun uri(path: String, query: List<Pair<String, String>>): URI {
        val q = query.joinToString("&") { (k, v) -> "${encode(k)}=${encode(v)}" }
        val base = baseUri.toString().trimEnd('/')
        return URI(base + path + if (q.isEmpty()) "" else "?$q")
    }

    private fun accept() = extraHeaders + ("Accept" to "application/json")

    private fun fetch(request: Request, ttl: Duration, what: String): JsonElement {
        val key = request.method + " " + request.uri + (request.body?.let { " " + sha256(it) } ?: "")
        cache.fresh(key)?.let { return Untrusted.parse(it) }
        return try {
            val bytes = sendWithRetry(request, what)
            val parsed = Untrusted.parse(bytes)
            cache.put(key, bytes, ttl)
            parsed
        } catch (e: NetworkException) {
            // Offline: an expired copy is better than nothing for browsing. Installs re-verify every
            // file by hash, so a stale version list can never put the wrong bytes on disk.
            cache.stale(key)?.let { Untrusted.parse(it) } ?: throw e
        }
    }

    private fun sendWithRetry(request: Request, what: String): ByteArray {
        var attempt = 0
        while (true) {
            attempt++
            budget.acquire()
            val response = try {
                transport.send(request)
            } catch (e: NetworkException) {
                if (attempt > MAX_RETRIES) throw e
                ticker.sleep(backoff(attempt))
                continue
            }
            budget.observe(response)
            when (response.status) {
                in 200..299 -> return response.body
                429 -> {
                    // One retry if the server's wait is short; otherwise tell the player how long.
                    if (attempt > 1 || budget.secondsBlocked() > 5) {
                        throw RateLimitedException(budget.secondsBlocked().coerceAtLeast(1), platform)
                    }
                    continue
                }
                500, 502, 503, 504 -> {
                    mapError(response)?.let { throw it }
                    if (attempt > MAX_RETRIES) throw NetworkException("$platform is having problems right now. Try again shortly.")
                    ticker.sleep(backoff(attempt))
                }
                else -> {
                    mapError(response)?.let { throw it }
                    throw when (response.status) {
                        404 -> NotFoundException(what)
                        410 -> ApiRetiredException(platform)
                        else -> BadResponseException("$platform answered HTTP ${response.status}")
                    }
                }
            }
        }
    }

    private fun backoff(attempt: Int): Long = 400L * (1L shl (attempt - 1).coerceAtMost(4))

    private companion object {
        const val MAX_RETRIES = 2

        fun encode(s: String): String = java.net.URLEncoder.encode(s, Charsets.UTF_8).replace("+", "%20")

        fun sha256(b: ByteArray) = java.security.MessageDigest.getInstance("SHA-256").digest(b).toHex()
    }
}
