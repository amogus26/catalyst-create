package catalyst.mods.net

import catalyst.mods.IntegrityException
import catalyst.mods.NetworkException
import catalyst.mods.UnsafeUrlException
import java.io.IOException
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardOpenOption
import java.security.MessageDigest
import java.time.Duration

class Request(
    val method: String,
    val uri: URI,
    val headers: Map<String, String> = emptyMap(),
    val body: ByteArray? = null,
)

class Response(val status: Int, headers: Map<String, List<String>>, val body: ByteArray) {
    private val lower = headers.mapKeys { it.key.lowercase() }
    fun header(name: String): String? = lower[name.lowercase()]?.firstOrNull()
}

/** What a finished download produced: the bytes are on disk at the target, hashed while they streamed. */
class Downloaded(val size: Long, val sha1: String, val sha512: String)

/**
 * The launcher's only way onto the network. One interface so tests can serve canned responses and so the
 * rules - HTTPS only, allow-listed hosts, bounded sizes, no automatic redirects - live in one place.
 */
interface Transport {
    /** For API calls. The body is read into memory, so it is capped at [maxBytes]. */
    fun send(request: Request, maxBytes: Long = 16L * 1024 * 1024): Response

    /** Streams a file to [target], hashing as it goes. Fails (and deletes the partial file) past [maxBytes]. */
    fun download(uri: URI, headers: Map<String, String>, target: Path, maxBytes: Long): Downloaded
}

/**
 * Which URLs the launcher will fetch. API responses name download and image URLs; a hostile or broken
 * response could point anywhere, including `file:`, `http:` or an internal address, so every URL -
 * including each redirect hop - is checked against this before any connection is made.
 */
class UrlPolicy(private val allowedHosts: Set<String>) {
    fun check(raw: String): URI {
        val uri = try {
            URI(raw)
        } catch (e: Exception) {
            throw UnsafeUrlException("A download address from the mod service was malformed.")
        }
        return check(uri)
    }

    fun check(uri: URI): URI {
        if (!uri.scheme.equals("https", ignoreCase = true)) {
            throw UnsafeUrlException("Refusing a non-HTTPS address from the mod service.")
        }
        if (uri.rawUserInfo != null) throw UnsafeUrlException("Refusing an address with embedded credentials.")
        if (uri.port != -1 && uri.port != 443) throw UnsafeUrlException("Refusing an address on an unusual port.")
        val host = uri.host?.lowercase()?.trimEnd('.') ?: throw UnsafeUrlException("Refusing an address with no host.")
        if (allowedHosts.none { host == it || host.endsWith(".$it") }) {
            throw UnsafeUrlException("Refusing to download from $host - it is not a Modrinth or CurseForge address.")
        }
        return uri
    }

    fun allows(raw: String?): Boolean = raw != null && runCatching { check(raw) }.isSuccess

    companion object {
        /** Modrinth's API and CDN. */
        val MODRINTH = setOf("api.modrinth.com", "cdn.modrinth.com")

        /** CurseForge images. Files come through our backend, never straight from the CDN (see docs). */
        val CURSEFORGE_MEDIA = setOf("media.forgecdn.net")
    }
}

/**
 * The real transport, on the JDK's HTTP client. TLS verification is the JDK default (system trust store,
 * hostname checks) and is never turned off. Redirects are followed by hand so each hop passes [policy].
 */
class JdkTransport(
    private val policy: UrlPolicy,
    private val userAgent: String,
    connectTimeout: Duration = Duration.ofSeconds(10),
    private val requestTimeout: Duration = Duration.ofSeconds(30),
    private val downloadTimeout: Duration = Duration.ofMinutes(5),
) : Transport {
    private val client = HttpClient.newBuilder()
        .connectTimeout(connectTimeout)
        .followRedirects(HttpClient.Redirect.NEVER)
        .version(HttpClient.Version.HTTP_2)
        .build()

    override fun send(request: Request, maxBytes: Long): Response {
        var uri = policy.check(request.uri)
        repeat(MAX_REDIRECTS + 1) {
            val builder = HttpRequest.newBuilder(uri).timeout(requestTimeout).header("User-Agent", userAgent)
            request.headers.forEach { (k, v) -> builder.header(k, v) }
            val publisher = request.body?.let { HttpRequest.BodyPublishers.ofByteArray(it) }
                ?: HttpRequest.BodyPublishers.noBody()
            builder.method(request.method, publisher)
            val response = call { client.send(builder.build(), HttpResponse.BodyHandlers.ofInputStream()) }
            if (response.statusCode() in 300..399 && response.statusCode() != 304) {
                response.body().close()
                uri = policy.check(uri.resolve(location(response)))
                return@repeat
            }
            val bytes = response.body().use { input ->
                val out = java.io.ByteArrayOutputStream()
                val buffer = ByteArray(64 * 1024)
                var total = 0L
                while (true) {
                    val n = call { input.read(buffer) }
                    if (n < 0) break
                    total += n
                    if (total > maxBytes) throw NetworkException("The mod service sent a response that was far too large.")
                    out.write(buffer, 0, n)
                }
                out.toByteArray()
            }
            return Response(response.statusCode(), response.headers().map(), bytes)
        }
        throw NetworkException("The mod service redirected too many times.")
    }

    override fun download(uri: URI, headers: Map<String, String>, target: Path, maxBytes: Long): Downloaded {
        var current = policy.check(uri)
        repeat(MAX_REDIRECTS + 1) {
            val builder = HttpRequest.newBuilder(current).timeout(downloadTimeout).header("User-Agent", userAgent).GET()
            headers.forEach { (k, v) -> builder.header(k, v) }
            val response = call { client.send(builder.build(), HttpResponse.BodyHandlers.ofInputStream()) }
            when (response.statusCode()) {
                in 200..299 -> return response.body().use { streamToFile(it, target, maxBytes) }
                in 300..399 -> {
                    response.body().close()
                    current = policy.check(current.resolve(location(response)))
                }
                else -> {
                    response.body().close()
                    throw DownloadStatusException(response.statusCode(), response.headers().firstValue("Retry-After").orElse(null))
                }
            }
        }
        throw NetworkException("The download redirected too many times.")
    }

    private fun location(response: HttpResponse<*>): String =
        response.headers().firstValue("Location").orElseThrow { NetworkException("A redirect had nowhere to go.") }

    private inline fun <T> call(block: () -> T): T = try {
        block()
    } catch (e: IOException) {
        throw NetworkException("Could not reach the mod service. Check your internet connection.", e)
    } catch (e: InterruptedException) {
        Thread.currentThread().interrupt()
        throw NetworkException("The request was cancelled.", e)
    }

    private companion object {
        const val MAX_REDIRECTS = 5
    }
}

/** A download answered with a non-success status; [ApiClient] turns it into the right exception. */
class DownloadStatusException(val status: Int, val retryAfter: String?) : IOException("HTTP $status")

/**
 * Writes a stream to a new file while hashing it. The file is created fresh (never follows or overwrites
 * an existing path), and is deleted again if the stream is too long or fails partway.
 */
fun streamToFile(input: java.io.InputStream, target: Path, maxBytes: Long): Downloaded {
    val sha1 = MessageDigest.getInstance("SHA-1")
    val sha512 = MessageDigest.getInstance("SHA-512")
    var total = 0L
    try {
        Files.newOutputStream(target, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE).use { out ->
            val buffer = ByteArray(64 * 1024)
            while (true) {
                val n = try {
                    input.read(buffer)
                } catch (e: IOException) {
                    throw NetworkException("The download was interrupted. Check your internet connection.", e)
                }
                if (n < 0) break
                total += n
                if (total > maxBytes) throw IntegrityException("The download was larger than the mod service said it would be.")
                sha1.update(buffer, 0, n)
                sha512.update(buffer, 0, n)
                out.write(buffer, 0, n)
            }
        }
    } catch (e: Throwable) {
        Files.deleteIfExists(target)
        throw e
    }
    return Downloaded(total, sha1.digest().toHex(), sha512.digest().toHex())
}

fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it) }
