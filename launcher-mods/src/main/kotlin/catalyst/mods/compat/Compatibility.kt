package catalyst.mods.compat

import catalyst.mods.Loader
import catalyst.mods.ModVersion
import catalyst.mods.instance.Instance

/** What the UI suggests when a mod cannot go into the chosen profile. */
sealed interface SuggestedAction {
    data class CreateProfile(val gameVersion: String, val loader: Loader) : SuggestedAction {
        val label get() = "Create ${loader.label} Profile"
    }
    data class PickAnotherVersion(val reason: String) : SuggestedAction
    data class OpenProjectPage(val url: String) : SuggestedAction
}

sealed interface Compatibility {
    data object Compatible : Compatibility

    /** Will probably work, with a caveat the player should see (e.g. a Fabric mod on Quilt). */
    data class CompatibleWithWarning(val warning: String) : Compatibility

    data class Incompatible(val reason: String, val action: SuggestedAction?) : Compatibility

    val installable: Boolean get() = this !is Incompatible
}

/**
 * Whether a mod version belongs in an instance. The platform's metadata says which Minecraft versions
 * and loaders a version supports; the instance says what it runs. Anything short of an exact Minecraft
 * version match and a supported loader is refused - a mod built for 1.21.1 is not assumed to work on
 * 1.21.8.
 */
object CompatibilityChecker {
    fun check(instance: Instance, version: ModVersion, modName: String): Compatibility {
        val loader = instance.loader
            ?: return Compatibility.Incompatible(
                "\"${instance.name}\" is a vanilla profile. Mods need a mod loader.",
                version.loaders.preferredLoader()?.let { SuggestedAction.CreateProfile(instance.gameVersion, it) },
            )

        val loaderOk = loaderSupport(loader, version.loaders)
        val gameOk = instance.gameVersion in version.gameVersions

        if (loaderOk == null) {
            val needs = version.loaders.preferredLoader()
            return Compatibility.Incompatible(
                "Your profile uses ${loader.label}, but this version of $modName requires " +
                    (version.loaders.takeIf { it.isNotEmpty() }?.joinToString(" or ") { it.label } ?: "a loader this launcher does not support") + ".",
                needs?.let { SuggestedAction.CreateProfile(version.gameVersions.bestMatch(instance.gameVersion), it) },
            )
        }
        if (!gameOk) {
            return Compatibility.Incompatible(
                "This version of $modName is for Minecraft ${summarize(version.gameVersions)}, " +
                    "but \"${instance.name}\" runs ${instance.gameVersion}.",
                SuggestedAction.PickAnotherVersion("Look for a version made for Minecraft ${instance.gameVersion}."),
            )
        }
        return loaderOk
    }

    /** Null when [versionLoaders] cannot run on [profile]. */
    fun loaderSupport(profile: Loader, versionLoaders: Set<Loader>): Compatibility? = when {
        profile in versionLoaders -> Compatibility.Compatible
        // Quilt loads most Fabric mods; it is not guaranteed, so the player is told.
        profile == Loader.QUILT && Loader.FABRIC in versionLoaders ->
            Compatibility.CompatibleWithWarning("This is a Fabric mod. Quilt runs most Fabric mods, but not all.")
        else -> null
    }

    /** Loaders to ask the API for when listing versions for [profile]. */
    fun queryLoaders(profile: Loader): List<Loader> =
        if (profile == Loader.QUILT) listOf(Loader.QUILT, Loader.FABRIC) else listOf(profile)

    /** "1.21.x" for a run of 1.21 releases, the version itself for one, a short list otherwise. */
    fun summarize(gameVersions: List<String>): String {
        val releases = gameVersions.filter { RELEASE.matches(it) }
        if (releases.isEmpty()) return gameVersions.take(3).joinToString(", ").ifEmpty { "unknown versions" }
        val groups = releases.groupBy { it.split('.').take(2).joinToString(".") }
        return groups.entries.sortedByDescending { versionKey(it.key) }.take(3).joinToString(", ") { (minor, list) ->
            if (list.size == 1) list.first() else "$minor.x"
        }
    }

    /** Newest first, for sorting "1.21.10" after "1.21.9". */
    fun versionKey(v: String): Long = v.split('.', '-').take(3).fold(0L) { acc, part ->
        acc * 1000 + (part.takeWhile { it.isDigit() }.toLongOrNull() ?: 0).coerceAtMost(999)
    }.let { k -> if (v.count { it == '.' } < 2) k * 1000 else k }

    private val RELEASE = Regex("^\\d+\\.\\d+(\\.\\d+)?$")

    private fun Set<Loader>.preferredLoader(): Loader? =
        listOf(Loader.FABRIC, Loader.NEOFORGE, Loader.FORGE, Loader.QUILT).firstOrNull { it in this }

    private fun List<String>.bestMatch(wanted: String): String =
        if (wanted in this) wanted else filter { RELEASE.matches(it) }.maxByOrNull(::versionKey) ?: wanted
}
