package catalyst.mods

/**
 * Every failure the mod browser can report. Each one carries a sentence a player can read; the UI shows
 * [message] and never a stack trace or a raw API body.
 */
sealed class ModsException(message: String, cause: Throwable? = null) : Exception(message, cause)

/** No connection, DNS failure, timeout, TLS failure. */
class NetworkException(message: String, cause: Throwable? = null) : ModsException(message, cause)

/** The platform said slow down (HTTP 429, or our own budget ran out). */
class RateLimitedException(val retryAfterSeconds: Long, platform: String) :
    ModsException("$platform is busy right now. Try again in ${retryAfterSeconds.coerceAtLeast(1)} seconds.")

/** The response was not what the documented API returns - malformed JSON, missing fields, absurd values. */
class BadResponseException(message: String) : ModsException("The mod service sent something unexpected: $message")

class NotFoundException(what: String) : ModsException("$what could not be found. It may have been removed.")

/** HTTP 410: the API version we speak has been retired. Only a launcher update fixes this. */
class ApiRetiredException(platform: String) :
    ModsException("This launcher's $platform support is out of date. Update the launcher to keep browsing mods.")

/** A source that is switched off - CurseForge before the backend has an API key, or with the backend down. */
class SourceUnavailableException(val platform: Platform, reason: String) : ModsException(reason)

/** A downloaded file failed verification: wrong size, wrong hash, not a jar, or a hostile archive. */
class IntegrityException(message: String) : ModsException(message)

/** A file name or path from an API would land outside the instance, or is not a name we will write. */
class UnsafePathException(message: String) : ModsException(message)

/** A URL from an API is not HTTPS or not on a host we download from. */
class UnsafeUrlException(message: String) : ModsException(message)

/** Installing, updating or removing could not go ahead; the instance was left as it was. */
class InstallException(message: String, cause: Throwable? = null) : ModsException(message, cause)
