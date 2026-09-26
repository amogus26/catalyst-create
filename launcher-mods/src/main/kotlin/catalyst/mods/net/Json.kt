package catalyst.mods.net

import catalyst.mods.BadResponseException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.longOrNull
import java.time.Instant
import java.time.format.DateTimeParseException

/**
 * Reading API responses as untrusted input.
 *
 * Nothing is deserialized straight into a model: each field is taken out by hand, type-checked, and
 * clipped to a sane length, so a response with a 50 MB "description", a number where a string belongs or
 * a missing id is rejected (or trimmed) here instead of flowing into the UI or a file path.
 */
internal object Untrusted {
    private val parser = Json { isLenient = false; ignoreUnknownKeys = true }

    const val MAX_SHORT = 256
    const val MAX_TEXT = 4_000
    const val MAX_BODY = 100_000
    const val MAX_LIST = 2_000

    fun parse(bytes: ByteArray): JsonElement = try {
        parser.parseToJsonElement(bytes.toString(Charsets.UTF_8))
    } catch (e: Exception) {
        throw BadResponseException("the response was not valid JSON")
    }

    fun obj(e: JsonElement?, what: String): JsonObject =
        e as? JsonObject ?: throw BadResponseException("expected $what to be an object")

    fun arr(e: JsonElement?, what: String): JsonArray =
        (e as? JsonArray ?: throw BadResponseException("expected $what to be a list")).also {
            if (it.size > MAX_LIST) throw BadResponseException("$what is implausibly long")
        }
}

internal fun JsonObject.str(key: String, max: Int = Untrusted.MAX_SHORT): String =
    strOrNull(key, max) ?: throw BadResponseException("missing '$key'")

internal fun JsonObject.strOrNull(key: String, max: Int = Untrusted.MAX_SHORT): String? {
    val e = this[key] ?: return null
    if (e is JsonNull) return null
    val p = e as? JsonPrimitive ?: throw BadResponseException("'$key' is not text")
    if (!p.isString) throw BadResponseException("'$key' is not text")
    return p.content.let { if (it.length > max) it.take(max) else it }.stripControl()
}

internal fun JsonObject.long(key: String): Long =
    longOrNull(key) ?: throw BadResponseException("missing number '$key'")

internal fun JsonObject.longOrNull(key: String): Long? {
    val e = this[key] ?: return null
    if (e is JsonNull) return null
    val p = e as? JsonPrimitive ?: throw BadResponseException("'$key' is not a number")
    if (p.isString) throw BadResponseException("'$key' is not a number")
    return p.longOrNull ?: throw BadResponseException("'$key' is not a whole number")
}

internal fun JsonObject.boolOrNull(key: String): Boolean? {
    val e = this[key] ?: return null
    if (e is JsonNull) return null
    val p = e as? JsonPrimitive ?: throw BadResponseException("'$key' is not true/false")
    return p.booleanOrNull ?: throw BadResponseException("'$key' is not true/false")
}

internal fun JsonObject.strings(key: String, max: Int = Untrusted.MAX_SHORT): List<String> {
    val e = this[key] ?: return emptyList()
    if (e is JsonNull) return emptyList()
    return Untrusted.arr(e, key).mapNotNull { (it as? JsonPrimitive)?.takeIf { p -> p.isString }?.contentOrNull }
        .map { (if (it.length > max) it.take(max) else it).stripControl() }
}

internal fun JsonObject.objects(key: String): List<JsonObject> {
    val e = this[key] ?: return emptyList()
    if (e is JsonNull) return emptyList()
    return Untrusted.arr(e, key).map { Untrusted.obj(it, key) }
}

internal fun JsonObject.instantOrNull(key: String): Instant? = strOrNull(key)?.let {
    try {
        Instant.parse(it)
    } catch (_: DateTimeParseException) {
        null
    }
}

/** Control characters (other than newline/tab) have no business in a mod name or description. */
internal fun String.stripControl(): String =
    if (none { it.isISOControl() && it != '\n' && it != '\t' }) this
    else filterNot { it.isISOControl() && it != '\n' && it != '\t' }

/** Hex digests from APIs, lower-cased; anything that is not hex of the right length is dropped. */
internal fun hexOrNull(value: String?, length: Int): String? =
    value?.lowercase()?.takeIf { it.length == length && it.all { c -> c in '0'..'9' || c in 'a'..'f' } }
